"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  nextFixture: any[];
  leagueTable: any[];
  topHitters: any[];
  recentResults: any[];
  homeRunLeaders: any[];
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // Optional auto-refresh every 60s:
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen bg-[#0f1c2e] text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">North Down Softball Club</h1>
        <p className="text-sm opacity-70">Matchday Dashboard</p>
      </header>

      {loading && <div className="opacity-80">Loading…</div>}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="bg-white/5 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Next Fixture</h2>
            <div className="space-y-3">
              {data.nextFixture?.map((f, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-xl">
                  <div className="font-bold">{f.Team}</div>
                  <div className="opacity-90">vs {f.Opponent}</div>
                  <div className="text-sm opacity-70">
                    {String(f.date)} · {f.Venue} · {f.League}
                  </div>
                  {f.Notes ? (
                    <div className="text-sm mt-2 opacity-80">{f.Notes}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">League Table</h2>
            <div className="space-y-2">
              {data.leagueTable?.map((r, i) => (
                <div key={i} className="flex gap-4 bg-white/5 p-3 rounded-xl">
                  <div className="w-8 font-bold">{r.position}</div>
                  <div className="flex-1 font-semibold">{r.team}</div>
                  <div className="opacity-80">
                    {r.wins}-{r.losses} ({r.points} pts)
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
