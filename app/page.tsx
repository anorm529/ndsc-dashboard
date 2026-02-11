"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  nextFixture: any[];
  leagueTable: any[];
  topHitters: any[];
  recentResults: any[];
  homeRunLeaders: any[];
};

function formatDateTimeUK(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value ?? "");
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateUK(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value ?? "");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function safeNum(v: any) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch("/api/dashboard", { cache: "no-store" });

      // If your API returns JSON errors, surface them
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API error: ${res.status}${text ? ` — ${text.slice(0, 120)}` : ""}`);
      }

      const json = (await res.json()) as DashboardData;
      setData(json);
      setLastUpdated(new Date().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const view = useMemo(() => {
    if (!data) return null;

    const nextFixture = [...(data.nextFixture ?? [])].sort((a, b) => {
      const da = new Date(a?.date).getTime();
      const db = new Date(b?.date).getTime();
      return (Number.isFinite(da) ? da : 9e15) - (Number.isFinite(db) ? db : 9e15);
    });

    const leagueTable = [...(data.leagueTable ?? [])].sort((a, b) => {
      const pa = safeNum(a?.position) ?? 9e9;
      const pb = safeNum(b?.position) ?? 9e9;
      return pa - pb;
    });

    const topHitters = [...(data.topHitters ?? [])].sort((a, b) => {
      const aa = safeNum(a?.avg) ?? -1;
      const bb = safeNum(b?.avg) ?? -1;
      return bb - aa;
    });

    const recentResults = [...(data.recentResults ?? [])].sort((a, b) => {
      const da = new Date(a?.Date).getTime();
      const db = new Date(b?.Date).getTime();
      return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0);
    });

    const homeRunLeaders = [...(data.homeRunLeaders ?? [])].sort((a, b) => {
      const ha = safeNum(a?.Home_Runs) ?? 0;
      const hb = safeNum(b?.Home_Runs) ?? 0;
      return hb - ha;
    });

    return { nextFixture, leagueTable, topHitters, recentResults, homeRunLeaders };
  }, [data]);

  return (
    <main className="min-h-screen bg-[#0f1c2e] text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">North Down Softball Club</h1>
            <p className="text-sm opacity-70">Matchday Dashboard</p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && <div className="text-xs opacity-70">Updated {lastUpdated}</div>}
            <button
              onClick={load}
              className="text-sm bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-4 py-2 transition"
            >
              Refresh
            </button>
          </div>
        </header>

        {loading && <div className="opacity-80 mb-6">Loading…</div>}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl mb-6">
            {error}
          </div>
        )}

        {!view ? null : (
          <>
            {/* Next Fixture (full width) */}
            <section className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Next Fixture</h2>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10">
                  Matchday
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {view.nextFixture?.map((f, i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 min-h-[140px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-lg font-bold">{f.Team}</div>
                      <div className="opacity-90">vs {f.Opponent}</div>
                      <div className="text-sm opacity-70 mt-2">
                        {formatDateTimeUK(f.date)} · {f.Venue} · {f.League}
                      </div>
                    </div>

                    {f.Notes ? <div className="text-sm mt-3 opacity-80">{f.Notes}</div> : <div />}
                  </div>
                ))}
              </div>
            </section>

            {/* Grid: League / Hitters / Results / HR */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* League Table */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">League Table</h2>

                <div className="space-y-2">
                  {view.leagueTable?.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl"
                    >
                      <div className="w-10 text-center font-bold text-white/90">{r.position}</div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{r.team}</div>
                        <div className="text-xs opacity-70">
                          P {r.played} · W {r.wins} · L {r.losses}
                        </div>
                      </div>

                      <div className="text-sm opacity-80 whitespace-nowrap">
                        {r.wins}-{r.losses} ({r.points} pts)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Hitters */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">Top Hitters</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {view.topHitters?.slice(0, 4).map((p, i) => (
                    <div
                      key={i}
                      className="bg-white/5 border border-white/10 rounded-2xl p-5 min-h-[140px] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="font-bold">{p.player}</div>
                          <div className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                            #{i + 1}
                          </div>
                        </div>
                        <div className="text-sm opacity-70">{p.team}</div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs opacity-60">AVG</div>
                          <div className="font-semibold">{Number(p.avg).toFixed(3)}</div>
                        </div>
                        <div>
                          <div className="text-xs opacity-60">OBP</div>
                          <div className="font-semibold">
                            {p.obp != null ? Number(p.obp).toFixed(3) : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs opacity-60">RBIs</div>
                          <div className="font-semibold">{p.rbis ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs opacity-60">Games</div>
                          <div className="font-semibold">{p["Games Played"] ?? "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Results */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Results</h2>

                <div className="space-y-3">
                  {view.recentResults?.slice(0, 4).map((m, i) => {
                    const res = String(m.Result ?? "").toUpperCase();
                    const badge =
                      res === "W"
                        ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-200"
                        : res === "L"
                        ? "bg-red-500/15 border-red-400/30 text-red-200"
                        : "bg-white/10 border-white/10 text-white/80";

                    return (
                      <div
                        key={i}
                        className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {m.Team} vs {m.Opponent}
                          </div>
                          <div className="text-xs opacity-70">{formatDateUK(m.Date)}</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-sm opacity-80 whitespace-nowrap">
                            {m["NDSC Score"]}-{m["Opponent Score"]}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full border ${badge}`}>
                            {res || "—"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Home Run Leaders */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">Home Run Leaders</h2>

                <div className="space-y-3">
                  {view.homeRunLeaders?.slice(0, 5).map((hr, i) => (
                    <div
                      key={i}
                      className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{hr.Player}</div>
                        <div className="text-xs opacity-70">{hr.Team}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-xs opacity-60">HR</div>
                        <div className="text-2xl font-bold leading-none">
                          {hr.Home_Runs ?? 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <footer className="mt-10 text-xs opacity-60">
              Auto-refreshes every 60 seconds · Data maintained by NDSC admins in Google Sheets
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
