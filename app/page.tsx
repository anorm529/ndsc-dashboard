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
const ONE_MIN_MS = 60_000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function toMs(value: any) {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function safeNum(v: any) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

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

// Always "Xd Xh Xm" (no seconds)
function countdownLabel(targetISO: any) {
  const t = toMs(targetISO);
  if (t == null) return null;

  const diff = t - Date.now();
  if (diff <= 0) return null; // past games excluded

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;

  return `${days}d ${hours}h ${mins}m`;
}

// Progress bar: fills up as the match approaches within a 7-day window.
// - If match is >7 days away: small fill (5%)
// - If match is now: 100%
function matchProgress(targetISO: any) {
  const t = toMs(targetISO);
  if (t == null) return 0;

  const diff = t - Date.now();
  if (diff <= 0) return 100;

  // 7-day window
  const clamped = Math.min(Math.max(diff, 0), SEVEN_DAYS_MS);
  const p = 1 - clamped / SEVEN_DAYS_MS;

  // keep it visible even if > 7 days away
  const visible = diff > SEVEN_DAYS_MS ? 0.05 : p;
  return Math.round(visible * 100);
}

function venueBadge(v: any) {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("home")) return { label: "Home", icon: "🏠" };
  if (s.includes("away")) return { label: "Away", icon: "✈️" };
  return { label: String(v ?? "Venue"), icon: "📍" };
}

function mapsUrl(lat?: any, lng?: any) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return `https://www.google.com/maps?q=${la},${ln}`;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // tick for countdown + progress refresh
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
    const id = setInterval(load, ONE_MIN_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ONE_MIN_MS);
    return () => clearInterval(id);
  }, []);

  const view = useMemo(() => {
    if (!data) return null;

    const now = Date.now();

    // UPCOMING FIXTURES ONLY (strict)
    const upcomingFixtures = [...(data.nextFixture ?? [])]
      .map((f) => ({ ...f, __ms: toMs(f?.date) }))
      .filter((f) => f.__ms != null && f.__ms > now)
      .sort((a, b) => (a.__ms as number) - (b.__ms as number));

    const featuredMatch = upcomingFixtures[0] ?? null;

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

    return {
      featuredMatch,
      upcomingFixtures,
      leagueTable,
      topHitters,
      recentResults,
      homeRunLeaders,
    };
  }, [data]);

  const featuredCountdown = useMemo(() => {
    const iso = view?.featuredMatch?.date;
    if (!iso) return null;
    return countdownLabel(iso);
  }, [view]);

  const featuredProgress = useMemo(() => {
    const iso = view?.featuredMatch?.date;
    if (!iso) return 0;
    return matchProgress(iso);
  }, [view]);

  return (
    <main className="min-h-screen bg-[#0f1c2e] text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">NDSC Barracudas</h1>
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
            {/* FEATURED MATCH + FIXTURES LIST */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Featured Match Card */}
              <div
                className="lg:col-span-2 rounded-3xl p-6 border"
                style={{
                  borderColor: `${TEAL}33`,
                  background: "rgba(255,255,255,0.04)",
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 0 40px rgba(18,214,197,0.10)`,
                }}
              >
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: TEAL, boxShadow: `0 0 20px ${TEAL}` }}
                    />
                    <div>
                      <h2 className="text-xl font-semibold">Match Card</h2>
                      <p className="text-xs opacity-70">Closest upcoming fixture</p>
                    </div>
                  </div>

                  <span
                    className="text-xs px-3 py-1 rounded-full border"
                    style={{
                      borderColor: `${TEAL}55`,
                      background: `${TEAL}1A`,
                    }}
                  >
                    Matchday
                  </span>
                </div>

                {!view.featuredMatch ? (
                  <div
                    className="rounded-2xl p-5 border"
                    style={{
                      borderColor: "rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="font-semibold">No upcoming fixtures</div>
                    <div className="text-sm opacity-70 mt-1">
                      Add matches in the <code className="opacity-90">Next_Fixture</code> sheet.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-5 border" style={{ borderColor: `${TEAL}22`, background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-2xl font-bold leading-tight truncate">
                          {view.featuredMatch.Team} <span className="opacity-70">vs</span>{" "}
                          {view.featuredMatch.Opponent}
                        </div>

                        <div className="mt-2 text-sm opacity-80">
                          {formatDateTimeUK(view.featuredMatch.date)} · {view.featuredMatch.League}
                        </div>

                        <div className="mt-2 text-sm opacity-80 flex items-center gap-2">
                          {(() => {
                            const vb = venueBadge(view.featuredMatch.Venue);
                            return (
                              <>
                                <span>{vb.icon}</span>
                                <span className="opacity-90">{vb.label}</span>
                                <span className="opacity-60">·</span>
                                <span className="opacity-90">{String(view.featuredMatch.Venue ?? "").replace(/home|away/i, "").trim() || "—"}</span>
                              </>
                            );
                          })()}
                        </div>

                        {view.featuredMatch.Notes ? (
                          <div className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.82)" }}>
                            {view.featuredMatch.Notes}
                          </div>
                        ) : null}
                        {(() => {
                          const url = mapsUrl(view.featuredMatch.Lat, view.featuredMatch.Lng);
                          if (!url) return null;

                          return (
                            <div className="mt-4">
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-xl border"
                                style={{ borderColor: `${TEAL}55`, background: `${TEAL}12` }}
                              >
                                📍 Directions
                              </a>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="shrink-0 text-right">
                        <div
                          className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border"
                          style={{
                            borderColor: `${TEAL}55`,
                            background: "rgba(255,255,255,0.06)",
                          }}
                          title="Time until match"
                        >
                          ⏳ {featuredCountdown ?? "—"} away
                        </div>

                        <div className="mt-4">
                          <div className="text-xs opacity-70 mb-2">Countdown Progress</div>
                          <div className="w-56 max-w-full h-3 rounded-full overflow-hidden border"
                               style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                            <div
                              className="h-full"
                              style={{
                                width: `${featuredProgress}%`,
                                background: `linear-gradient(90deg, ${TEAL}, rgba(18,214,197,0.35))`,
                              }}
                            />
                          </div>
                          <div className="text-[11px] opacity-60 mt-2">
                            {featuredProgress}% (fills as match approaches)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixtures List */}
              <div
                className="rounded-3xl p-6 border"
                style={{ borderColor: `${TEAL}22`, background: "rgba(255,255,255,0.04)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Fixtures</h2>
                  <span
                    className="text-xs px-2 py-1 rounded-full border"
                    style={{ borderColor: `${TEAL}33`, background: `${TEAL}12` }}
                    title="Upcoming fixtures only"
                  >
                    Upcoming
                  </span>
                </div>

                <div className="space-y-3">
                  {(view.upcomingFixtures ?? []).slice(0, 8).map((f, i) => {
                    const cd = countdownLabel(f.date);
                    const vb = venueBadge(f.Venue);
                    const url = mapsUrl(f.Lat, f.Lng);
                    return (
                      <div
                        key={i}
                        className="rounded-2xl p-4 border"
                        style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              {f.Team} <span className="opacity-70">vs</span> {f.Opponent}
                            </div>
                            <div className="text-xs opacity-70 mt-1">
                              {formatDateTimeUK(f.date)} · {vb.icon} {vb.label} · {f.League}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div
                              className="text-[11px] px-2 py-1 rounded-full border whitespace-nowrap"
                              style={{ borderColor: `${TEAL}33`, background: "rgba(255,255,255,0.06)" }}
                              title="Time until match"
                            >
                              {cd ? `${cd}` : "—"}
                            </div>

                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] px-2 py-1 rounded-full border whitespace-nowrap"
                                style={{ borderColor: `${TEAL}33`, background: `${TEAL}12` }}
                              >
                                📍 Map
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {(!view.upcomingFixtures || view.upcomingFixtures.length === 0) && (
                    <div className="text-sm opacity-70">
                      No upcoming fixtures found.
                    </div>
                  )}

                  {view.upcomingFixtures?.length > 8 && (
                    <div className="text-xs opacity-60 pt-1">
                      Showing 8 of {view.upcomingFixtures.length}.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* REST OF DASHBOARD */}
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
                      style={{
                        borderColor: "rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                        style={{ background: `${TEAL}14`, border: `1px solid ${TEAL}33` }}
                      >
                        {r.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{r.team}</div>
                        <div className="text-xs opacity-70">
                          P {r.played} · W {r.wins} · L {r.losses}
                        </div>
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
                      style={{
                        borderColor: "rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold">{p.player}</div>
                        <div
                          className="text-xs px-2 py-1 rounded-full border"
                          style={{ borderColor: `${TEAL}33`, background: `${TEAL}12` }}
                        >
                          #{i + 1}
                        </div>
                      </div>
                      <div className="text-sm opacity-70">{p.team}</div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs opacity-60">AVG</div>
                          <div className="font-semibold">
                            {p.avg != null ? Number(p.avg).toFixed(3) : "—"}
                          </div>
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
                        style={{
                          borderColor: "rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                        }}
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
                      style={{
                        borderColor: "rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.04)",
                      }}
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
              Auto-refreshes every 60 seconds · Past fixtures are excluded automatically
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
