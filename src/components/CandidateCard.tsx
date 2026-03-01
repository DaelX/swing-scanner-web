"use client";

import type { ScanCandidate } from "@/lib/types";

function ScoreBar({ value, label }: { value: number; label: string }) {
  const color =
    value >= 70
      ? "bg-green-500"
      : value >= 50
        ? "bg-blue-500"
        : value >= 30
          ? "bg-yellow-500"
          : "bg-red-500";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-5 text-right text-slate-400">{Math.round(value)}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    bullish: "bg-green-900/50 text-green-400 border-green-700",
    bearish: "bg-red-900/50 text-red-400 border-red-700",
    neutral: "bg-slate-800 text-slate-400 border-slate-600",
  };
  const icons: Record<string, string> = {
    bullish: "▲",
    bearish: "▼",
    neutral: "●",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border ${colors[sentiment] ?? colors.neutral}`}
    >
      {icons[sentiment] ?? "●"} {sentiment}
    </span>
  );
}

export default function CandidateCard({ c }: { c: ScanCandidate }) {
  const stopPct = (((c.stop_loss - c.entry) / c.entry) * 100).toFixed(1);
  const targetPct = (((c.target - c.entry) / c.entry) * 100).toFixed(1);

  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 hover:border-slate-500 transition">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">
            #{c.rank} {c.symbol}
          </h3>
          <p className="text-xs text-slate-400">{c.reason}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-400">
            {Math.round(c.score)}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">
            score
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
        <div>
          <div className="text-slate-500 text-xs">Entry</div>
          <div className="font-medium">${c.entry.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs">Stop</div>
          <div className="text-red-400 font-medium">
            ${c.stop_loss.toFixed(2)}{" "}
            <span className="text-xs">({stopPct}%)</span>
          </div>
        </div>
        <div>
          <div className="text-slate-500 text-xs">Target</div>
          <div className="text-green-400 font-medium">
            ${c.target.toFixed(2)}{" "}
            <span className="text-xs">(+{targetPct}%)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-xs text-slate-400">
        <div>
          R:R <span className="text-white font-medium">{c.reward_risk}x</span>
        </div>
        <div className="text-right">
          Hold{" "}
          <span className="text-white font-medium">{c.holding_days}d max</span>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <ScoreBar value={c.scores.trend} label="Trend" />
        <ScoreBar value={c.scores.momentum} label="Momentum" />
        <ScoreBar value={c.scores.breakout} label="Breakout" />
        <ScoreBar value={c.scores.volatility} label="Volatility" />
        <ScoreBar value={c.scores.relative_strength} label="RS" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {c.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300"
          >
            {tag}
          </span>
        ))}
        <SentimentBadge sentiment={c.news_sentiment} />
      </div>

      {c.news_summary && (
        <p className="text-xs text-slate-500 mt-2">{c.news_summary}</p>
      )}
    </div>
  );
}
