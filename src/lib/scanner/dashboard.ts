/**
 * ELITE STRATEGY ENGINE — DaelX Stocks Trading
 *
 * Multi-factor institutional signal system modeled after quant desks.
 *
 * Architecture:
 *   1. TREND REGIME  — Determine macro context (Bull / Bear / Range)
 *   2. FACTOR SCORING — 5 orthogonal factors scored -100 to +100
 *   3. SIGNAL BLEND   — Weighted composite → STRONG BUY / BUY / HOLD / SELL / STRONG SELL
 *   4. RISK MGMT      — ATR-based stops, targets, position sizing
 *
 * Factor weights (institutional standard):
 *   Trend:             30%  — "the trend is your friend"
 *   Momentum:          25%  — MACD, RSI direction, rate-of-change
 *   Mean Reversion:    20%  — oversold bounces, overbought fades at key levels
 *   Volume:            15%  — smart money accumulation / distribution
 *   Relative Strength: 10%  — vs SPY, outperformers vs laggards
 */

import { batchGetCandles, getUniverse } from "./data";
import { computeAllIndicators, type CandleData, type IndicatorRow } from "./indicators";
import type { DashboardStock, Signal } from "../dashboard-types";

// ─── Factor Weights ───
const W_TREND = 0.30;
const W_MOMENTUM = 0.25;
const W_MEAN_REV = 0.20;
const W_VOLUME = 0.15;
const W_RS = 0.10;

// ─── Helpers ───
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function round2(v: number) { return Math.round(v * 100) / 100; }
function round1(v: number) { return Math.round(v * 10) / 10; }
function pctDist(price: number, level: number) { return ((price - level) / level) * 100; }

function addBizDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

// ═══════════════════════════════════════════════════════
// 1. TREND REGIME DETECTION
// ═══════════════════════════════════════════════════════
function detectTrend(row: IndicatorRow, prev5: IndicatorRow | null): {
  trend: "BULL" | "BEAR" | "RANGE";
  reasons: string[];
  factor: number; // -100 to +100
} {
  let score = 0;
  const reasons: string[] = [];

  // SMA stack alignment (Golden: 20>50>200, Death: 200>50>20)
  if (row.sma20 && row.sma50 && row.sma200) {
    if (row.sma20 > row.sma50 && row.sma50 > row.sma200) {
      score += 35;
      reasons.push("Golden alignment (SMA20>50>200)");
    } else if (row.sma20 < row.sma50 && row.sma50 < row.sma200) {
      score -= 35;
      reasons.push("Death alignment (SMA200>50>20)");
    } else {
      // Mixed — partial credit
      if (row.sma20 > row.sma50) { score += 10; }
      else { score -= 10; }
      if (row.sma50 > row.sma200) { score += 10; }
      else { score -= 10; }
    }
  }

  // Price vs SMA200 (above = bullish macro, below = bearish)
  if (row.sma200) {
    const dist200 = pctDist(row.close, row.sma200);
    if (dist200 > 5) { score += 25; reasons.push(`Price ${round1(dist200)}% above SMA200`); }
    else if (dist200 > 0) { score += 10; }
    else if (dist200 > -5) { score -= 10; }
    else { score -= 25; reasons.push(`Price ${round1(Math.abs(dist200))}% below SMA200`); }
  }

  // SMA20 slope (direction of short-term trend)
  if (row.sma20_slope !== null) {
    const slopeNorm = row.sma20 ? (row.sma20_slope / row.sma20) * 1000 : 0;
    if (slopeNorm > 2) { score += 20; reasons.push("SMA20 rising sharply"); }
    else if (slopeNorm > 0.5) { score += 10; }
    else if (slopeNorm < -2) { score -= 20; reasons.push("SMA20 falling sharply"); }
    else if (slopeNorm < -0.5) { score -= 10; }
  }

  // 5-day price momentum (short-term direction)
  if (prev5) {
    const change5d = pctDist(row.close, prev5.close);
    if (change5d > 3) { score += 20; }
    else if (change5d > 0) { score += 5; }
    else if (change5d < -3) { score -= 20; }
    else { score -= 5; }
  }

  score = clamp(score, -100, 100);

  let trend: "BULL" | "BEAR" | "RANGE";
  if (score >= 25) trend = "BULL";
  else if (score <= -25) trend = "BEAR";
  else trend = "RANGE";

  return { trend, reasons, factor: score };
}

// ═══════════════════════════════════════════════════════
// 2. MOMENTUM FACTOR
// ═══════════════════════════════════════════════════════
function scoreMomentum(row: IndicatorRow, prev: IndicatorRow | null): {
  factor: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // RSI momentum direction
  if (row.rsi !== null) {
    if (row.rsi >= 50 && row.rsi <= 70) {
      score += 25; // bullish momentum, not overbought
      reasons.push(`RSI bullish (${round1(row.rsi)})`);
    } else if (row.rsi > 70) {
      score += 10; // strong but extended
      reasons.push(`RSI extended (${round1(row.rsi)})`);
    } else if (row.rsi >= 30 && row.rsi < 50) {
      score -= 15;
      reasons.push(`RSI bearish (${round1(row.rsi)})`);
    } else if (row.rsi < 30) {
      score -= 25;
      reasons.push(`RSI oversold (${round1(row.rsi)})`);
    }

    // RSI improving vs deteriorating
    if (prev?.rsi !== null && prev?.rsi !== undefined && row.rsi !== null) {
      const rsiDelta = row.rsi - prev.rsi;
      if (rsiDelta > 3) { score += 10; reasons.push("RSI accelerating"); }
      else if (rsiDelta < -3) { score -= 10; reasons.push("RSI decelerating"); }
    }
  }

  // MACD histogram direction + crossover
  if (row.macd_hist !== null) {
    if (row.macd_hist > 0) {
      score += 15;
      if (row.macd_hist_prev !== null && row.macd_hist_prev <= 0) {
        score += 20;
        reasons.push("MACD bullish crossover");
      } else if (row.macd_hist_prev !== null && row.macd_hist > row.macd_hist_prev) {
        score += 5;
        reasons.push("MACD histogram expanding");
      }
    } else {
      score -= 15;
      if (row.macd_hist_prev !== null && row.macd_hist_prev >= 0) {
        score -= 20;
        reasons.push("MACD bearish crossover");
      } else if (row.macd_hist_prev !== null && row.macd_hist < row.macd_hist_prev) {
        score -= 5;
        reasons.push("MACD histogram declining");
      }
    }
  }

  return { factor: clamp(score, -100, 100), reasons };
}

// ═══════════════════════════════════════════════════════
// 3. MEAN REVERSION FACTOR
// ═══════════════════════════════════════════════════════
function scoreMeanReversion(row: IndicatorRow, trend: "BULL" | "BEAR" | "RANGE"): {
  factor: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // Oversold at support in uptrend = BUY (mean reversion long)
  // Overbought at resistance in downtrend = SELL (mean reversion short)

  if (row.rsi !== null) {
    // Oversold bounce setup (RSI 25-40 near support)
    if (row.rsi <= 35 && row.low_20d) {
      const distToSupport = pctDist(row.close, row.low_20d);
      if (distToSupport <= 3) {
        // In uptrend: strong buy signal. In downtrend: weak/neutral.
        const mult = trend === "BULL" ? 1.0 : trend === "RANGE" ? 0.6 : 0.2;
        score += Math.round(40 * mult);
        reasons.push(`Oversold at support (RSI ${round1(row.rsi)}, ${round1(distToSupport)}% from 20d low)`);
      }
    }

    // Overbought fade setup (RSI 65+ near resistance)
    if (row.rsi >= 65 && row.high_20d) {
      const distToResist = pctDist(row.close, row.high_20d);
      if (distToResist >= -2) {
        const mult = trend === "BEAR" ? 1.0 : trend === "RANGE" ? 0.6 : 0.3;
        score -= Math.round(40 * mult);
        reasons.push(`Overbought at resistance (RSI ${round1(row.rsi)}, near 20d high)`);
      }
    }
  }

  // Price near SMA support/resistance
  const smaLevels = [
    { level: row.sma20, label: "SMA20" },
    { level: row.sma50, label: "SMA50" },
    { level: row.sma200, label: "SMA200" },
  ];

  for (const { level, label } of smaLevels) {
    if (!level) continue;
    const dist = pctDist(row.close, level);
    // Touching SMA from above in uptrend = buy (bounce)
    if (dist >= -1 && dist <= 2 && trend === "BULL") {
      score += 20;
      reasons.push(`Pullback to ${label} in uptrend`);
      break; // only count the most relevant one
    }
    // Touching SMA from below in downtrend = sell (rejection)
    if (dist >= -2 && dist <= 1 && trend === "BEAR") {
      score -= 20;
      reasons.push(`Rejection at ${label} in downtrend`);
      break;
    }
  }

  return { factor: clamp(score, -100, 100), reasons };
}

// ═══════════════════════════════════════════════════════
// 4. VOLUME FACTOR
// ═══════════════════════════════════════════════════════
function scoreVolume(row: IndicatorRow, change1d: number): {
  factor: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  if (row.vol_ratio === null) return { factor: 0, reasons: [] };

  // Volume confirmation: up day on high volume = bullish accumulation
  if (change1d > 0.5 && row.vol_ratio > 1.5) {
    score += 40;
    reasons.push(`Accumulation day (${round1(row.vol_ratio)}x vol on up day)`);
  } else if (change1d > 0.5 && row.vol_ratio > 1.2) {
    score += 20;
    reasons.push("Moderate buying pressure");
  }

  // Down day on high volume = bearish distribution
  if (change1d < -0.5 && row.vol_ratio > 1.5) {
    score -= 40;
    reasons.push(`Distribution day (${round1(row.vol_ratio)}x vol on down day)`);
  } else if (change1d < -0.5 && row.vol_ratio > 1.2) {
    score -= 20;
    reasons.push("Moderate selling pressure");
  }

  // Volume dry-up (consolidation) — slightly bullish if in uptrend
  if (row.vol_ratio < 0.6) {
    score += 10;
    reasons.push("Volume dry-up (consolidation)");
  }

  // Down day on LOW volume = sellers exhausted (bullish)
  if (change1d < -0.3 && row.vol_ratio < 0.7) {
    score += 15;
    reasons.push("Weak selling (low vol decline)");
  }

  // Up day on LOW volume = weak buying (bearish divergence)
  if (change1d > 0.3 && row.vol_ratio < 0.6) {
    score -= 10;
    reasons.push("Weak buying (low vol rally)");
  }

  return { factor: clamp(score, -100, 100), reasons };
}

// ═══════════════════════════════════════════════════════
// 5. RELATIVE STRENGTH FACTOR
// ═══════════════════════════════════════════════════════
function scoreRelativeStrength(row: IndicatorRow): {
  factor: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // 20-day RS vs SPY
  if (row.rs_20d !== null) {
    const rs = row.rs_20d * 100; // convert to %
    if (rs > 5) {
      score += 40;
      reasons.push(`Strong vs SPY 20d (+${round1(rs)}%)`);
    } else if (rs > 2) {
      score += 20;
      reasons.push(`Outperforming SPY 20d (+${round1(rs)}%)`);
    } else if (rs < -5) {
      score -= 40;
      reasons.push(`Weak vs SPY 20d (${round1(rs)}%)`);
    } else if (rs < -2) {
      score -= 20;
      reasons.push(`Underperforming SPY 20d (${round1(rs)}%)`);
    }
  }

  // 60-day RS (longer-term confirmation)
  if (row.rs_60d !== null) {
    const rs = row.rs_60d * 100;
    if (rs > 5) { score += 30; }
    else if (rs > 0) { score += 10; }
    else if (rs < -5) { score -= 30; }
    else { score -= 10; }
  }

  // Both timeframes agreeing = extra conviction
  if (row.rs_20d !== null && row.rs_60d !== null) {
    if (row.rs_20d > 0 && row.rs_60d > 0) {
      score += 10;
      reasons.push("RS confirmation (both timeframes bullish)");
    } else if (row.rs_20d < 0 && row.rs_60d < 0) {
      score -= 10;
      reasons.push("RS confirmation (both timeframes bearish)");
    }
  }

  return { factor: clamp(score, -100, 100), reasons };
}

// ═══════════════════════════════════════════════════════
// 6. SIGNAL BLENDING & RISK MANAGEMENT
// ═══════════════════════════════════════════════════════
type ComputedFields = Omit<DashboardStock,
  "symbol" | "price" | "change_1d" | "change_5d" |
  "sma20" | "sma50" | "sma200" | "support_20d" | "resistance_20d" |
  "dist_sma20" | "dist_sma50" | "dist_sma200" | "dist_support" |
  "rsi" | "macd_hist" | "macd_signal_cross" | "vol_ratio" | "atr" | "atr_pct" |
  "rs_20d" | "rs_60d"
>;

function computeSignal(
  row: IndicatorRow,
  prev: IndicatorRow | null,
  prev5: IndicatorRow | null,
  change1d: number,
  price: number,
): ComputedFields {
  // 1. Detect trend
  const { trend, reasons: trendReasons, factor: factorTrend } = detectTrend(row, prev5);

  // 2. Score each factor
  const { factor: factorMom, reasons: momReasons } = scoreMomentum(row, prev);
  const { factor: factorMR, reasons: mrReasons } = scoreMeanReversion(row, trend);
  const { factor: factorVol, reasons: volReasons } = scoreVolume(row, change1d);
  const { factor: factorRS, reasons: rsReasons } = scoreRelativeStrength(row);

  // 3. Weighted composite
  const composite = Math.round(
    factorTrend * W_TREND +
    factorMom * W_MOMENTUM +
    factorMR * W_MEAN_REV +
    factorVol * W_VOLUME +
    factorRS * W_RS
  );

  const signalScore = clamp(composite, -100, 100);

  // 4. Map to signal
  let signal: Signal;
  if (signalScore >= 50) signal = "STRONG_BUY";
  else if (signalScore >= 20) signal = "BUY";
  else if (signalScore >= -20) signal = "HOLD";
  else if (signalScore >= -50) signal = "SELL";
  else signal = "STRONG_SELL";

  // Collect all reasons, sorted by factor weight
  const allReasons = [
    ...trendReasons,
    ...momReasons,
    ...mrReasons,
    ...volReasons,
    ...rsReasons,
  ].slice(0, 8);

  // 5. Support / Resistance levels
  const supports: { level: number; label: string }[] = [];
  if (row.sma20 && row.sma20 < price) supports.push({ level: row.sma20, label: "SMA20" });
  if (row.sma50 && row.sma50 < price) supports.push({ level: row.sma50, label: "SMA50" });
  if (row.sma200 && row.sma200 < price) supports.push({ level: row.sma200, label: "SMA200" });
  if (row.low_20d && row.low_20d < price) supports.push({ level: row.low_20d, label: "20d Low" });
  supports.sort((a, b) => b.level - a.level);
  const nearSupport = supports[0] ?? null;

  const resistances: { level: number; label: string }[] = [];
  if (row.sma20 && row.sma20 > price) resistances.push({ level: row.sma20, label: "SMA20" });
  if (row.sma50 && row.sma50 > price) resistances.push({ level: row.sma50, label: "SMA50" });
  if (row.sma200 && row.sma200 > price) resistances.push({ level: row.sma200, label: "SMA200" });
  if (row.high_20d && row.high_20d > price) resistances.push({ level: row.high_20d, label: "20d High" });
  resistances.sort((a, b) => a.level - b.level);
  const nearResist = resistances[0] ?? null;

  // 6. Risk management — ATR-based
  let stop_loss: number | null = null;
  let stop_pct: number | null = null;
  let target_1: number | null = null;
  let target_2: number | null = null;
  let reward_risk: number | null = null;
  let position_size_pct: number | null = null;

  if (row.atr && row.atr > 0) {
    if (signal === "STRONG_BUY" || signal === "BUY") {
      // Stop = nearest support or 1.5 ATR below entry, whichever is tighter
      const atrStop = price - row.atr * 1.5;
      stop_loss = nearSupport ? round2(Math.max(nearSupport.level * 0.995, atrStop)) : round2(atrStop);
      const risk = price - stop_loss;
      stop_pct = round2((risk / price) * 100);

      // Targets: 2R and 3R from entry
      target_1 = round2(price + risk * 2);
      target_2 = round2(price + risk * 3);
      reward_risk = risk > 0 ? round1((target_1 - price) / risk) : null;
    } else if (signal === "SELL" || signal === "STRONG_SELL") {
      // For short: stop above resistance or 1.5 ATR above
      const atrStop = price + row.atr * 1.5;
      stop_loss = nearResist ? round2(Math.min(nearResist.level * 1.005, atrStop)) : round2(atrStop);
      const risk = stop_loss - price;
      stop_pct = round2((risk / price) * 100);

      target_1 = round2(price - risk * 2);
      target_2 = round2(price - risk * 3);
      reward_risk = risk > 0 ? round1((price - target_1) / risk) : null;
    }

    // Volatility-based position sizing (risk 1% of portfolio per trade)
    // position_size = (portfolio_risk / trade_risk)
    // If ATR% = 2%, and we risk 1.5 ATR = 3% of price
    // Position = 1% / 3% = 33% of portfolio
    const atrPct = (row.atr / price) * 100;
    const tradeRisk = atrPct * 1.5;
    position_size_pct = tradeRisk > 0 ? round1(Math.min(25, 1 / (tradeRisk / 100))) : null;
  }

  // 7. Trade timing estimates
  const today = new Date();
  let est_entry_date: string | null = null;
  let est_exit_date: string | null = null;
  let est_entry_price: number | null = null;
  let est_hold_days: number | null = null;

  if (signal === "STRONG_BUY" || signal === "BUY") {
    est_entry_date = today.toISOString().slice(0, 10);
    est_entry_price = round2(price);
    est_hold_days = signal === "STRONG_BUY" ? 15 : 10;
    est_exit_date = addBizDays(today, est_hold_days).toISOString().slice(0, 10);
  } else if (signal === "SELL" || signal === "STRONG_SELL") {
    est_entry_date = today.toISOString().slice(0, 10);
    est_entry_price = round2(price);
    est_hold_days = signal === "STRONG_SELL" ? 15 : 10;
    est_exit_date = addBizDays(today, est_hold_days).toISOString().slice(0, 10);
  }

  return {
    signal,
    signal_score: signalScore,
    signal_reasons: allReasons,
    trend,
    trend_reasons: trendReasons,
    factor_trend: factorTrend,
    factor_momentum: factorMom,
    factor_mean_reversion: factorMR,
    factor_volume: factorVol,
    factor_relative_strength: factorRS,
    stop_loss,
    stop_pct,
    target_1,
    target_2,
    reward_risk,
    position_size_pct,
    nearest_support: nearSupport ? round2(nearSupport.level) : null,
    nearest_support_label: nearSupport?.label ?? "",
    nearest_resistance: nearResist ? round2(nearResist.level) : null,
    nearest_resistance_label: nearResist?.label ?? "",
    est_entry_date,
    est_exit_date,
    est_entry_price,
    est_hold_days,
  };
}

// ═══════════════════════════════════════════════════════
// MAIN SCANNER
// ═══════════════════════════════════════════════════════
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

  const stocks: DashboardStock[] = [];

  for (const symbol of tickers) {
    try {
      const candles = allCandles.get(symbol);
      if (!candles || candles.length < 60) continue;

      const lastClose = candles[candles.length - 1].close;
      const recentVols = candles.slice(-20).map((c) => c.volume);
      const avgVol = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
      if (lastClose < 5 || avgVol < 500000) continue;

      const spyMap = new Map(spyCandles.map((c) => [c.date, c.close]));
      const alignedSpyCloses = candles.map((c) => spyMap.get(c.date) ?? 0);
      const hasSpyData = alignedSpyCloses.filter((v) => v > 0).length > 60;

      const rows = computeAllIndicators(candles, hasSpyData ? alignedSpyCloses : undefined);
      const row = rows[rows.length - 1];
      const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
      const prev5 = rows.length >= 6 ? rows[rows.length - 6] : null;

      const change1d = prev ? pctDist(row.close, prev.close) : 0;
      const change5d = prev5 ? pctDist(row.close, prev5.close) : 0;

      let macdCross: "bullish" | "bearish" | "none" = "none";
      if (row.macd_hist !== null && row.macd_hist_prev !== null) {
        if (row.macd_hist > 0 && row.macd_hist_prev <= 0) macdCross = "bullish";
        else if (row.macd_hist < 0 && row.macd_hist_prev >= 0) macdCross = "bearish";
      }

      const computed = computeSignal(row, prev, prev5, change1d, row.close);

      const stock: DashboardStock = {
        symbol,
        price: round2(row.close),
        change_1d: round2(change1d),
        change_5d: round2(change5d),
        sma20: row.sma20 ? round2(row.sma20) : null,
        sma50: row.sma50 ? round2(row.sma50) : null,
        sma200: row.sma200 ? round2(row.sma200) : null,
        support_20d: row.low_20d ? round2(row.low_20d) : null,
        resistance_20d: row.high_20d ? round2(row.high_20d) : null,
        dist_sma20: row.sma20 ? round2(pctDist(row.close, row.sma20)) : null,
        dist_sma50: row.sma50 ? round2(pctDist(row.close, row.sma50)) : null,
        dist_sma200: row.sma200 ? round2(pctDist(row.close, row.sma200)) : null,
        dist_support: row.low_20d ? round2(pctDist(row.close, row.low_20d)) : null,
        rsi: row.rsi ? round1(row.rsi) : null,
        macd_hist: row.macd_hist ? Math.round(row.macd_hist * 1000) / 1000 : null,
        macd_signal_cross: macdCross,
        vol_ratio: row.vol_ratio ? round2(row.vol_ratio) : null,
        atr: row.atr ? round2(row.atr) : null,
        atr_pct: row.atr ? round2((row.atr / row.close) * 100) : null,
        rs_20d: row.rs_20d ? round2(row.rs_20d * 100) : null,
        rs_60d: row.rs_60d ? round2(row.rs_60d * 100) : null,
        ...computed,
      };

      stocks.push(stock);
    } catch (err) {
      console.warn(`[Dashboard] Error on ${symbol}:`, err instanceof Error ? err.message : err);
    }
  }

  // Sort by signal_score descending (strongest buys first)
  stocks.sort((a, b) => b.signal_score - a.signal_score);

  return { stocks, totalScanned: tickers.length };
}
