"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ColumnInfo } from "@/src/lib/admin-db";
import type { AdminResource } from "@/src/lib/admin-config";

type Props = {
  resource: AdminResource;
  columns: ColumnInfo[];
  primaryKey: string;
  rows: Record<string, unknown>[];
};

function display(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function inputType(dataType: string) {
  if (["integer", "bigint", "smallint", "numeric", "double precision", "real"].includes(dataType)) {
    return "number";
  }
  if (dataType === "boolean") return "checkbox";
  if (dataType.includes("date")) return "date";
  return "text";
}

export default function AdminResourceClient({ resource, columns, primaryKey, rows }: Props) {
  const [items, setItems] = useState(rows);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editable = useMemo(
    () => columns.filter((column) => !column.isGenerated && !column.isIdentity),
    [columns]
  );
  const visibleColumns = useMemo(
    () => columns.filter((column) => items.some((item) => item[column.name] != null)).slice(0, 10),
    [columns, items]
  );

  async function refresh() {
    const response = await fetch(`/api/admin/${resource.key}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Refresh failed");
    setItems(data.rows ?? []);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(
        editable.map((column) => {
          if (column.dataType === "boolean") {
            return [column.name, formData.has(column.name)];
          }
          return [column.name, formData.get(column.name)];
        })
      );
      const id = editing?.[primaryKey];
      const response = await fetch(
        id == null ? `/api/admin/${resource.key}` : `/api/admin/${resource.key}/${id}`,
        {
          method: id == null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Save failed");
      await refresh();
      setEditing(null);
      setMessage("Saved successfully.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Record<string, unknown>) {
    const id = row[primaryKey];
    if (id == null) return;
    const ok = window.confirm(
      "Confirm this delete/deactivate action. Linked data may cause the database to block hard deletes."
    );
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/${resource.key}/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Delete failed");
      await refresh();
      setMessage(`Action complete: ${data.mode ?? "deleted"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {editing ? "Edit Row" : "Add Row"}
            </h2>
            <p className="text-sm text-slate-600">
              Fields are read from the current Neon table schema.
            </p>
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {editable.map((column) => {
            const type = inputType(column.dataType);
            const value = editing?.[column.name];
            return (
              <label key={column.name} className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">
                  {column.name}
                  {!column.nullable && !column.hasDefault && (
                    <span className="text-rose-600"> *</span>
                  )}
                </span>
                {type === "checkbox" ? (
                  <input
                    name={column.name}
                    type="checkbox"
                    defaultChecked={Boolean(value)}
                    className="h-5 w-5 rounded border-slate-300"
                  />
                ) : (
                  <input
                    name={column.name}
                    type={type}
                    step={type === "number" ? "any" : undefined}
                    defaultValue={display(value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
                  />
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={busy}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Saving..." : editing ? "Update" : "Create"}
          </button>
          {message && <p className="text-sm text-slate-700">{message}</p>}
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              {visibleColumns.map((column) => (
                <th key={column.name} className="px-3 py-3 font-semibold">
                  {column.name}
                </th>
              ))}
              <th className="px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((row, index) => (
              <tr key={display(row[primaryKey]) || index} className="align-top">
                {visibleColumns.map((column) => (
                  <td key={column.name} className="max-w-[260px] truncate px-3 py-3 text-slate-800">
                    {display(row[column.name])}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="mr-2 rounded-md border border-slate-300 px-3 py-1.5 text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    className="rounded-md border border-rose-200 px-3 py-1.5 text-rose-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-slate-600" colSpan={visibleColumns.length + 1}>
                  No rows found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
