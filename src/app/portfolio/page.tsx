"use client";

import { useState, useMemo, useCallback } from "react";

interface Holding {
  id: string;
  symbol: string;
  shares: number;
  avg_cost: number;
  date_added: string;
}

interface LiveQuote {
  symbol: string;
  name: string;
  price: number;
  change_1d: number;
  change_pct_1d: number;
  prev_close: number;
  day_high: number;
  day_low: number;
  week52_high: number | null;
  week52_low: number | null;
}

const STORAGE_KEY = "daelx_portfolio";

function loadHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHoldings(h: Holding[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch { /* ignore */ }
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>(() => loadHoldings());
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [formSymbol, setFormSymbol] = useState("");
  const [formShares, setFormShares] = useState("");
  const [formCost, setFormCost] = useState("");

  const updateHoldings = useCallback((newHoldings: Holding[]) => {
    setHoldings(newHoldings);
    saveHoldings(newHoldings);
  }, []);

  const addHolding = () => {
    if (!formSymbol || !formShares || !formCost) return;
    const h: Holding = {
      id: genId(),
      symbol: formSymbol.toUpperCase().trim(),
      shares: parseFloat(formShares),
      avg_cost: parseFloat(formCost),
      date_added: new Date().toISOString().split("T")[0],
    };
    const next = [...holdings, h];
    updateHoldings(next);
    setFormSymbol("");
    setFormShares("");
    setFormCost("");
    setShowAdd(false);
  };

  const removeHolding = (id: string) => {
    updateHoldings(holdings.filter((h) => h.id !== id));
  };

  const fetchQuotes = async () => {
    const symbols = [...new Set(holdings.map((h) => h.symbol))];
    if (symbols.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      const data = await res.json();
      const map: Record<string, LiveQuote> = {};
      for (const q of data.quotes || []) {
        map[q.symbol] = q;
      }
      setQuotes(map);
    } catch { /* ignore */ }
    setLoading(false);
  };

  // Aggregate by symbol
  const aggregated = useMemo(() => {
    const map = new Map<string, { symbol: string; totalShares: number; totalCost: number; holdings: Holding[] }>();
    for (const h of holdings) {
      const existing = map.get(h.symbol);
      if (existing) {
        existing.totalShares += h.shares;
        existing.totalCost += h.shares * h.avg_cost;
        existing.holdings.push(h);
      } else {
        map.set(h.symbol, {
          symbol: h.symbol,
          totalShares: h.shares,
          totalCost: h.shares * h.avg_cost,
          holdings: [h],
        });
      }
    }
    return [...map.values()].map((a) => ({
      ...a,
      avgCost: a.totalCost / a.totalShares,
      quote: quotes[a.symbol] || null,
      currentValue: quotes[a.symbol] ? quotes[a.symbol].price * a.totalShares : null,
      pnl: quotes[a.symbol] ? (quotes[a.symbol].price * a.totalShares) - a.totalCost : null,
      pnlPct: quotes[a.symbol] ? ((quotes[a.symbol].price / (a.totalCost / a.totalShares)) - 1) * 100 : null,
    }));
  }, [holdings, quotes]);

  // Portfolio totals
  const totals = useMemo(() => {
    let totalCost = 0;
    let totalValue = 0;
    let hasQuotes = false;
    for (const a of aggregated) {
      totalCost += a.totalCost;
      if (a.currentValue !== null) {
        totalValue += a.currentValue;
        hasQuotes = true;
      }
    }
    const totalPnl = hasQuotes ? totalValue - totalCost : null;
    const totalPnlPct = hasQuotes && totalCost > 0 ? ((totalValue / totalCost) - 1) * 100 : null;
    const todayChange = aggregated.reduce((sum, a) => {
      if (!a.quote) return sum;
      return sum + (a.quote.change_1d * a.totalShares);
    }, 0);
    return { totalCost, totalValue, totalPnl, totalPnlPct, todayChange, hasQuotes };
  }, [aggregated]);

  const fmtMoney = (v: number) => {
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">My Portfolio</h1>
          <p className="text-sm text-slate-400">
            Track your current holdings and performance
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition"
          >
            + Add Position
          </button>
          <button
            onClick={fetchQuotes}
            disabled={loading || holdings.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 px-4 py-2 rounded text-sm font-medium transition"
          >
            {loading ? "Refreshing..." : "Refresh Prices"}
          </button>
        </div>
      </div>

      {/* ── Add Holding Form ── */}
      {showAdd && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 mb-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Symbol</label>
              <input
                type="text"
                placeholder="AAPL"
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white w-24 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Shares</label>
              <input
                type="number"
                placeholder="100"
                value={formShares}
                onChange={(e) => setFormShares(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white w-28 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Avg Cost / Share</label>
              <input
                type="number"
                step="0.01"
                placeholder="150.00"
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white w-32 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={addHolding}
              disabled={!formSymbol || !formShares || !formCost}
              className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 px-5 py-2 rounded text-sm font-medium transition"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Portfolio Summary ── */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <SummaryCard
            label="Total Invested"
            value={fmtMoney(totals.totalCost)}
            color="#3b82f6"
          />
          <SummaryCard
            label="Current Value"
            value={totals.hasQuotes ? fmtMoney(totals.totalValue) : "—"}
            color="#8b5cf6"
          />
          <SummaryCard
            label="Total P&L"
            value={totals.totalPnl !== null ? `${totals.totalPnl >= 0 ? "+" : ""}${fmtMoney(totals.totalPnl)}` : "—"}
            sub={totals.totalPnlPct !== null ? `${totals.totalPnlPct >= 0 ? "+" : ""}${totals.totalPnlPct.toFixed(2)}%` : ""}
            color={totals.totalPnl !== null ? (totals.totalPnl >= 0 ? "#22c55e" : "#ef4444") : "#64748b"}
          />
          <SummaryCard
            label="Today's Change"
            value={totals.hasQuotes ? `${totals.todayChange >= 0 ? "+" : ""}${fmtMoney(totals.todayChange)}` : "—"}
            color={totals.todayChange >= 0 ? "#22c55e" : "#ef4444"}
          />
          <SummaryCard
            label="Positions"
            value={aggregated.length.toString()}
            sub={`${holdings.length} lots`}
            color="#f59e0b"
          />
        </div>
      )}

      {/* ── Holdings Table ── */}
      {aggregated.length > 0 ? (
        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 border-b border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-400">Symbol</th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-400">Company</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-slate-400">Shares</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-slate-400">Avg Cost</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-slate-400">Price</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-slate-400">Day Chg</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-slate-400">Cost Basis</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-slate-400">Mkt Value</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-slate-400">P&L</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-slate-400">P&L %</th>
                <th className="px-3 py-2 text-center text-[10px] uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.map((a) => (
                <tr key={a.symbol} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                  <td className="px-3 py-2.5 font-bold text-white">{a.symbol}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{a.quote?.name || "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{a.totalShares.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">${a.avgCost.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {a.quote ? `$${a.quote.price.toFixed(2)}` : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {a.quote ? (
                      <span className={a.quote.change_pct_1d >= 0 ? "text-green-400" : "text-red-400"}>
                        {a.quote.change_pct_1d >= 0 ? "+" : ""}{a.quote.change_pct_1d.toFixed(2)}%
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{fmtMoney(a.totalCost)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {a.currentValue !== null ? fmtMoney(a.currentValue) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-bold">
                    {a.pnl !== null ? (
                      <span className={a.pnl >= 0 ? "text-green-400" : "text-red-400"}>
                        {a.pnl >= 0 ? "+" : ""}{fmtMoney(a.pnl)}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-bold">
                    {a.pnlPct !== null ? (
                      <span className={a.pnlPct >= 0 ? "text-green-400" : "text-red-400"}>
                        {a.pnlPct >= 0 ? "+" : ""}{a.pnlPct.toFixed(2)}%
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {a.holdings.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => removeHolding(h.id)}
                        className="text-red-400 hover:text-red-300 text-[10px] px-1"
                        title={`Remove ${h.shares} shares @ $${h.avg_cost}`}
                      >
                        ✕
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center text-slate-400">
          No holdings yet. Click <strong>+ Add Position</strong> to add your first stock.
        </div>
      )}

      <div className="mt-6 bg-slate-800/30 border border-slate-700 rounded-lg p-3 text-xs text-slate-500">
        <strong>NOTE:</strong> Portfolio data is saved locally in your browser. Prices are fetched on demand when you click &quot;Refresh Prices&quot;.
      </div>
    </div>
  );
}

/* ── Summary Card ── */
function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div
      style={{ borderTopColor: color }}
      className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 border-t-[3px]"
    >
      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-xl font-bold mt-1 font-mono">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
