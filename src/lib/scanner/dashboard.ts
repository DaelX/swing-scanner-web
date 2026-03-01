/**
 * Dashboard scanner — evaluates ALL stocks for proximity to buy zones.
 * Unlike the scan engine, this doesn't filter — it shows everything
 * with a "readiness" score so you can see what's approaching entry levels.
 */

import { batchGetCandles, getUniverse } from "./data";
import { computeAllIndicators, type CandleData } from "./indicators";
import type { DashboardStock } from "../dashboard-types";

function computeBuyZone(stock: Omit<DashboardStock, "buy_zone_score" | "buy_zone_label" | "buy_zone_reasons" | "nearest_support" | "nearest_support_label" | "dist_to_buy">): {
  buy_zone_score: number;
  buy_zone_label: "IN_ZONE" | "APPROACHING" | "WATCH" | "NOT_READY";
  buy_zone_reasons: string[];
  nearest_support: number | null;
  nearest_support_label: string;
  dist_to_buy: number | null;
} {
  let score = 0;
  const reasons: string[] = [];

  // 1. RSI pullback zone (30-45 = strong buy zone, 45-55 = neutral, below 30 = oversold danger)
  if (stock.rsi !== null) {
    if (stock.rsi >= 30 && stock.rsi <= 40) {
      score += 25;
      reasons.push(`RSI pullback (${stock.rsi.toFixed(0)})`);
    } else if (stock.rsi > 40 && stock.rsi <= 50) {
      score += 15;
      reasons.push(`RSI cooling (${stock.rsi.toFixed(0)})`);
    } else if (stock.rsi > 50 && stock.rsi <= 60) {
      score += 5;
    }
  }

  // 2. Near key SMA support (within 2% above or touching)
  const smaLevels: { level: number | null; label: string; weight: number }[] = [
    { level: stock.sma20, label: "SMA20", weight: 15 },
    { level: stock.sma50, label: "SMA50", weight: 20 },
    { level: stock.sma200, label: "SMA200", weight: 25 },
  ];

  for (const { level, label, weight } of smaLevels) {
    if (level === null) continue;
    const dist = ((stock.price - level) / level) * 100;
    if (dist >= -1 && dist <= 2) {
      score += weight;
      reasons.push(`At ${label} ($${level.toFixed(2)})`);
    } else if (dist > 2 && dist <= 5) {
      score += Math.round(weight * 0.4);
      reasons.push(`Near ${label} (${dist.toFixed(1)}% above)`);
    }
  }

  // 3. Volume drying up (vol_ratio < 0.7 = sellers exhausted)
  if (stock.vol_ratio !== null) {
    if (stock.vol_ratio < 0.6) {
      score += 15;
      reasons.push("Volume dry-up (sellers exhausted)");
    } else if (stock.vol_ratio < 0.8) {
      score += 8;
      reasons.push("Low volume consolidation");
    }
  }

  // 4. MACD about to cross bullish
  if (stock.macd_signal_cross === "bullish") {
    score += 15;
    reasons.push("MACD bullish crossover");
  } else if (stock.macd_hist !== null && stock.macd_hist < 0 && stock.macd_hist > -0.5) {
    score += 8;
    reasons.push("MACD nearing bullish cross");
  }

  // 5. Near 20-day support
  if (stock.dist_support !== null && stock.dist_support <= 3) {
    score += 10;
    reasons.push(`Near 20d support (${stock.dist_support.toFixed(1)}% above)`);
  }

  // 6. Relative strength still positive (pullback in a strong stock)
  if (stock.rs_20d !== null && stock.rs_20d > 0) {
    score += 5;
    reasons.push("Outperforming SPY");
  }

  // Penalize: stock in freefall (RSI < 25, big loss)
  if (stock.rsi !== null && stock.rsi < 25) {
    score -= 15;
    reasons.push("Oversold danger");
  }
  if (stock.change_5d < -10) {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  // Find nearest support level below current price
  const supports: { level: number; label: string }[] = [];
  if (stock.sma20 !== null && stock.sma20 < stock.price) supports.push({ level: stock.sma20, label: "SMA20" });
  if (stock.sma50 !== null && stock.sma50 < stock.price) supports.push({ level: stock.sma50, label: "SMA50" });
  if (stock.sma200 !== null && stock.sma200 < stock.price) supports.push({ level: stock.sma200, label: "SMA200" });
  if (stock.support_20d !== null && stock.support_20d < stock.price) supports.push({ level: stock.support_20d, label: "20d Low" });

  supports.sort((a, b) => b.level - a.level); // closest first
  const nearest = supports[0] ?? null;
  const dist_to_buy = nearest ? ((stock.price - nearest.level) / nearest.level) * 100 : null;

  let label: "IN_ZONE" | "APPROACHING" | "WATCH" | "NOT_READY";
  if (score >= 60) label = "IN_ZONE";
  else if (score >= 40) label = "APPROACHING";
  else if (score >= 20) label = "WATCH";
  else label = "NOT_READY";

  return {
    buy_zone_score: score,
    buy_zone_label: label,
    buy_zone_reasons: reasons.slice(0, 5),
    nearest_support: nearest?.level ?? null,
    nearest_support_label: nearest?.label ?? "",
    dist_to_buy,
  };
}

export async function runDashboardScan(
  universeName: string = "sp500"
): Promise<{ stocks: DashboardStock[]; totalScanned: number }> {
  const tickers = getUniverse(universeName);
  console.log(`[Dashboard] Scanning ${tickers.length} tickers in '${universeName}'`);

  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);

  const allSymbols = [...new Set([...tickers, "SPY"])];
  const allCandles = await batchGetCandles(allSymbols, start, end, 15);
  console.log(`[Dashboard] Downloaded ${allCandles.size} tickers`);

  const spyCandles = allCandles.get("SPY") ?? [];
  const spyCloses = spyCandles.map((c) => c.close);

  const stocks: DashboardStock[] = [];

  for (const symbol of tickers) {
    try {
      const candles = allCandles.get(symbol);
      if (!candles || candles.length < 60) continue;

      // Liquidity check
      const lastClose = candles[candles.length - 1].close;
      const recentVols = candles.slice(-20).map((c) => c.volume);
      const avgVol = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
      if (lastClose < 5 || avgVol < 500000) continue;

      // Align SPY
      const spyMap = new Map(spyCandles.map((c) => [c.date, c.close]));
      const alignedSpyCloses = candles.map((c) => spyMap.get(c.date) ?? 0);
      const hasSpyData = alignedSpyCloses.filter((v) => v > 0).length > 60;

      const rows = computeAllIndicators(candles, hasSpyData ? alignedSpyCloses : undefined);
      const row = rows[rows.length - 1];
      const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
      const fiveDaysAgo = rows.length >= 6 ? rows[rows.length - 6] : null;

      const change1d = prev ? ((row.close - prev.close) / prev.close) * 100 : 0;
      const change5d = fiveDaysAgo ? ((row.close - fiveDaysAgo.close) / fiveDaysAgo.close) * 100 : 0;

      // MACD cross detection
      let macdCross: "bullish" | "bearish" | "none" = "none";
      if (row.macd_hist !== null && row.macd_hist_prev !== null) {
        if (row.macd_hist > 0 && row.macd_hist_prev <= 0) macdCross = "bullish";
        else if (row.macd_hist < 0 && row.macd_hist_prev >= 0) macdCross = "bearish";
      }

      const base: Omit<DashboardStock, "buy_zone_score" | "buy_zone_label" | "buy_zone_reasons" | "nearest_support" | "nearest_support_label" | "dist_to_buy"> = {
        symbol,
        price: Math.round(row.close * 100) / 100,
        change_1d: Math.round(change1d * 100) / 100,
        change_5d: Math.round(change5d * 100) / 100,
        sma20: row.sma20 ? Math.round(row.sma20 * 100) / 100 : null,
        sma50: row.sma50 ? Math.round(row.sma50 * 100) / 100 : null,
        sma200: row.sma200 ? Math.round(row.sma200 * 100) / 100 : null,
        support_20d: row.low_20d ? Math.round(row.low_20d * 100) / 100 : null,
        resistance_20d: row.high_20d ? Math.round(row.high_20d * 100) / 100 : null,
        dist_sma20: row.sma20 ? Math.round(((row.close - row.sma20) / row.sma20) * 10000) / 100 : null,
        dist_sma50: row.sma50 ? Math.round(((row.close - row.sma50) / row.sma50) * 10000) / 100 : null,
        dist_sma200: row.sma200 ? Math.round(((row.close - row.sma200) / row.sma200) * 10000) / 100 : null,
        dist_support: row.low_20d ? Math.round(((row.close - row.low_20d) / row.low_20d) * 10000) / 100 : null,
        rsi: row.rsi ? Math.round(row.rsi * 10) / 10 : null,
        macd_hist: row.macd_hist ? Math.round(row.macd_hist * 1000) / 1000 : null,
        macd_signal_cross: macdCross,
        vol_ratio: row.vol_ratio ? Math.round(row.vol_ratio * 100) / 100 : null,
        atr: row.atr ? Math.round(row.atr * 100) / 100 : null,
        atr_pct: row.atr ? Math.round((row.atr / row.close) * 10000) / 100 : null,
        rs_20d: row.rs_20d ? Math.round(row.rs_20d * 10000) / 100 : null,
        rs_60d: row.rs_60d ? Math.round(row.rs_60d * 10000) / 100 : null,
      };

      const zone = computeBuyZone(base);
      stocks.push({ ...base, ...zone });
    } catch (err) {
      console.warn(`[Dashboard] Error on ${symbol}:`, err instanceof Error ? err.message : err);
    }
  }

  // Sort by buy_zone_score descending (most ready first)
  stocks.sort((a, b) => b.buy_zone_score - a.buy_zone_score);

  return { stocks, totalScanned: tickers.length };
}
