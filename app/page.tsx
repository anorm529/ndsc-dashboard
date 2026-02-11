"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  nextFixture: any[];
  leagueTable: any[];
  topHitters: any[];
  recentResults: any[];
  homeRunLeaders: any[];
};

const TEAL = "#12d6c5"; // NDSC accent
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

function toMs(value: any) {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

// Always "Xd Xh Xm" (no seconds)
function countdownLabel(targetISO: any) {
  const t = toMs(targetISO);
  if (t == null) return null;

  const diff = t - Date.now();

  // within last 24h -> played
  if (diff <= 0 && Math.abs(diff) <= ONE_DAY_MS) return "Played";
  // older than 24h -> we’ll drop it (handled elsewhere)
  if (diff <= 0) return null;

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;

  return `${days}d ${hours}h ${mins}m`;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // for live countdown updates
  const [, setTick] = useState(0);

  async function load() {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `API error: ${res.status}${text ? ` — ${text.slice(0, 120)}` : ""}`
        );
      }

      const json = (await res.json()) as DashboardData;
      setData(json);
      setLastUpdated(
        new Date().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })
      );
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

  // 1-minute tick is enough now (since we’re not showing seconds)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const view = useMemo(() => {
    if (!data) return null;

    // Sort fixtures by date
    const sortedFixtures = [...(data.nextFixture ?? [])].sort((a, b) => {
      const da = toMs(a?.date) ?? 9e15;
      const db = toMs(b?.date) ?? 9e15;
      return da - db;
    });

    // Filter:
    // - Drop if more than 24h in past
    // - Keep if upcoming or within last 24h (marked as Played)
    const now = Date.now();
    const nextFixture = sortedFixtures.filter((f) => {
      const t = toMs(f?.date);
      if (t == null) return false;
      if (t < now - ONE_DAY_MS) return false; // drop off
      return true;
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
      const da = toMs(a?.Date) ?? 0;
      const db = toMs(b?.Date) ?? 0;
      return db - da;
    });

    const homeRunLeaders = [...(data.homeRunLeaders ?? [])].sort((a, b) => {
      const ha = safeNum(a?.Home_Runs) ?? 0;
      const hb = safeNum(b?.Home_Runs) ?? 0;
      return hb - ha;
    });

    // Primary fixture = first upcoming fixture (not played)
    const primaryFixture =
      nextFixture.find((f) => {
        const t = toMs(f?.date);
        return t != null && t > now;
      }) ?? null;

    return { nextFixture, primaryFixture, leagueTable, topHitters, recentResults, homeRunLeaders };
  }, [data, /* tick */]);

  const primaryCountdown = useMemo(() => {
    const iso = view?.primaryFixture?.date;
    if (!iso) return null;
    return countdownLabel(iso);
  }, [view]);

  return (
    <main className="min-h-screen bg-[#0f1c2e] text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">North Down Softball Club</h1>
            <p className="text-sm opacity-70">Matchday Dashboard</p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && <div className="text-xs opacity-70">Updated {lastUpdated}</div>}

            <button
              onClick={load}
              className="text-sm rounded-xl px-4 py-2 transition border"
              style={{
                borderColor: `${TEAL}55`,
                background: `linear-gradient(135deg, ${TEAL}22, rgba(255,255,255,0.06))`,
              }}
            >
              Refresh
            </button>
          </div>
        </header>

        {loading && <div className="opacity-80 mb-6">Loading…</div>}
        {error && (
          <div
            className="p-4 rounded-2xl mb-6 border"
            style={{
              borderColor: "rgba(239, 68, 68, 0.35)",
              background: "rgba(239, 68, 68, 0.08)",
            }}
          >
            {error}
          </div>
        )}

        {!view ? null : (
          <>
            {/* Next Fixture */}
            <section
              className="rounded-3xl p-6 mb-6 border"
              style={{
                borderColor: `${TEAL}33`,
                background: "rgba(255,255,255,0.04)",
                boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 0 40px rgba(18,214,197,0.10)`,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: TEAL, boxShadow: `0 0 20px ${TEAL}` }}
                  />
                  <h2 className="text-xl font-semibold">Next Fixture</h2>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-3 py-1 rounded-full border"
                    style={{
                      borderColor: `${TEAL}55`,
                      background: `${TEAL}1A`,
                      color: "rgba(255,255,255,0.9)",
                    }}
                  >
                    Matchday
                  </span>

                  {view.primaryFixture?.date && (
                    <span
                      className="text-xs px-3 py-1 rounded-full border"
                      style={{
                        borderColor: `${TEAL}55`,
                        background: "rgba(255,255,255,0.06)",
                      }}
                      title="Time until next upcoming game"
                    >
                      ⏳ {primaryCountdown ?? "—"} away
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(view.nextFixture?.length ? view.nextFixture : []).map((f, i) => {
                  const t = toMs(f?.date);
                  const now = Date.now();
                  const isPlayed = t != null && t <= now; // within last 24h is kept; older is filtered out
                  const status = isPlayed ? "Played" : countdownLabel(f.date);

                  return (
                    <div
                      key={i}
                      className="rounded-2xl p-5 border min-h-[160px] flex flex-col justify-between"
                      style={{
                        borderColor: `${TEAL}22`,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-lg font-bold">{f.Team}</div>

                          <span
                            className="text-xs px-3 py-1 rounded-full border whitespace-nowrap"
                            style={{
                              borderColor: isPlayed ? "rgba(255,255,255,0.18)" : `${TEAL}55`,
                              background: isPlayed ? "rgba(255,255,255,0.06)" : `${TEAL}12`,
                              color: "rgba(255,255,255,0.9)",
                            }}
                            title={isPlayed ? "This fixture has passed (kept for 24 hours)" : "Time until game"}
                          >
                            {isPlayed ? "Played" : `${status} away`}
                          </span>
                        </div>

                        <div className="opacity-90">vs {f.Opponent}</div>
                        <div className="text-sm opacity-70 mt-2">
                          {formatDateTimeUK(f.date)} · {f.Venue} · {f.League}
                        </div>
                      </div>

                      {f.Notes ? (
                        <div className="text-sm mt-3" style={{ color: "rgba(255,255,255,0.82)" }}>
                          {f.Notes}
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  );
                })}

                {(!view.nextFixture || view.nextFixture.length === 0) && (
                  <div
                    className="rounded-2xl p-5 border"
                    style={{
                      borderColor: "rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="font-semibold">No upcoming fixtures</div>
                    <div className="text-sm opacity-70 mt-1">
                      Add your next matches in the <code className="opacity-90">Next_Fixture</code> sheet.
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* The rest of your cards can stay exactly as before (league/hitters/results/hr).
               If you want, I can paste the full grid section again with teal accents included. */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* League Table */}
              <div
                className="rounded-3xl p-6 border"
                style={{ borderColor: `${TEAL}22`, background: "rgba(255,255,255,0.04)" }}
              >
                <h2 className="text-xl font-semibold mb-4">League Table</h2>
                <div className="space-y-2">
                  {view.leagueTable?.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 rounded-2xl border"
                      style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                        style={{ background: `${TEAL}14`, border: `1px solid ${TEAL}33` }}
                      >
                        {r.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{r.team}</div>
                        <div className="text-xs opacity-70">P {r.played} · W {r.wins} · L {r.losses}</div>
                      </div>
                      <div className="text-sm opacity-85 whitespace-nowrap">
                        {r.wins}-{r.losses} ({r.points} pts)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Hitters */}
              <div
                className="rounded-3xl p-6 border"
                style={{ borderColor: `${TEAL}22`, background: "rgba(255,255,255,0.04)" }}
              >
                <h2 className="text-xl font-semibold mb-4">Top Hitters</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {view.topHitters?.slice(0, 4).map((p, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-5 border min-h-[150px]"
                      style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold">{p.player}</div>
                        <div className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: `${TEAL}33`, background: `${TEAL}12` }}>
                          #{i + 1}
                        </div>
                      </div>
                      <div className="text-sm opacity-70">{p.team}</div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs opacity-60">AVG</div>
                          <div className="font-semibold">{p.avg != null ? Number(p.avg).toFixed(3) : "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs opacity-60">OBP</div>
                          <div className="font-semibold">{p.obp != null ? Number(p.obp).toFixed(3) : "—"}</div>
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
              <div
                className="rounded-3xl p-6 border"
                style={{ borderColor: `${TEAL}22`, background: "rgba(255,255,255,0.04)" }}
              >
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
                        className="rounded-2xl p-5 flex items-center justify-between gap-4 border"
                        style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{m.Team} vs {m.Opponent}</div>
                          <div className="text-xs opacity-70">{formatDateUK(m.Date)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm opacity-80 whitespace-nowrap">
                            {m["NDSC Score"]}-{m["Opponent Score"]}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full border ${badge}`}>{res || "—"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Home Run Leaders */}
              <div
                className="rounded-3xl p-6 border"
                style={{ borderColor: `${TEAL}22`, background: "rgba(255,255,255,0.04)" }}
              >
                <h2 className="text-xl font-semibold mb-4">Home Run Leaders</h2>
                <div className="space-y-3">
                  {view.homeRunLeaders?.slice(0, 5).map((hr, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-5 flex items-center justify-between gap-4 border"
                      style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{hr.Player}</div>
                        <div className="text-xs opacity-70">{hr.Team}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs opacity-60">HR</div>
                        <div className="text-2xl font-bold leading-none" style={{ color: TEAL }}>
                          {hr.Home_Runs ?? 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <footer className="mt-10 text-xs opacity-60">
              Auto-refreshes every 60 seconds · Fixtures drop off 24h after start time
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
