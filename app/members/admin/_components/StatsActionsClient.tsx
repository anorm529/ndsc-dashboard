"use client";

import { useState, type FormEvent } from "react";

export default function StatsActionsClient() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const action = String(form.get("action"));
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/admin/actions?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Action failed");
      setMessage("Action completed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={run} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Refresh / Archive</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <select name="action" className="rounded-md border border-slate-300 px-3 py-2">
          <option value="refresh-all">Refresh all</option>
          <option value="refresh-year">Refresh year</option>
          <option value="refresh-team">Refresh year + team slug</option>
          <option value="archive">Archive year</option>
        </select>
        <input name="year" placeholder="Year" className="rounded-md border border-slate-300 px-3 py-2" />
        <input name="teamSlug" placeholder="Team slug" className="rounded-md border border-slate-300 px-3 py-2" />
        <input name="archivedBy" placeholder="Archived by" className="rounded-md border border-slate-300 px-3 py-2" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={busy}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Running..." : "Run"}
        </button>
        {message && <p className="text-sm text-slate-700">{message}</p>}
      </div>
    </form>
  );
}
