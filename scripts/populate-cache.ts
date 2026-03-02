/**
 * Cache writer — fetches stock data from Yahoo Finance (runs locally where
 * Yahoo isn't blocked) and writes results to Turso DB.
 *
 * Usage:
 *   npx tsx scripts/populate-cache.ts [universe]
 *
 * Environment:
 *   TURSO_DATABASE_URL  — libsql://swing-scanner-daelx.aws-us-east-1.turso.io
 *   TURSO_AUTH_TOKEN    — your Turso DB auth token
 */

import { createClient } from "@libsql/client";
import { runDashboardScan } from "../src/lib/scanner/dashboard";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN env vars");
  process.exit(1);
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function writeBatch(universe: string, scanDate: string, stocks: any[]) {
  await db.execute({
    sql: "DELETE FROM dashboard_cache WHERE universe = ? AND scan_date = ?",
    args: [universe, scanDate],
  });

  const BATCH_SIZE = 50;
  let written = 0;

  for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
    const batch = stocks.slice(i, i + BATCH_SIZE);
    const stmts = batch.map((s: any) => ({
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
    process.stdout.write(`\r    ${written}/${stocks.length} stocks...`);
  }

  await db.execute({
    sql: "DELETE FROM dashboard_cache WHERE universe = ? AND scan_date < date(?, '-7 days')",
    args: [universe, scanDate],
  });

  return written;
}

async function main() {
  const universes = process.argv[2] ? [process.argv[2]] : ["sp500", "nasdaq100", "watchlist"];
  const scanDate = new Date().toISOString().slice(0, 10);

  console.log(`\n⚡ DaelX Elite Strategy — Cache Writer — ${scanDate}`);
  console.log(`Universes: ${universes.join(", ")}\n`);

  for (const universe of universes) {
    console.log(`📊 Scanning ${universe}...`);
    const startTime = Date.now();

    try {
      const { stocks, totalScanned } = await runDashboardScan(universe);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      const buys = stocks.filter(s => s.signal === "STRONG_BUY" || s.signal === "BUY").length;
      const sells = stocks.filter(s => s.signal === "STRONG_SELL" || s.signal === "SELL").length;
      const holds = stocks.filter(s => s.signal === "HOLD").length;

      console.log(`\n  Scanned ${totalScanned} tickers in ${elapsed}s → ${stocks.length} results`);
      console.log(`  Signals: ${buys} BUY | ${holds} HOLD | ${sells} SELL`);

      if (stocks.length > 0) {
        const written = await writeBatch(universe, scanDate, stocks);
        console.log(`\n  ✅ ${written} stocks cached`);
      }
    } catch (err) {
      console.error(`  ❌ Error scanning ${universe}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\n🏁 Done!\n");
  process.exit(0);
}

main();
