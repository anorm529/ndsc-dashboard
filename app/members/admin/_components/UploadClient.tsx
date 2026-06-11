"use client";

import { useState, type FormEvent } from "react";
import { adminResources } from "@/src/lib/admin-config";

const uploadResources = adminResources.filter((resource) => resource.upload);

export default function UploadClient() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [busy, setBusy] = useState(false);

  async function previewFile(file?: File) {
    if (!file) {
      setPreview([]);
      return;
    }
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 8)
      .map((line) => line.split(",").map((cell) => cell.trim()));
    setPreview(rows);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const data = await response.json();
      setResult(response.ok ? data : { error: data.error ?? "Upload failed" });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">CSV Upload</h2>
      <p className="mt-1 text-sm text-slate-600">
        Uploads validate headers against the live table columns and log batches/errors when those tables exist.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
        <label className="block text-sm font-medium text-slate-700">
          Destination
          <select name="resource" className="mt-1 block rounded-md border border-slate-300 px-3 py-2">
            {uploadResources.map((resource) => (
              <option key={resource.key} value={resource.key}>
                {resource.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          CSV file
          <input
            required
            type="file"
            name="file"
            accept=".csv,text/csv"
            onChange={(event) => previewFile(event.currentTarget.files?.[0])}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="importValidOnly" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
          Import valid rows only
        </label>
        <button
          disabled={busy}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Importing..." : "Import CSV"}
        </button>
      </form>
      {preview.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <tbody>
              {preview.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "bg-slate-100 font-semibold" : ""}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="max-w-[220px] truncate border-t border-slate-100 px-2 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result && (
        <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
