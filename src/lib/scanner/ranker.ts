/**
 * Ranking engine — orchestrates the full scan pipeline.
 * Fetches data → computes indicators → scores signals → ranks top N.
 */

import { getCandles, batchGetCandles, getUniverse } from "./data";
import { computeAllIndicators, type CandleData } from "./indicators";
import { evaluateTicker, type SignalResult } from "./signals";

export interface ScanCandidate {
  rank: number;
  symbol: string;
  score: number;
  date: string;
  entry: number;
  stop_loss: number;
  target: number;
  reward_risk: number;
  holding_days: number;
  tags: string[];
  reason: string;
  news_sentiment: string;
  news_summary: string;
  risk_flags: string[];
  scores: {
    trend: number;
    momentum: number;
    breakout: number;
    volatility: number;
    relative_strength: number;
  };
}

export async function runScan(
  universeName: string = "sp500",
  topN: number = 10
): Promise<{ candidates: ScanCandidate[]; totalScanned: number }> {
  const tickers = getUniverse(universeName);
  console.log(`Scanning ${tickers.length} tickers in '${universeName}'`);

  // Date range: 1 year lookback
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);

  // Batch download all tickers + SPY
  const allSymbols = [...new Set([...tickers, "SPY"])];
  console.log(`Batch downloading ${allSymbols.length} tickers...`);
  const allCandles = await batchGetCandles(allSymbols, start, end, 15);
  console.log(`Downloaded ${allCandles.size} tickers successfully`);

  const spyCandles = allCandles.get("SPY") ?? [];
  const spyCloses = spyCandles.map((c) => c.close);

  // Evaluate each ticker
  const scored: (SignalResult & { finalScore: number })[] = [];

  for (const symbol of tickers) {
    try {
      const candles = allCandles.get(symbol);
      if (!candles || candles.length < 60) continue;

      // Liquidity check
      const lastClose = candles[candles.length - 1].close;
      const recentVols = candles.slice(-20).map((c) => c.volume);
      const avgVol = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
      if (lastClose < 5 || avgVol < 500000) continue;

      // Align SPY closes with ticker dates
      const spyMap = new Map(spyCandles.map((c) => [c.date, c.close]));
      const alignedSpyCloses = candles.map((c) => spyMap.get(c.date) ?? 0);
      const hasSpyData = alignedSpyCloses.filter((v) => v > 0).length > 60;

      const rows = computeAllIndicators(
        candles,
        hasSpyData ? alignedSpyCloses : undefined
      );

      const signal = evaluateTicker(rows, symbol);
      if (!signal) continue;

      scored.push({ ...signal, finalScore: signal.composite_score });
    } catch (err) {
      console.warn(`Error scanning ${symbol}:`, err instanceof Error ? err.message : err);
    }
  }

  // Sort by score descending and take top N
  scored.sort((a, b) => b.finalScore - a.finalScore);
  const top = scored.slice(0, topN);

  const candidates: ScanCandidate[] = top.map((s, i) => ({
    rank: i + 1,
    symbol: s.symbol,
    score: s.finalScore,
    date: s.date,
    entry: s.entry_price,
    stop_loss: s.stop_loss,
    target: s.target_price,
    reward_risk: s.reward_risk,
    holding_days: s.holding_days,
    tags: s.tags,
    reason: s.reason,
    news_sentiment: "neutral", // News layer not ported for MVP
    news_summary: "",
    risk_flags: [],
    scores: {
      trend: s.trend_score,
      momentum: s.momentum_score,
      breakout: s.breakout_score,
      volatility: s.volatility_score,
      relative_strength: s.relative_strength_score,
    },
  }));

  return { candidates, totalScanned: tickers.length };
}
