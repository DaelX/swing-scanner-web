"use client";

import { useState, useMemo, useEffect } from "react";
import type { DashboardStock, DashboardResponse, Signal } from "@/lib/dashboard-types";

/* ── Mini calendar types ── */
interface MiniMacroEvent { date: string; time: string; type: string; name: string; impact: string; }
interface MiniEarningsEvent { symbol: string; date: string; time: string; }
interface MiniCalendarData { macro: MiniMacroEvent[]; earnings: MiniEarningsEvent[]; }

type SortKey = keyof DashboardStock;
type SortDir = "asc" | "desc";

function SignalBadge({ signal }: { signal: Signal }) {
  const styles: Record<Signal, string> = {
    STRONG_BUY: "bg-green-900/80 text-green-300 border-green-500",
    BUY: "bg-green-900/40 text-green-400 border-green-700",
    HOLD: "bg-slate-800 text-slate-400 border-slate-600",
    SELL: "bg-red-900/40 text-red-400 border-red-700",
    STRONG_SELL: "bg-red-900/80 text-red-300 border-red-500",
  };
  const labels: Record<Signal, string> = {
    STRONG_BUY: "STRONG BUY",
    BUY: "BUY",
    HOLD: "HOLD",
    SELL: "SELL",
    STRONG_SELL: "STRONG SELL",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles[signal]}`}>
      {labels[signal]}
    </span>
  );
}

function TrendBadge({ trend }: { trend: "BULL" | "BEAR" | "RANGE" }) {
  const styles = {
    BULL: "text-green-400",
    BEAR: "text-red-400",
    RANGE: "text-yellow-400",
  };
  const icons = { BULL: "▲", BEAR: "▼", RANGE: "◆" };
  return <span className={`text-[10px] font-bold ${styles[trend]}`}>{icons[trend]} {trend}</span>;
}

function ScoreBar({ score }: { score: number }) {
  // -100 to +100 → bar from center
  const pct = Math.abs(score);
  const color = score >= 50 ? "bg-green-500" : score >= 20 ? "bg-green-700" : score >= -20 ? "bg-slate-500" : score >= -50 ? "bg-red-700" : "bg-red-500";
  return (
    <div className="flex items-center gap-1">
      <div className="w-14 h-2 bg-slate-700 rounded-full overflow-hidden relative">
        {score >= 0 ? (
          <div className={`absolute left-1/2 h-full ${color} rounded-r-full`} style={{ width: `${pct / 2}%` }} />
        ) : (
          <div className={`absolute h-full ${color} rounded-l-full`} style={{ width: `${pct / 2}%`, right: "50%" }} />
        )}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500" />
      </div>
      <span className={`text-[10px] font-mono w-7 text-right ${score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-slate-500"}`}>
        {score > 0 ? "+" : ""}{score}
      </span>
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const pct = Math.abs(value);
  const color = value > 30 ? "bg-green-500" : value > 0 ? "bg-green-800" : value > -30 ? "bg-red-800" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-12">{label}</span>
      <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden relative">
        {value >= 0 ? (
          <div className={`absolute left-1/2 h-full ${color}`} style={{ width: `${pct / 2}%` }} />
        ) : (
          <div className={`absolute h-full ${color}`} style={{ width: `${pct / 2}%`, right: "50%" }} />
        )}
      </div>
      <span className={`text-[10px] font-mono w-6 ${value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-slate-500"}`}>
        {value > 0 ? "+" : ""}{value}
      </span>
    </div>
  );
}

function RsiIndicator({ rsi }: { rsi: number | null }) {
  if (rsi === null) return <span className="text-slate-600">—</span>;
  const color = rsi <= 30 ? "text-red-400" : rsi <= 40 ? "text-yellow-400" : rsi <= 60 ? "text-slate-300" : rsi <= 70 ? "text-blue-400" : "text-red-400";
  return <span className={`font-mono text-xs ${color}`}>{rsi.toFixed(0)}</span>;
}

function ChangeCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-slate-500 font-mono text-xs">0.00%</span>;
  const color = value > 0 ? "text-green-400" : "text-red-400";
  const sign = value > 0 ? "+" : "";
  return <span className={`font-mono text-xs ${color}`}>{sign}{value.toFixed(2)}%</span>;
}

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "STRONG_BUY", label: "Strong Buy" },
  { value: "BUY", label: "Buy" },
  { value: "HOLD", label: "Hold" },
  { value: "SELL", label: "Sell" },
  { value: "STRONG_SELL", label: "Strong Sell" },
] as const;

export default function DashboardPage() {
  const [stocks, setStocks] = useState<DashboardStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [universe, setUniverse] = useState("sp500");
  const [scanDate, setScanDate] = useState("");
  const [totalScanned, setTotalScanned] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("signal_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<MiniCalendarData | null>(null);

  useEffect(() => {
    fetch("/api/calendar?days=14&earnings=true")
      .then((r) => r.json())
      .then((d) => setCalendarData(d))
      .catch(() => {});
  }, []);

  const runScan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard?universe=${universe}`);
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
      const data: DashboardResponse = await res.json();
      setStocks(data.stocks);
      setScanDate(data.scan_date);
      setTotalScanned(data.total_scanned);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let list = stocks;
    if (filter !== "all") list = list.filter((s) => s.signal === filter);
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return 0;
    });
  }, [stocks, filter, sortKey, sortDir]);

  const counts = useMemo(() => ({
    STRONG_BUY: stocks.filter((s) => s.signal === "STRONG_BUY").length,
    BUY: stocks.filter((s) => s.signal === "BUY").length,
    HOLD: stocks.filter((s) => s.signal === "HOLD").length,
    SELL: stocks.filter((s) => s.signal === "SELL").length,
    STRONG_SELL: stocks.filter((s) => s.signal === "STRONG_SELL").length,
  }), [stocks]);

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      className="px-2 py-2 text-left text-[10px] uppercase tracking-wider text-slate-400 cursor-pointer hover:text-white select-none"
      onClick={() => toggleSort(k)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortKey === k && <span>{sortDir === "desc" ? "▼" : "▲"}</span>}
      </div>
    </th>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Elite Strategy Dashboard</h1>
          <p className="text-sm text-slate-400">
            {scanDate
              ? `${scanDate} · ${universe.toUpperCase()} · ${totalScanned} tickers`
              : "Multi-factor institutional signal system"}
          </p>
        </div>
        <div className="flex gap-2">
          <select className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm" value={universe} onChange={(e) => setUniverse(e.target.value)}>
            <option value="sp500">S&P 500</option>
            <option value="nasdaq100">Nasdaq 100</option>
          </select>
          <button onClick={runScan} disabled={loading} className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 px-5 py-2 rounded text-sm font-medium transition">
            {loading ? "Scanning..." : "Scan Market"}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-sm text-red-300">{error}</div>}

      {loading && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 mb-4 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Running elite strategy scan... ~30 seconds</p>
        </div>
      )}

      {stocks.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-center cursor-pointer hover:border-green-500 transition" onClick={() => setFilter(filter === "STRONG_BUY" ? "all" : "STRONG_BUY")}>
            <div className="text-2xl font-bold text-green-400">{counts.STRONG_BUY}</div>
            <div className="text-[10px] text-green-500 uppercase tracking-wider">Strong Buy</div>
          </div>
          <div className="bg-green-900/15 border border-green-800 rounded-lg p-3 text-center cursor-pointer hover:border-green-600 transition" onClick={() => setFilter(filter === "BUY" ? "all" : "BUY")}>
            <div className="text-2xl font-bold text-green-500">{counts.BUY}</div>
            <div className="text-[10px] text-green-600 uppercase tracking-wider">Buy</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-slate-500 transition" onClick={() => setFilter(filter === "HOLD" ? "all" : "HOLD")}>
            <div className="text-2xl font-bold text-slate-400">{counts.HOLD}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Hold</div>
          </div>
          <div className="bg-red-900/15 border border-red-800 rounded-lg p-3 text-center cursor-pointer hover:border-red-600 transition" onClick={() => setFilter(filter === "SELL" ? "all" : "SELL")}>
            <div className="text-2xl font-bold text-red-500">{counts.SELL}</div>
            <div className="text-[10px] text-red-600 uppercase tracking-wider">Sell</div>
          </div>
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center cursor-pointer hover:border-red-500 transition" onClick={() => setFilter(filter === "STRONG_SELL" ? "all" : "STRONG_SELL")}>
            <div className="text-2xl font-bold text-red-400">{counts.STRONG_SELL}</div>
            <div className="text-[10px] text-red-500 uppercase tracking-wider">Strong Sell</div>
          </div>
        </div>
      )}

      {/* ── Upcoming Events Widget ── */}
      {calendarData && (calendarData.macro.length > 0 || calendarData.earnings.length > 0) && (
        <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Events (14d)</span>
            <a href="/calendar" className="text-[10px] text-blue-400 hover:text-blue-300">View Full Calendar →</a>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {calendarData.macro.slice(0, 8).map((e, i) => {
              const typeColors: Record<string, string> = { FOMC: "border-red-500 bg-red-900/20", CPI: "border-orange-500 bg-orange-900/20", NFP: "border-amber-500 bg-amber-900/20", GDP: "border-purple-500 bg-purple-900/20", PCE: "border-pink-500 bg-pink-900/20", PPI: "border-blue-500 bg-blue-900/20" };
              const icons: Record<string, string> = { FOMC: "🏛️", CPI: "📊", NFP: "👷", GDP: "📈", PCE: "💳", PPI: "🏭", RETAIL_SALES: "🛒", ISM_MFG: "⚙️", ISM_SVC: "🏢" };
              const d = new Date(e.date + "T12:00:00");
              const dayStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <div key={`m${i}`} className={`flex-shrink-0 border rounded-lg px-3 py-2 min-w-[120px] ${typeColors[e.type] || "border-slate-600 bg-slate-800/30"}`}>
                  <div className="text-[10px] text-slate-500">{dayStr}</div>
                  <div className="text-xs font-bold mt-0.5">{icons[e.type] || "📅"} {e.type.replace(/_/g, " ")}</div>
                  <div className="text-[10px] text-slate-400">{e.time} ET</div>
                </div>
              );
            })}
            {calendarData.earnings.length > 0 && (
              <div className="flex-shrink-0 border border-violet-600 bg-violet-900/20 rounded-lg px-3 py-2 min-w-[140px]">
                <div className="text-[10px] text-slate-500">Earnings</div>
                <div className="text-xs font-bold mt-0.5">🎯 {calendarData.earnings.length} reports</div>
                <div className="text-[10px] text-violet-400">{calendarData.earnings.slice(0, 4).map(e => e.symbol).join(", ")}{calendarData.earnings.length > 4 ? "..." : ""}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {stocks.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setFilter(opt.value)} className={`text-xs px-3 py-1 rounded-full border transition ${filter === opt.value ? "bg-slate-700 border-slate-500 text-white" : "bg-transparent border-slate-700 text-slate-400 hover:border-slate-500"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 border-b border-slate-700">
              <tr>
                <SortHeader k="signal_score">Signal</SortHeader>
                <SortHeader k="symbol">Ticker</SortHeader>
                <SortHeader k="price">Price</SortHeader>
                <SortHeader k="change_1d">1D</SortHeader>
                <SortHeader k="change_5d">5D</SortHeader>
                <SortHeader k="rsi">RSI</SortHeader>
                <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wider text-slate-400">Trend</th>
                <SortHeader k="stop_loss">Stop</SortHeader>
                <SortHeader k="target_1">Target</SortHeader>
                <SortHeader k="reward_risk">R:R</SortHeader>
                <SortHeader k="position_size_pct">Size%</SortHeader>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <>
                  <tr
                    key={s.symbol}
                    className={`border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition ${
                      s.signal === "STRONG_BUY" ? "bg-green-950/20" : s.signal === "STRONG_SELL" ? "bg-red-950/20" : ""
                    }`}
                    onClick={() => setExpandedRow(expandedRow === s.symbol ? null : s.symbol)}
                  >
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-1">
                        <SignalBadge signal={s.signal} />
                        <ScoreBar score={s.signal_score} />
                      </div>
                    </td>
                    <td className="px-2 py-2 font-bold text-white">{s.symbol}</td>
                    <td className="px-2 py-2 font-mono text-xs">${s.price.toFixed(2)}</td>
                    <td className="px-2 py-2"><ChangeCell value={s.change_1d} /></td>
                    <td className="px-2 py-2"><ChangeCell value={s.change_5d} /></td>
                    <td className="px-2 py-2"><RsiIndicator rsi={s.rsi} /></td>
                    <td className="px-2 py-2"><TrendBadge trend={s.trend} /></td>
                    <td className="px-2 py-2">
                      {s.stop_loss ? <span className="font-mono text-xs text-red-400">${s.stop_loss.toFixed(2)}</span> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-2 py-2">
                      {s.target_1 ? <span className="font-mono text-xs text-green-400">${s.target_1.toFixed(2)}</span> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-2 py-2">
                      {s.reward_risk !== null ? (
                        <span className={`font-mono text-xs font-bold ${s.reward_risk >= 2 ? "text-green-400" : "text-yellow-400"}`}>{s.reward_risk.toFixed(1)}</span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-2 py-2">
                      {s.position_size_pct !== null ? (
                        <span className="font-mono text-xs text-slate-300">{s.position_size_pct.toFixed(0)}%</span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                  {expandedRow === s.symbol && (
                    <tr key={`${s.symbol}-detail`} className="bg-slate-900/60">
                      <td colSpan={11} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                          <div>
                            <div className="text-slate-500 mb-1">Factor Breakdown</div>
                            <div className="space-y-1.5">
                              <FactorBar label="Trend" value={s.factor_trend} />
                              <FactorBar label="Momen" value={s.factor_momentum} />
                              <FactorBar label="MeanR" value={s.factor_mean_reversion} />
                              <FactorBar label="Volume" value={s.factor_volume} />
                              <FactorBar label="RS" value={s.factor_relative_strength} />
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">Key Levels</div>
                            <div className="space-y-1">
                              <div>SMA20: <span className="text-white font-mono">{s.sma20 ? `$${s.sma20.toFixed(2)}` : "—"}</span></div>
                              <div>SMA50: <span className="text-white font-mono">{s.sma50 ? `$${s.sma50.toFixed(2)}` : "—"}</span></div>
                              <div>SMA200: <span className="text-white font-mono">{s.sma200 ? `$${s.sma200.toFixed(2)}` : "—"}</span></div>
                              <div>Support: <span className="text-white font-mono">{s.nearest_support ? `$${s.nearest_support.toFixed(2)} (${s.nearest_support_label})` : "—"}</span></div>
                              <div>Resist: <span className="text-white font-mono">{s.nearest_resistance ? `$${s.nearest_resistance.toFixed(2)} (${s.nearest_resistance_label})` : "—"}</span></div>
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">Risk Management</div>
                            <div className="space-y-1">
                              <div>Stop: <span className="text-red-400 font-mono">{s.stop_loss ? `$${s.stop_loss.toFixed(2)} (${s.stop_pct?.toFixed(1)}%)` : "—"}</span></div>
                              <div>Target 1: <span className="text-green-400 font-mono">{s.target_1 ? `$${s.target_1.toFixed(2)}` : "—"}</span></div>
                              <div>Target 2: <span className="text-green-400 font-mono">{s.target_2 ? `$${s.target_2.toFixed(2)}` : "—"}</span></div>
                              <div>ATR: <span className="text-white font-mono">{s.atr ? `$${s.atr.toFixed(2)} (${s.atr_pct?.toFixed(1)}%)` : "—"}</span></div>
                              <div>Size: <span className="text-white font-mono">{s.position_size_pct ? `${s.position_size_pct.toFixed(1)}% of portfolio` : "—"}</span></div>
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">Signal Reasons</div>
                            <div className="space-y-1">
                              {s.signal_reasons.length > 0 ? s.signal_reasons.map((r, i) => (
                                <div key={i} className={s.signal_score > 0 ? "text-green-400" : s.signal_score < 0 ? "text-red-400" : "text-slate-400"}>• {r}</div>
                              )) : <div className="text-slate-600">No signals</div>}
                            </div>
                          </div>
                          {s.est_entry_date && (
                            <div>
                              <div className="text-slate-500 mb-1">Trade Plan</div>
                              <div className="space-y-1">
                                <div>Entry: <span className="text-white font-mono">{s.est_entry_date}</span>{s.est_entry_price ? <span className="text-slate-400"> @ ${s.est_entry_price.toFixed(2)}</span> : ""}</div>
                                <div>Exit: <span className="text-white font-mono">{s.est_exit_date}</span></div>
                                <div>Hold: <span className="text-white font-mono">{s.est_hold_days ?? "—"} days</span></div>
                                <div>R:R: <span className={`font-mono font-bold ${(s.reward_risk ?? 0) >= 2 ? "text-green-400" : "text-yellow-400"}`}>{s.reward_risk?.toFixed(1) ?? "—"}</span></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && stocks.length === 0 && !error && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center text-slate-400">
          Click <strong>Scan Market</strong> to run the elite multi-factor strategy.
        </div>
      )}

      <div className="mt-6 bg-slate-800/30 border border-slate-700 rounded-lg p-3 text-xs text-slate-500">
        <strong>DISCLAIMER:</strong> This is a research/educational tool only. NOT financial advice. Always do your own due diligence.
      </div>
    </div>
  );
}
