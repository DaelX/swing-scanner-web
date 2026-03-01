"use client";

import { useState, useMemo } from "react";
import type { DashboardStock, DashboardResponse } from "@/lib/dashboard-types";

type SortKey = keyof DashboardStock;
type SortDir = "asc" | "desc";

function ZoneBadge({ label }: { label: DashboardStock["buy_zone_label"] }) {
  const styles: Record<string, string> = {
    IN_ZONE: "bg-green-900/60 text-green-300 border-green-600",
    APPROACHING: "bg-yellow-900/60 text-yellow-300 border-yellow-600",
    WATCH: "bg-blue-900/60 text-blue-300 border-blue-600",
    NOT_READY: "bg-slate-800 text-slate-500 border-slate-600",
  };
  const labels: Record<string, string> = {
    IN_ZONE: "IN ZONE",
    APPROACHING: "APPROACHING",
    WATCH: "WATCH",
    NOT_READY: "NOT READY",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles[label]}`}>
      {labels[label]}
    </span>
  );
}

function ProximityBar({ score }: { score: number }) {
  const color =
    score >= 60 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : score >= 20 ? "bg-blue-500" : "bg-slate-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-mono w-6 text-right">{score}</span>
    </div>
  );
}

function RsiIndicator({ rsi }: { rsi: number | null }) {
  if (rsi === null) return <span className="text-slate-600">—</span>;
  const color =
    rsi <= 30 ? "text-red-400" : rsi <= 40 ? "text-yellow-400" : rsi <= 60 ? "text-slate-300" : rsi <= 70 ? "text-blue-400" : "text-red-400";
  return <span className={`font-mono text-xs ${color}`}>{rsi.toFixed(0)}</span>;
}

function ChangeCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-slate-500 font-mono text-xs">0.00%</span>;
  const color = value > 0 ? "text-green-400" : "text-red-400";
  const sign = value > 0 ? "+" : "";
  return <span className={`font-mono text-xs ${color}`}>{sign}{value.toFixed(2)}%</span>;
}

function DistCell({ value, label }: { value: number | null; label?: string }) {
  if (value === null) return <span className="text-slate-600">—</span>;
  // Close to level = highlighted
  const close = Math.abs(value) <= 2;
  const at = Math.abs(value) <= 0.5;
  const color = at ? "text-green-400 font-bold" : close ? "text-yellow-400" : "text-slate-400";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`font-mono text-xs ${color}`} title={label}>
      {sign}{value.toFixed(1)}%
    </span>
  );
}

function MacdBadge({ cross }: { cross: DashboardStock["macd_signal_cross"] }) {
  if (cross === "bullish") return <span className="text-green-400 text-xs font-bold">BULL X</span>;
  if (cross === "bearish") return <span className="text-red-400 text-xs font-bold">BEAR X</span>;
  return <span className="text-slate-600 text-xs">—</span>;
}

const FILTER_OPTIONS = [
  { value: "all", label: "All Stocks" },
  { value: "IN_ZONE", label: "In Buy Zone" },
  { value: "APPROACHING", label: "Approaching" },
  { value: "WATCH", label: "Watch List" },
] as const;

export default function DashboardPage() {
  const [stocks, setStocks] = useState<DashboardStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [universe, setUniverse] = useState("sp500");
  const [scanDate, setScanDate] = useState("");
  const [totalScanned, setTotalScanned] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("buy_zone_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
    if (filter !== "all") list = list.filter((s) => s.buy_zone_label === filter);
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return 0;
    });
  }, [stocks, filter, sortKey, sortDir]);

  const counts = useMemo(() => ({
    IN_ZONE: stocks.filter((s) => s.buy_zone_label === "IN_ZONE").length,
    APPROACHING: stocks.filter((s) => s.buy_zone_label === "APPROACHING").length,
    WATCH: stocks.filter((s) => s.buy_zone_label === "WATCH").length,
    NOT_READY: stocks.filter((s) => s.buy_zone_label === "NOT_READY").length,
  }), [stocks]);

  const SortHeader = ({ k, children, w }: { k: SortKey; children: React.ReactNode; w?: string }) => (
    <th
      className={`px-2 py-2 text-left text-[10px] uppercase tracking-wider text-slate-400 cursor-pointer hover:text-white select-none ${w ?? ""}`}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Buy Zone Dashboard</h1>
          <p className="text-sm text-slate-400">
            {scanDate
              ? `${scanDate} · ${universe.toUpperCase()} · ${totalScanned} tickers`
              : "Scan the market to see stocks approaching buy zones"}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm"
            value={universe}
            onChange={(e) => setUniverse(e.target.value)}
          >
            <option value="sp500">S&P 500</option>
            <option value="nasdaq100">Nasdaq 100</option>
          </select>
          <button
            onClick={runScan}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 px-5 py-2 rounded text-sm font-medium transition"
          >
            {loading ? "Scanning..." : "Scan Market"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-sm text-red-300">{error}</div>
      )}

      {loading && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 mb-4 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Downloading market data and computing buy zones... ~30 seconds</p>
        </div>
      )}

      {/* Summary Cards */}
      {stocks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-center cursor-pointer hover:border-green-600 transition" onClick={() => setFilter(filter === "IN_ZONE" ? "all" : "IN_ZONE")}>
            <div className="text-2xl font-bold text-green-400">{counts.IN_ZONE}</div>
            <div className="text-[10px] text-green-500 uppercase tracking-wider">In Buy Zone</div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 text-center cursor-pointer hover:border-yellow-600 transition" onClick={() => setFilter(filter === "APPROACHING" ? "all" : "APPROACHING")}>
            <div className="text-2xl font-bold text-yellow-400">{counts.APPROACHING}</div>
            <div className="text-[10px] text-yellow-500 uppercase tracking-wider">Approaching</div>
          </div>
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-center cursor-pointer hover:border-blue-600 transition" onClick={() => setFilter(filter === "WATCH" ? "all" : "WATCH")}>
            <div className="text-2xl font-bold text-blue-400">{counts.WATCH}</div>
            <div className="text-[10px] text-blue-500 uppercase tracking-wider">Watch</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-slate-500 transition" onClick={() => setFilter("all")}>
            <div className="text-2xl font-bold text-slate-400">{stocks.length}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total</div>
          </div>
        </div>
      )}

      {/* Filter pills */}
      {stocks.length > 0 && (
        <div className="flex gap-2 mb-3">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                filter === opt.value
                  ? "bg-slate-700 border-slate-500 text-white"
                  : "bg-transparent border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 border-b border-slate-700">
              <tr>
                <SortHeader k="buy_zone_score">Zone</SortHeader>
                <SortHeader k="symbol">Ticker</SortHeader>
                <SortHeader k="price">Price</SortHeader>
                <SortHeader k="change_1d">1D</SortHeader>
                <SortHeader k="change_5d">5D</SortHeader>
                <SortHeader k="rsi">RSI</SortHeader>
                <SortHeader k="dist_sma20">→ SMA20</SortHeader>
                <SortHeader k="dist_sma50">→ SMA50</SortHeader>
                <SortHeader k="dist_sma200">→ SMA200</SortHeader>
                <SortHeader k="vol_ratio">Vol</SortHeader>
                <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wider text-slate-400">MACD</th>
                <SortHeader k="dist_support">→ Support</SortHeader>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <>
                  <tr
                    key={s.symbol}
                    className={`border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition ${
                      s.buy_zone_label === "IN_ZONE" ? "bg-green-950/20" : ""
                    }`}
                    onClick={() => setExpandedRow(expandedRow === s.symbol ? null : s.symbol)}
                  >
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-1">
                        <ZoneBadge label={s.buy_zone_label} />
                        <ProximityBar score={s.buy_zone_score} />
                      </div>
                    </td>
                    <td className="px-2 py-2 font-bold text-white">{s.symbol}</td>
                    <td className="px-2 py-2 font-mono text-xs">${s.price.toFixed(2)}</td>
                    <td className="px-2 py-2"><ChangeCell value={s.change_1d} /></td>
                    <td className="px-2 py-2"><ChangeCell value={s.change_5d} /></td>
                    <td className="px-2 py-2"><RsiIndicator rsi={s.rsi} /></td>
                    <td className="px-2 py-2"><DistCell value={s.dist_sma20} label={s.sma20 ? `SMA20: $${s.sma20}` : ""} /></td>
                    <td className="px-2 py-2"><DistCell value={s.dist_sma50} label={s.sma50 ? `SMA50: $${s.sma50}` : ""} /></td>
                    <td className="px-2 py-2"><DistCell value={s.dist_sma200} label={s.sma200 ? `SMA200: $${s.sma200}` : ""} /></td>
                    <td className="px-2 py-2">
                      {s.vol_ratio !== null ? (
                        <span className={`font-mono text-xs ${s.vol_ratio < 0.7 ? "text-yellow-400" : s.vol_ratio > 1.5 ? "text-green-400" : "text-slate-400"}`}>
                          {s.vol_ratio.toFixed(1)}x
                        </span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-2 py-2"><MacdBadge cross={s.macd_signal_cross} /></td>
                    <td className="px-2 py-2"><DistCell value={s.dist_support} /></td>
                  </tr>
                  {expandedRow === s.symbol && (
                    <tr key={`${s.symbol}-detail`} className="bg-slate-900/60">
                      <td colSpan={12} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <div className="text-slate-500 mb-1">Key Levels</div>
                            <div className="space-y-1">
                              <div>SMA20: <span className="text-white font-mono">{s.sma20 ? `$${s.sma20.toFixed(2)}` : "—"}</span></div>
                              <div>SMA50: <span className="text-white font-mono">{s.sma50 ? `$${s.sma50.toFixed(2)}` : "—"}</span></div>
                              <div>SMA200: <span className="text-white font-mono">{s.sma200 ? `$${s.sma200.toFixed(2)}` : "—"}</span></div>
                              <div>20d Support: <span className="text-white font-mono">{s.support_20d ? `$${s.support_20d.toFixed(2)}` : "—"}</span></div>
                              <div>20d Resistance: <span className="text-white font-mono">{s.resistance_20d ? `$${s.resistance_20d.toFixed(2)}` : "—"}</span></div>
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">Indicators</div>
                            <div className="space-y-1">
                              <div>RSI: <RsiIndicator rsi={s.rsi} /></div>
                              <div>MACD Hist: <span className="text-white font-mono">{s.macd_hist?.toFixed(3) ?? "—"}</span></div>
                              <div>Vol Ratio: <span className="text-white font-mono">{s.vol_ratio?.toFixed(2) ?? "—"}x</span></div>
                              <div>ATR: <span className="text-white font-mono">{s.atr ? `$${s.atr.toFixed(2)} (${s.atr_pct?.toFixed(1)}%)` : "—"}</span></div>
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">Relative Strength</div>
                            <div className="space-y-1">
                              <div>20d vs SPY: <span className={`font-mono ${(s.rs_20d ?? 0) > 0 ? "text-green-400" : "text-red-400"}`}>{s.rs_20d !== null ? `${s.rs_20d > 0 ? "+" : ""}${s.rs_20d.toFixed(1)}%` : "—"}</span></div>
                              <div>60d vs SPY: <span className={`font-mono ${(s.rs_60d ?? 0) > 0 ? "text-green-400" : "text-red-400"}`}>{s.rs_60d !== null ? `${s.rs_60d > 0 ? "+" : ""}${s.rs_60d.toFixed(1)}%` : "—"}</span></div>
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">Buy Zone Reasons</div>
                            <div className="space-y-1">
                              {s.buy_zone_reasons.length > 0 ? s.buy_zone_reasons.map((r, i) => (
                                <div key={i} className="text-green-400">• {r}</div>
                              )) : <div className="text-slate-600">No buy signals</div>}
                              {s.nearest_support !== null && (
                                <div className="mt-2 text-slate-400">
                                  Nearest support: <span className="text-white font-mono">${s.nearest_support.toFixed(2)}</span> ({s.nearest_support_label})
                                </div>
                              )}
                            </div>
                          </div>
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
          Click <strong>Scan Market</strong> to analyze all stocks and find which ones are approaching buy zones.
        </div>
      )}

      <div className="mt-6 bg-slate-800/30 border border-slate-700 rounded-lg p-3 text-xs text-slate-500">
        <strong>DISCLAIMER:</strong> This is a research/educational tool only. NOT financial advice. Always do your own due diligence.
      </div>
    </div>
  );
}
