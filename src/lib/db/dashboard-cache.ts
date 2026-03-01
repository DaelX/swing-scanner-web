/**
 * Dashboard cache — read/write scan results to Turso.
 * The API reads from here; the cron writer populates it.
 */

import { db } from "./client";
import type { DashboardStock, DashboardResponse } from "../dashboard-types";

/** Get the latest cached scan for a universe */
export async function getLatestScan(
  universe: string
): Promise<DashboardResponse | null> {
  // Find the most recent scan_date for this universe
  const dateResult = await db.execute({
    sql: "SELECT MAX(scan_date) as latest FROM dashboard_cache WHERE universe = ?",
    args: [universe],
  });

  const latest = dateResult.rows[0]?.latest as string | null;
  if (!latest) return null;

  // Fetch all stocks from that scan
  const result = await db.execute({
    sql: "SELECT * FROM dashboard_cache WHERE universe = ? AND scan_date = ? ORDER BY buy_zone_score DESC",
    args: [universe, latest],
  });

  const stocks: DashboardStock[] = result.rows.map((row) => ({
    symbol: row.symbol as string,
    price: row.price as number,
    change_1d: row.change_1d as number,
    change_5d: row.change_5d as number,
    sma20: row.sma20 as number | null,
    sma50: row.sma50 as number | null,
    sma200: row.sma200 as number | null,
    support_20d: row.support_20d as number | null,
    resistance_20d: row.resistance_20d as number | null,
    dist_sma20: row.dist_sma20 as number | null,
    dist_sma50: row.dist_sma50 as number | null,
    dist_sma200: row.dist_sma200 as number | null,
    dist_support: row.dist_support as number | null,
    rsi: row.rsi as number | null,
    macd_hist: row.macd_hist as number | null,
    macd_signal_cross: row.macd_signal_cross as "bullish" | "bearish" | "none",
    vol_ratio: row.vol_ratio as number | null,
    atr: row.atr as number | null,
    atr_pct: row.atr_pct as number | null,
    rs_20d: row.rs_20d as number | null,
    rs_60d: row.rs_60d as number | null,
    buy_zone_score: row.buy_zone_score as number,
    buy_zone_label: row.buy_zone_label as DashboardStock["buy_zone_label"],
    buy_zone_reasons: JSON.parse((row.buy_zone_reasons as string) || "[]"),
    nearest_support: row.nearest_support as number | null,
    nearest_support_label: row.nearest_support_label as string,
    dist_to_buy: row.dist_to_buy as number | null,
  }));

  return {
    scan_date: latest,
    universe,
    total_scanned: stocks.length,
    stocks,
  };
}

/** Write a batch of scan results to cache */
export async function writeScanCache(
  universe: string,
  scanDate: string,
  stocks: DashboardStock[]
): Promise<number> {
  // Delete old data for this universe+date (upsert)
  await db.execute({
    sql: "DELETE FROM dashboard_cache WHERE universe = ? AND scan_date = ?",
    args: [universe, scanDate],
  });

  // Insert in batches of 50 (Turso has a limit on batch size)
  const BATCH_SIZE = 50;
  let written = 0;

  for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
    const batch = stocks.slice(i, i + BATCH_SIZE);
    const stmts = batch.map((s) => ({
      sql: `INSERT INTO dashboard_cache (
        symbol, universe, scan_date, price, change_1d, change_5d,
        sma20, sma50, sma200, support_20d, resistance_20d,
        dist_sma20, dist_sma50, dist_sma200, dist_support,
        rsi, macd_hist, macd_signal_cross, vol_ratio, atr, atr_pct,
        rs_20d, rs_60d,
        buy_zone_score, buy_zone_label, buy_zone_reasons,
        nearest_support, nearest_support_label, dist_to_buy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        s.symbol, universe, scanDate, s.price, s.change_1d, s.change_5d,
        s.sma20, s.sma50, s.sma200, s.support_20d, s.resistance_20d,
        s.dist_sma20, s.dist_sma50, s.dist_sma200, s.dist_support,
        s.rsi, s.macd_hist, s.macd_signal_cross, s.vol_ratio, s.atr, s.atr_pct,
        s.rs_20d, s.rs_60d,
        s.buy_zone_score, s.buy_zone_label, JSON.stringify(s.buy_zone_reasons),
        s.nearest_support, s.nearest_support_label, s.dist_to_buy,
      ],
    }));

    await db.batch(stmts);
    written += batch.length;
  }

  // Clean up old scans (keep last 7 days)
  await db.execute({
    sql: "DELETE FROM dashboard_cache WHERE universe = ? AND scan_date < date(?, '-7 days')",
    args: [universe, scanDate],
  });

  return written;
}
