/**
 * Signal scoring engine — evaluates each ticker and produces a composite score.
 * TypeScript port of the Python engine.
 */

import type { IndicatorRow } from "./indicators";

export interface SignalResult {
  symbol: string;
  date: string;
  composite_score: number;
  trend_score: number;
  momentum_score: number;
  breakout_score: number;
  volatility_score: number;
  relative_strength_score: number;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  reward_risk: number;
  tags: string[];
  reason: string;
  holding_days: number;
}

function scoreTrend(row: IndicatorRow): number {
  if (row.sma20 === null || row.sma50 === null) return 0;
  let score = 0;
  if (row.close > row.sma20) score += 40;
  if (row.sma20 > row.sma50) score += 30;
  if ((row.sma20_slope ?? 0) > 0) score += 30;
  return Math.min(score, 100);
}

function scoreMomentum(row: IndicatorRow): number {
  const rsiVal = row.rsi;
  if (rsiVal === null) return 0;

  let score = 0;
  if (rsiVal >= 50 && rsiVal <= 70) score += 50;
  else if (rsiVal >= 40 && rsiVal < 50) score += 20;
  else if (rsiVal > 70) score += 10;

  const hist = row.macd_hist;
  const histPrev = row.macd_hist_prev;
  if (hist !== null && histPrev !== null) {
    if (hist > 0 && histPrev <= 0) score += 50; // fresh crossover
    else if (hist > 0 && hist > histPrev) score += 30; // accelerating
    else if (hist > 0) score += 15;
  }

  return Math.min(score, 100);
}

function scoreBreakout(row: IndicatorRow): number {
  if (row.high_20d === null || row.vol_ratio === null) return 0;

  let score = 0;
  if (row.close >= row.high_20d) score += 50;
  else if (row.close >= row.high_20d * 0.99) score += 25;

  const vr = row.vol_ratio;
  if (vr >= 1.8) score += 50;
  else if (vr >= 1.5) score += 35;
  else if (vr >= 1.0) score += 15;

  return Math.min(score, 100);
}

function scoreVolatility(row: IndicatorRow): number {
  if (row.atr === null || row.atr <= 0) return 0;

  const stopDistance = row.atr * 1.5;
  const targetDistance = row.close * 0.03;
  const rr = stopDistance > 0 ? targetDistance / stopDistance : 0;

  let score = 0;
  if (rr >= 1.8) score += 60;
  else if (rr >= 1.2) score += 40;
  else if (rr >= 1.0) score += 20;

  const atrPct = row.atr / row.close;
  if (atrPct > 0.05) score -= 20;
  if (atrPct >= 0.01 && atrPct <= 0.04) score += 40;

  return Math.max(Math.min(score, 100), 0);
}

function scoreRelativeStrength(row: IndicatorRow): number {
  const rsShort = row.rs_20d;
  const rsLong = row.rs_60d;
  if (rsShort === null || rsLong === null) return 0;

  let score = 0;
  if (rsShort > 0) score += 50;
  if (rsLong > 0) score += 30;
  if (rsShort > 0.02) score += 20;

  return Math.min(score, 100);
}

export function evaluateTicker(
  rows: IndicatorRow[],
  symbol: string
): SignalResult | null {
  if (rows.length < 60) return null;

  const row = rows[rows.length - 1];
  const ts = scoreTrend(row);
  const ms = scoreMomentum(row);
  const bs = scoreBreakout(row);
  const vs = scoreVolatility(row);
  const rs = scoreRelativeStrength(row);

  // Weighted composite (sum=100)
  const composite =
    (ts * 25 + ms * 20 + bs * 25 + vs * 15 + rs * 15) / 100;

  if (composite < 20) return null;

  // Trade levels
  const atrVal = row.atr ?? row.close * 0.02;
  const entry = Math.round(row.close * 100) / 100;
  const stopLoss = Math.round((row.close - atrVal * 1.5) * 100) / 100;
  const target = Math.round(row.close * 1.03 * 100) / 100;
  const risk = entry - stopLoss;
  const reward = target - entry;
  const rr = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;

  if (rr < 0.8) return null;

  // Tags
  const tags: string[] = [];
  if (bs >= 50) tags.push("breakout");
  if ((row.vol_ratio ?? 0) >= 1.5) tags.push("volume");
  if (row.rsi !== null && row.rsi >= 50 && row.rsi <= 70) tags.push("rsi_ok");
  if (
    row.macd_hist !== null &&
    row.macd_hist_prev !== null &&
    row.macd_hist > 0 &&
    row.macd_hist_prev <= 0
  )
    tags.push("macd_cross");
  if (rs >= 50) tags.push("strong_rs");

  // Reason
  const reasons: string[] = [];
  if (ts >= 70) reasons.push("strong uptrend");
  if (bs >= 50) reasons.push("20d breakout");
  if (ms >= 60) reasons.push("bullish momentum");
  if (rs >= 50) reasons.push("outperforming SPY");
  const reason =
    reasons.slice(0, 3).join(", ") || "multi-factor score";

  return {
    symbol,
    date: row.date,
    composite_score: Math.round(composite * 10) / 10,
    trend_score: Math.round(ts * 10) / 10,
    momentum_score: Math.round(ms * 10) / 10,
    breakout_score: Math.round(bs * 10) / 10,
    volatility_score: Math.round(vs * 10) / 10,
    relative_strength_score: Math.round(rs * 10) / 10,
    entry_price: entry,
    stop_loss: stopLoss,
    target_price: target,
    reward_risk: rr,
    tags,
    reason: reason.charAt(0).toUpperCase() + reason.slice(1),
    holding_days: 7,
  };
}
