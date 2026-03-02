/**
 * Scanner cache — read/write scan candidates to Turso.
 */

import { db } from "./client";
import type { ScanCandidate } from "../scanner/ranker";

export interface ScannerCacheResponse {
  disclaimer: string;
  scan_date: string;
  universe: string;
  total_scanned: number;
  candidates: ScanCandidate[];
}

const DISCLAIMER =
  "DISCLAIMER: This is a probability scanner for research/educational purposes only. It is NOT financial advice. Past performance does not guarantee future results. Always do your own due diligence.";

/** Get the latest cached scanner results for a universe */
export async function getLatestScannerResults(
  universe: string,
  topN: number = 10
): Promise<ScannerCacheResponse | null> {
  const dateResult = await db.execute({
    sql: "SELECT MAX(scan_date) as latest FROM scanner_cache WHERE universe = ?",
    args: [universe],
  });

  const latest = dateResult.rows[0]?.latest as string | null;
  if (!latest) return null;

  const result = await db.execute({
    sql: "SELECT * FROM scanner_cache WHERE universe = ? AND scan_date = ? ORDER BY rank ASC LIMIT ?",
    args: [universe, latest, topN],
  });

  const candidates: ScanCandidate[] = result.rows.map((row) => ({
    rank: row.rank as number,
    symbol: row.symbol as string,
    score: row.score as number,
    date: row.date as string,
    entry: row.entry as number,
    stop_loss: row.stop_loss as number,
    target: row.target as number,
    reward_risk: row.reward_risk as number,
    holding_days: row.holding_days as number,
    tags: JSON.parse((row.tags as string) || "[]"),
    reason: row.reason as string,
    news_sentiment: row.news_sentiment as string,
    news_summary: row.news_summary as string,
    risk_flags: JSON.parse((row.risk_flags as string) || "[]"),
    scores: {
      trend: row.score_trend as number,
      momentum: row.score_momentum as number,
      breakout: row.score_breakout as number,
      volatility: row.score_volatility as number,
      relative_strength: row.score_relative_strength as number,
    },
  }));

  // Get total scanned count from any scan
  const countResult = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM scanner_cache WHERE universe = ? AND scan_date = ?",
    args: [universe, latest],
  });
  const totalInCache = countResult.rows[0]?.cnt as number;

  return {
    disclaimer: DISCLAIMER,
    scan_date: latest,
    universe,
    total_scanned: totalInCache,
    candidates,
  };
}

/** Write scanner candidates to cache */
export async function writeScannerCache(
  universe: string,
  scanDate: string,
  candidates: ScanCandidate[],
  totalScanned: number
): Promise<number> {
  await db.execute({
    sql: "DELETE FROM scanner_cache WHERE universe = ? AND scan_date = ?",
    args: [universe, scanDate],
  });

  if (candidates.length === 0) return 0;

  const stmts = candidates.map((c) => ({
    sql: `INSERT INTO scanner_cache (
      rank, symbol, universe, scan_date, score, date,
      entry, stop_loss, target, reward_risk, holding_days,
      tags, reason, news_sentiment, news_summary, risk_flags,
      score_trend, score_momentum, score_breakout, score_volatility, score_relative_strength
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      c.rank, c.symbol, universe, scanDate, c.score, c.date,
      c.entry, c.stop_loss, c.target, c.reward_risk, c.holding_days,
      JSON.stringify(c.tags), c.reason, c.news_sentiment, c.news_summary, JSON.stringify(c.risk_flags),
      c.scores.trend, c.scores.momentum, c.scores.breakout, c.scores.volatility, c.scores.relative_strength,
    ],
  }));

  await db.batch(stmts);

  // Clean up old scans
  await db.execute({
    sql: "DELETE FROM scanner_cache WHERE universe = ? AND scan_date < date(?, '-7 days')",
    args: [universe, scanDate],
  });

  return candidates.length;
}
