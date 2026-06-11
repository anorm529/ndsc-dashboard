import "server-only";

import type { PoolClient, QueryResultRow } from "pg";
import { z } from "zod";
import { adminResources, getResource, tableViews } from "./admin-config";
import { ident, query, transaction } from "./db";

export type ColumnInfo = {
  name: string;
  dataType: string;
  nullable: boolean;
  hasDefault: boolean;
  isIdentity: boolean;
  isGenerated: boolean;
};

const payloadSchema = z.record(z.string(), z.unknown());

export function normalizeValue(value: unknown, column?: ColumnInfo) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    if (column?.name === "longitude" || column?.name === "latitude") {
      return Number(trimmed.replace(/[']/g, ""));
    }
    if (["integer", "bigint", "smallint", "numeric", "double precision", "real"].includes(column?.dataType ?? "")) {
      const cleaned = trimmed.replace(/[,'"]/g, "");
      const number = Number(cleaned);
      return Number.isFinite(number) ? number : trimmed;
    }
    if (column?.dataType === "boolean") {
      return ["true", "1", "yes", "on", "active"].includes(trimmed.toLowerCase());
    }
    if (column?.dataType === "json" || column?.dataType === "jsonb") {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  return value;
}

export async function listTablesAndViews() {
  const names = [...adminResources.map((resource) => resource.table), ...tableViews];
  const result = await query<{
    table_name: string;
    table_type: string;
  }>(
    `
      select table_name, table_type
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name
    `,
    [names]
  );
  return result.rows;
}

export async function getColumns(table: string) {
  const result = await query<{
    column_name: string;
    data_type: string;
    is_nullable: "YES" | "NO";
    column_default: string | null;
    is_identity: "YES" | "NO";
    is_generated: "ALWAYS" | "NEVER";
  }>(
    `
      select column_name, data_type, is_nullable, column_default, is_identity, is_generated
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
    [table]
  );

  return result.rows.map((row) => ({
    name: row.column_name,
    dataType: row.data_type,
    nullable: row.is_nullable === "YES",
    hasDefault: row.column_default != null,
    isIdentity: row.is_identity === "YES",
    isGenerated: row.is_generated === "ALWAYS",
  }));
}

export async function getPrimaryKey(table: string) {
  const result = await query<{ column_name: string }>(
    `
      select kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
       and tc.table_name = kcu.table_name
      where tc.constraint_type = 'PRIMARY KEY'
        and tc.table_schema = 'public'
        and tc.table_name = $1
      order by kcu.ordinal_position
      limit 1
    `,
    [table]
  );
  return result.rows[0]?.column_name ?? "id";
}

export async function listRows(resourceKey: string, limit = 100) {
  const resource = getResource(resourceKey);
  if (!resource) throw new Error("Unknown admin resource");

  const columns = await getColumns(resource.table);
  const preferred = resource.preferredColumns?.filter((column) =>
    columns.some((info) => info.name === column)
  );
  const selectedColumns = preferred?.length
    ? preferred
    : columns.slice(0, 12).map((column) => column.name);
  const pk = await getPrimaryKey(resource.table);
  const orderColumn = columns.some((column) => column.name === pk)
    ? pk
    : selectedColumns[0];

  const result = await query(
    `
      select ${selectedColumns.map(ident).join(", ")}
      from ${ident(resource.table)}
      order by ${ident(orderColumn)} desc nulls last
      limit $1
    `,
    [limit]
  );

  return { resource, columns, primaryKey: pk, selectedColumns, rows: result.rows };
}

function editableColumns(columns: ColumnInfo[]) {
  return columns.filter((column) => !column.isIdentity && !column.isGenerated);
}

function valuesFromPayload(payload: Record<string, unknown>, columns: ColumnInfo[]) {
  const editable = editableColumns(columns);
  return editable
    .filter((column) => Object.prototype.hasOwnProperty.call(payload, column.name))
    .map((column) => ({
      column,
      value: normalizeValue(payload[column.name], column),
    }));
}

export async function createRow(resourceKey: string, body: unknown) {
  const resource = getResource(resourceKey);
  if (!resource) throw new Error("Unknown admin resource");
  const payload = payloadSchema.parse(body);
  const columns = await getColumns(resource.table);
  const entries = valuesFromPayload(payload, columns).filter(({ value }) => value !== undefined);
  if (entries.length === 0) throw new Error("No editable values provided");

  const names = entries.map(({ column }) => ident(column.name)).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
  const result = await query(
    `insert into ${ident(resource.table)} (${names}) values (${placeholders}) returning *`,
    entries.map(({ value }) => value)
  );
  return result.rows[0];
}

export async function updateRow(resourceKey: string, id: string, body: unknown) {
  const resource = getResource(resourceKey);
  if (!resource) throw new Error("Unknown admin resource");
  const payload = payloadSchema.parse(body);
  const columns = await getColumns(resource.table);
  const pk = await getPrimaryKey(resource.table);
  const entries = valuesFromPayload(payload, columns)
    .filter(({ column, value }) => column.name !== pk && value !== undefined);
  if (entries.length === 0) throw new Error("No editable values provided");

  const setSql = entries
    .map(({ column }, index) => `${ident(column.name)} = $${index + 1}`)
    .join(", ");
  const result = await query(
    `update ${ident(resource.table)} set ${setSql} where ${ident(pk)}::text = $${entries.length + 1} returning *`,
    [...entries.map(({ value }) => value), id]
  );
  if (!result.rows[0]) throw new Error("Row not found");
  return result.rows[0];
}

export async function deleteRow(resourceKey: string, id: string) {
  const resource = getResource(resourceKey);
  if (!resource) throw new Error("Unknown admin resource");
  const columns = await getColumns(resource.table);
  const pk = await getPrimaryKey(resource.table);
  const names = new Set(columns.map((column) => column.name));

  if (names.has("deleted_at")) {
    await query(
      `update ${ident(resource.table)} set deleted_at = now() where ${ident(pk)}::text = $1`,
      [id]
    );
    return { mode: "soft-delete" };
  }
  if (names.has("active")) {
    await query(
      `update ${ident(resource.table)} set active = false where ${ident(pk)}::text = $1`,
      [id]
    );
    return { mode: "deactivate" };
  }
  if (names.has("is_active")) {
    await query(
      `update ${ident(resource.table)} set is_active = false where ${ident(pk)}::text = $1`,
      [id]
    );
    return { mode: "deactivate" };
  }
  if (names.has("status")) {
    await query(
      `update ${ident(resource.table)} set status = 'archived' where ${ident(pk)}::text = $1`,
      [id]
    );
    return { mode: "archive" };
  }

  await query(`delete from ${ident(resource.table)} where ${ident(pk)}::text = $1`, [id]);
  return { mode: "delete" };
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);

  const [headers = [], ...body] = rows.filter((line) =>
    line.some((value) => value.trim() !== "")
  );
  const normalizedHeaders = headers.map((header) =>
    header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  );

  return body.map((line, index) => ({
    rowNumber: index + 2,
    data: Object.fromEntries(
      normalizedHeaders.map((header, headerIndex) => [header, line[headerIndex]?.trim() ?? ""])
    ),
  }));
}

export async function importCsv(
  resourceKey: string,
  csvText: string,
  fileName: string,
  importValidOnly = false
) {
  const resource = getResource(resourceKey);
  if (!resource) throw new Error("Unknown admin resource");
  if (!resource.upload) throw new Error("Uploads are not enabled for this resource");

  const columns = await getColumns(resource.table);
  const columnMap = new Map(columns.map((column) => [column.name, column]));
  const rows = parseCsv(csvText);
  const errors: { row: number; message: string; data: Record<string, string> }[] = [];
  let inserted = 0;

  await transaction(async (client: PoolClient) => {
    const batch = await client.query<{ id: unknown }>(
      `
        insert into upload_batches (source, file_name, status, total_rows, success_rows, failed_rows, created_at)
        values ($1, $2, $3, $4, $5, $6, now())
        returning id
      `,
      [resource.table, fileName, "processing", rows.length, 0, 0]
    ).catch(() => ({ rows: [] as { id: unknown }[] }));
    const batchId = batch.rows[0]?.id ?? null;

    for (const row of rows) {
      const entries = Object.entries(row.data)
        .filter(([key]) => columnMap.has(key))
        .map(([key, value]) => ({
          column: columnMap.get(key)!,
          value: normalizeValue(value, columnMap.get(key)),
        }));

      const missing = columns
        .filter((column) => !column.nullable && !column.hasDefault && !column.isIdentity && !column.isGenerated)
        .filter((column) => !entries.some((entry) => entry.column.name === column.name && entry.value != null));

      if (entries.length === 0 || missing.length > 0) {
        const message =
          entries.length === 0
            ? "No CSV headers matched table columns"
            : `Missing required columns: ${missing.map((column) => column.name).join(", ")}`;
        errors.push({ row: row.rowNumber, message, data: row.data });
        continue;
      }

      try {
        const names = entries.map(({ column }) => ident(column.name)).join(", ");
        const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
        await client.query(
          `insert into ${ident(resource.table)} (${names}) values (${placeholders})`,
          entries.map(({ value }) => value)
        );
        inserted += 1;
      } catch (error) {
        errors.push({
          row: row.rowNumber,
          message: error instanceof Error ? error.message : "Insert failed",
          data: row.data,
        });
      }
    }

    for (const error of errors) {
      await client.query(
        `
          insert into upload_errors (batch_id, row_number, error_message, raw_data, created_at)
          values ($1, $2, $3, $4::jsonb, now())
        `,
        [batchId, error.row, error.message, JSON.stringify(error.data)]
      ).catch(() => undefined);
    }

    if (batchId != null) {
      await client.query(
        `
          update upload_batches
          set status = $2, success_rows = $3, failed_rows = $4
          where id = $1
        `,
        [batchId, errors.length ? "completed_with_errors" : "completed", inserted, errors.length]
      ).catch(() => undefined);
    }

    if (errors.length > 0 && !importValidOnly) {
      throw new Error(
        `Import blocked: ${errors.length} row(s) failed validation. Enable "import valid rows only" to skip invalid rows.`
      );
    }
  });

  return { totalRows: rows.length, inserted, failed: errors.length, errors: errors.slice(0, 50) };
}

export async function runStatsAction(action: string, body: unknown) {
  const payload = payloadSchema.parse(body);
  const year = payload.year ? Number(payload.year) : null;
  const teamSlug = payload.teamSlug ? String(payload.teamSlug) : null;
  const archivedBy = payload.archivedBy ? String(payload.archivedBy) : "admin";

  if (action === "refresh-all") {
    await query("select refresh_player_season_stats()");
    return { ok: true };
  }
  if (action === "refresh-year") {
    if (!year) throw new Error("Year is required");
    await query("select refresh_player_season_stats($1)", [year]);
    return { ok: true };
  }
  if (action === "refresh-team") {
    if (!year || !teamSlug) throw new Error("Year and team slug are required");
    await query("select refresh_player_season_stats($1, $2)", [year, teamSlug]);
    return { ok: true };
  }
  if (action === "archive") {
    if (!year) throw new Error("Year is required");
    await query("select archive_player_season_stats($1, $2)", [year, archivedBy]);
    return { ok: true };
  }
  throw new Error("Unknown action");
}

function pick(row: QueryResultRow, names: string[]) {
  for (const name of names) {
    if (row[name] != null) return row[name];
  }
  return null;
}

async function readView(view: string, limit: number) {
  try {
    const result = await query(`select * from ${ident(view)} limit $1`, [limit]);
    return result.rows;
  } catch {
    return [];
  }
}

export async function dashboardFromNeon() {
  const calendar = await readView("v_ndsc_calendar", 200);
  const standings = await readView("v_league_standings", 100);
  const seasonStats =
    (await readView("v_player_season_stats", 200)).length > 0
      ? await readView("v_player_season_stats", 200)
      : await readView("v_player_season_totals", 200);
  const results = await readView("v_team_fixtures_results", 100);

  return {
    nextFixture: calendar.map((row) => ({
      Team: pick(row, ["team", "team_name", "ndsc_team"]),
      Opponent: pick(row, ["opponent", "opponent_name"]),
      date: pick(row, ["date", "game_date", "fixture_date", "starts_at"]),
      League: pick(row, ["league", "division", "competition"]),
      Venue: pick(row, ["venue", "location", "home_away"]),
      Notes: pick(row, ["notes", "note"]),
      Lat: pick(row, ["lat", "latitude"]),
      Lng: pick(row, ["lng", "longitude"]),
    })),
    leagueTable: standings.map((row) => ({
      position: pick(row, ["position", "pos"]),
      team: pick(row, ["team", "team_name"]),
      played: pick(row, ["played", "games_played", "p"]),
      wins: pick(row, ["wins", "w"]),
      losses: pick(row, ["losses", "l"]),
      points: pick(row, ["points", "pts"]),
    })),
    topHitters: seasonStats.map((row) => ({
      player: pick(row, ["player", "player_name", "name"]),
      team: pick(row, ["team", "team_name"]),
      avg: pick(row, ["avg", "batting_average"]),
      obp: pick(row, ["obp"]),
      slg: pick(row, ["slg"]),
      ops: pick(row, ["ops"]),
    })),
    recentResults: results.map((row) => ({
      Date: pick(row, ["date", "game_date", "fixture_date"]),
      Team: pick(row, ["team", "team_name"]),
      Opponent: pick(row, ["opponent", "opponent_name"]),
      Result: pick(row, ["result", "outcome", "status"]),
      Runs_For: pick(row, ["runs_for", "runs_scored"]),
      Runs_Against: pick(row, ["runs_against", "runs_allowed"]),
    })),
    homeRunLeaders: seasonStats.map((row) => ({
      player: pick(row, ["player", "player_name", "name"]),
      team: pick(row, ["team", "team_name"]),
      Home_Runs: pick(row, ["home_runs", "hr", "hrs"]),
    })),
  };
}
