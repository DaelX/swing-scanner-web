"use client";

import { useEffect, useState } from "react";

/* ── types (mirrored from API) ── */
interface MacroEvent {
  date: string;
  time: string;
  type: string;
  name: string;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  affects: string[];
}
interface EarningsEvent {
  symbol: string;
  date: string;
  time: "BMO" | "AMC" | "TBD";
  name: string;
  confirmed: boolean;
}
interface CalendarDay {
  date: string;
  macro: MacroEvent[];
  earnings: EarningsEvent[];
}

/* ── colors ── */
const TYPE_COLORS: Record<string, string> = {
  FOMC: "#dc2626",
  CPI: "#ea580c",
  NFP: "#d97706",
  GDP: "#7c3aed",
  PCE: "#db2777",
  PPI: "#2563eb",
  RETAIL_SALES: "#0891b2",
  ISM_MFG: "#059669",
  ISM_SVC: "#16a34a",
  CONSUMER_CONFIDENCE: "#6366f1",
  JOBLESS_CLAIMS: "#64748b",
};

const TYPE_ICONS: Record<string, string> = {
  FOMC: "🏛️", CPI: "📊", NFP: "👷", GDP: "📈", PCE: "💳",
  PPI: "🏭", RETAIL_SALES: "🛒", ISM_MFG: "⚙️", ISM_SVC: "🏢",
  CONSUMER_CONFIDENCE: "😊", JOBLESS_CLAIMS: "📋",
};

const IMPACT_COLORS = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e" };

function formatDate(ds: string) {
  const d = new Date(ds + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function daysFromNow(ds: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(ds + "T12:00:00");
  const diff = Math.round((target.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

/* ── filter types available ── */
const ALL_TYPES = ["ALL", "FOMC", "CPI", "NFP", "GDP", "PCE", "PPI", "RETAIL_SALES", "ISM_MFG", "ISM_SVC", "EARNINGS"];

export default function CalendarPage() {
  const [macro, setMacro] = useState<MacroEvent[]>([]);
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [days, setDays] = useState(60);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?days=${days}`)
      .then((r) => r.json())
      .then((data) => {
        setMacro(data.macro || []);
        setEarnings(data.earnings || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  // Group events by date
  const dayMap = new Map<string, CalendarDay>();

  const filteredMacro = filter === "ALL" || filter === "EARNINGS" ? macro : macro.filter((e) => e.type === filter);
  const showEarnings = filter === "ALL" || filter === "EARNINGS";

  for (const e of filteredMacro) {
    if (!dayMap.has(e.date)) dayMap.set(e.date, { date: e.date, macro: [], earnings: [] });
    dayMap.get(e.date)!.macro.push(e);
  }
  if (showEarnings) {
    for (const e of earnings) {
      if (!dayMap.has(e.date)) dayMap.set(e.date, { date: e.date, macro: [], earnings: [] });
      dayMap.get(e.date)!.earnings.push(e);
    }
  }

  const sortedDays = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Stats
  const highImpactCount = macro.filter((e) => e.impact === "HIGH").length;
  const earningsCount = earnings.length;
  const nextFomc = macro.find((e) => e.type === "FOMC");
  const nextCpi = macro.find((e) => e.type === "CPI");

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Financial Calendar</h1>
      <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24 }}>
        Market-moving events that could impact your positions — next {days} days
      </p>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        <SummaryCard label="High Impact Events" value={highImpactCount} color="#ef4444" />
        <SummaryCard label="Earnings Reports" value={earningsCount} color="#8b5cf6" />
        <SummaryCard label="Next FOMC" value={nextFomc ? formatDate(nextFomc.date) : "—"} sub={nextFomc ? daysFromNow(nextFomc.date) : ""} color="#dc2626" />
        <SummaryCard label="Next CPI" value={nextCpi ? formatDate(nextCpi.date) : "—"} sub={nextCpi ? daysFromNow(nextCpi.date) : ""} color="#ea580c" />
      </div>

      {/* ── Controls ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20, alignItems: "center" }}>
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid " + (filter === t ? "#3b82f6" : "#334155"),
              background: filter === t ? "#1e3a5f" : "#0f172a",
              color: filter === t ? "#60a5fa" : "#94a3b8",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t === "ALL" ? "All Events" : t === "EARNINGS" ? "🎯 Earnings" : `${TYPE_ICONS[t] || ""} ${t.replace(/_/g, " ")}`}
          </button>
        ))}
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#e2e8f0",
            fontSize: 13,
          }}
        >
          <option value={14}>Next 2 Weeks</option>
          <option value={30}>Next 30 Days</option>
          <option value={60}>Next 60 Days</option>
          <option value={90}>Next 90 Days</option>
        </select>
      </div>

      {/* ── Timeline ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading calendar...</div>
      ) : sortedDays.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>No events found for this filter.</div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 24 }}>
          {/* timeline line */}
          <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: "#1e293b" }} />

          {sortedDays.map((day) => {
            const isToday = day.date === new Date().toISOString().split("T")[0];
            return (
              <div key={day.date} style={{ position: "relative", marginBottom: 24 }}>
                {/* dot */}
                <div
                  style={{
                    position: "absolute",
                    left: -19,
                    top: 6,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: isToday ? "#3b82f6" : day.macro.some((e) => e.impact === "HIGH") ? "#ef4444" : "#475569",
                    border: "2px solid #0f172a",
                  }}
                />
                {/* date header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: isToday ? "#3b82f6" : "#e2e8f0" }}>
                    {formatDate(day.date)}
                  </span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{daysFromNow(day.date)}</span>
                </div>

                {/* macro events */}
                {day.macro.map((e, i) => (
                  <div
                    key={`m-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "10px 14px",
                      marginBottom: 6,
                      borderRadius: 10,
                      background: "#1e293b",
                      borderLeft: `4px solid ${TYPE_COLORS[e.type] || "#475569"}`,
                    }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICONS[e.type] || "📅"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{e.name}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: IMPACT_COLORS[e.impact] + "22",
                            color: IMPACT_COLORS[e.impact],
                          }}
                        >
                          {e.impact}
                        </span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{e.time} ET</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{e.description}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        {e.affects.map((a) => (
                          <span
                            key={a}
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: "#0f172a",
                              color: "#64748b",
                              border: "1px solid #334155",
                            }}
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* earnings events */}
                {day.earnings.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "#1e293b",
                      borderLeft: "4px solid #8b5cf6",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, width: "100%", marginBottom: 4 }}>
                      🎯 Earnings ({day.earnings.length})
                    </span>
                    {day.earnings.map((e) => (
                      <span
                        key={e.symbol}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: "#8b5cf620",
                          color: "#a78bfa",
                          border: "1px solid #8b5cf640",
                        }}
                      >
                        {e.symbol}
                        <span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>
                          {e.time === "BMO" ? "Pre" : e.time === "AMC" ? "Post" : "TBD"}
                          {!e.confirmed && " ~est"}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Summary Card Component ── */
function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 12,
        background: "#1e293b",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
