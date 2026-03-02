/**
 * Dashboard cache — read/write scan results to Turso.
 * Updated for the elite signal system.
 */

import { db } from "./client";
import type { DashboardStock, DashboardResponse, Signal } from "../dashboard-types";

/** Get the latest cached scan for a universe */
export async function getLatestScan(
  universe: string
): Promise<DashboardResponse | null> {
  const dateResult = await db.execute({
    sql: "SELECT MAX(scan_date) as latest FROM dashboard_cache WHERE universe = ?",
    args: [universe],
  });

  const latest = dateResult.rows[0]?.latest as string | null;
  if (!latest) return null;

  const result = await db.execute({
    sql: "SELECT * FROM dashboard_cache WHERE universe = ? AND scan_date = ? ORDER BY signal_score DESC",
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
    signal: row.signal as Signal,
    signal_score: row.signal_score as number,
    signal_reasons: JSON.parse((row.signal_reasons as string) || "[]"),
    trend: row.trend as "BULL" | "BEAR" | "RANGE",
    trend_reasons: JSON.parse((row.trend_reasons as string) || "[]"),
    factor_trend: row.factor_trend as number,
    factor_momentum: row.factor_momentum as number,
    factor_mean_reversion: row.factor_mean_reversion as number,
    factor_volume: row.factor_volume as number,
    factor_relative_strength: row.factor_relative_strength as number,
    stop_loss: row.stop_loss as number | null,
    stop_pct: row.stop_pct as number | null,
    target_1: row.target_1 as number | null,
    target_2: row.target_2 as number | null,
    reward_risk: row.reward_risk as number | null,
    position_size_pct: row.position_size_pct as number | null,
    nearest_support: row.nearest_support as number | null,
    nearest_support_label: (row.nearest_support_label as string) ?? "",
    nearest_resistance: row.nearest_resistance as number | null,
    nearest_resistance_label: (row.nearest_resistance_label as string) ?? "",
    est_entry_date: row.est_entry_date as string | null,
    est_exit_date: row.est_exit_date as string | null,
    est_entry_price: row.est_entry_price as number | null,
    est_hold_days: row.est_hold_days as number | null,
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
  await db.execute({
    sql: "DELETE FROM dashboard_cache WHERE universe = ? AND scan_date = ?",
    args: [universe, scanDate],
  });

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
        signal, signal_score, signal_reasons,
        trend, trend_reasons,
        factor_trend, factor_momentum, factor_mean_reversion, factor_volume, factor_relative_strength,
        stop_loss, stop_pct, target_1, target_2, reward_risk, position_size_pct,
        nearest_support, nearest_support_label, nearest_resistance, nearest_resistance_label,
        est_entry_date, est_exit_date, est_entry_price, est_hold_days
      ) VALUES (${new Array(47).fill("?").join(", ")})`,
      args: [
        s.symbol, universe, scanDate, s.price, s.change_1d, s.change_5d,
        s.sma20, s.sma50, s.sma200, s.support_20d, s.resistance_20d,
        s.dist_sma20, s.dist_sma50, s.dist_sma200, s.dist_support,
        s.rsi, s.macd_hist, s.macd_signal_cross, s.vol_ratio, s.atr, s.atr_pct,
        s.rs_20d, s.rs_60d,
        s.signal, s.signal_score, JSON.stringify(s.signal_reasons),
        s.trend, JSON.stringify(s.trend_reasons),
        s.factor_trend, s.factor_momentum, s.factor_mean_reversion, s.factor_volume, s.factor_relative_strength,
        s.stop_loss, s.stop_pct, s.target_1, s.target_2, s.reward_risk, s.position_size_pct,
        s.nearest_support, s.nearest_support_label, s.nearest_resistance, s.nearest_resistance_label,
        s.est_entry_date, s.est_exit_date, s.est_entry_price, s.est_hold_days,
      ],
    }));

    await db.batch(stmts);
    written += batch.length;
  }

  await db.execute({
    sql: "DELETE FROM dashboard_cache WHERE universe = ? AND scan_date < date(?, '-7 days')",
    args: [universe, scanDate],
  });

  return written;
}
