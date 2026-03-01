"use client";

import { useState } from "react";
import CandidateCard from "@/components/CandidateCard";
import type { ScanCandidate, ScanResponse } from "@/lib/types";

export default function Dashboard() {
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanDate, setScanDate] = useState("");
  const [universe, setUniverse] = useState("sp500");
  const [error, setError] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [totalScanned, setTotalScanned] = useState(0);

  const runScan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/scan?universe=${universe}&top_n=10`);
      if (!res.ok) {
        const errBody = await res.text().catch(() => res.statusText);
        throw new Error(errBody || res.statusText);
      }
      const data: ScanResponse = await res.json();
      setCandidates(data.candidates);
      setScanDate(data.scan_date);
      setTotalScanned(data.total_scanned);
      setIsLive(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Scan failed";
      console.error("Scan error:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Top 10 Swing Candidates</h1>
          <p className="text-sm text-slate-400">
            {isLive
              ? `Live scan · ${scanDate} · ${universe.toUpperCase()} · ${totalScanned} tickers scanned`
              : "Click \"Run Scan\" to scan the market"}
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
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded text-sm font-medium transition"
          >
            {loading ? "Scanning..." : "Run Scan"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!isLive && !loading && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 mb-4 text-sm text-blue-300">
          Click &quot;Run Scan&quot; to fetch live results. The first scan takes
          ~30 seconds to download market data.
        </div>
      )}

      {loading && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 mb-4 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            Scanning {universe === "sp500" ? "100" : "50"} tickers... This takes
            ~30 seconds.
          </p>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((c) => (
            <CandidateCard key={c.symbol} c={c} />
          ))}
        </div>
      )}

      {isLive && candidates.length === 0 && !loading && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-sm text-yellow-300">
          No candidates passed the scoring filters today. This can happen on
          weak market days or weekends when data is stale. Try again on a
          trading day.
        </div>
      )}

      <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-lg p-4 text-xs text-slate-500">
        <strong>DISCLAIMER:</strong> This is a probability scanner for
        research/educational purposes only. It is NOT financial advice. Past
        performance does not guarantee future results. Always do your own due
        diligence.
      </div>
    </div>
  );
}
