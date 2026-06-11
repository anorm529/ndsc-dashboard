import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var ndscPgPool: Pool | undefined;
}

export function getPool() {
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL env var");
  }

  globalThis.ndscPgPool ??= new Pool({
    connectionString,
    max: 5,
    ssl: connectionString.includes("sslmode=require")
      ? undefined
      : { rejectUnauthorized: false },
  });

  return globalThis.ndscPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  return getPool().query<T>(text, values);
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function ident(name: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
  return `"${name.replaceAll('"', '""')}"`;
}
