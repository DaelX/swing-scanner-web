import { NextResponse } from "next/server";
import { runDashboardScan } from "@/lib/scanner/dashboard";
import { getCandles, batchGetCandles } from "@/lib/scanner/data";
import { computeAllIndicators, type CandleData } from "@/lib/scanner/indicators";
import type { DashboardStock, Signal } from "@/lib/dashboard-types";

export const maxDuration = 30;

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function round2(v: number) { return Math.round(v * 100) / 100; }
function round1(v: number) { return Math.round(v * 10) / 10; }
function pctDist(price: number, level: number) { return ((price - level) / level) * 100; }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase().trim();

  try {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);

    const allSymbols = [sym, "SPY"];
    const allCandles = await batchGetCandles(allSymbols, start, end, 5);

    const candles = allCandles.get(sym);
    if (!candles || candles.length < 60) {
      return NextResponse.json(
        { error: `Not enough data for ${sym}. Need at least 60 trading days.` },
        { status: 404 }
      );
    }

    const spyCandles = allCandles.get("SPY") ?? [];
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

    // Import and use the same signal computation from the scanner
    // We need to reconstruct the signal here since computeSignal isn't exported
    // Let's use the full scanner on a single-ticker universe
    // Actually, let's just duplicate the minimal logic here for speed

    // Factor scoring - inline version
    const W_TREND = 0.30, W_MOMENTUM = 0.25, W_MEAN_REV = 0.20, W_VOLUME = 0.15, W_RS = 0.10;

    // Trend factor
    let factorTrend = 0;
    const trendReasons: string[] = [];
    let trend: "BULL" | "BEAR" | "RANGE" = "RANGE";
    if (row.sma20 && row.sma50 && row.sma200) {
      if (row.sma20 > row.sma50 && row.sma50 > row.sma200) { trend = "BULL"; factorTrend += 40; trendReasons.push("SMA alignment: 20>50>200 (bullish)"); }
      else if (row.sma20 < row.sma50 && row.sma50 < row.sma200) { trend = "BEAR"; factorTrend -= 40; trendReasons.push("SMA alignment: 20<50<200 (bearish)"); }
      else { trendReasons.push("Mixed SMA alignment"); }
    }
    if (row.close > (row.sma200 || 0)) factorTrend += 20; else factorTrend -= 20;
    if (row.sma50 && prev5?.sma50) {
      if (row.sma50 > prev5.sma50) factorTrend += 20;
      else factorTrend -= 20;
    }
    factorTrend = clamp(factorTrend, -100, 100);

    // Momentum factor
    let factorMom = 0;
    const momReasons: string[] = [];
    if (row.rsi !== null) {
      if (row.rsi > 60 && row.rsi < 80) { factorMom += 30; momReasons.push(`RSI bullish (${round1(row.rsi)})`); }
      else if (row.rsi <= 40 && row.rsi > 20) { factorMom -= 30; momReasons.push(`RSI bearish (${round1(row.rsi)})`); }
      else if (row.rsi >= 80) { factorMom -= 10; momReasons.push(`RSI overbought (${round1(row.rsi)})`); }
      else if (row.rsi <= 20) { factorMom += 10; momReasons.push(`RSI oversold (${round1(row.rsi)})`); }
    }
    if (macdCross === "bullish") { factorMom += 40; momReasons.push("MACD bullish crossover"); }
    else if (macdCross === "bearish") { factorMom -= 40; momReasons.push("MACD bearish crossover"); }
    else if (row.macd_hist !== null) {
      if (row.macd_hist > 0) factorMom += 15;
      else factorMom -= 15;
    }
    factorMom = clamp(factorMom, -100, 100);

    // Mean Reversion factor
    let factorMR = 0;
    const mrReasons: string[] = [];
    if (row.rsi !== null && row.rsi < 30 && trend === "BULL") { factorMR += 50; mrReasons.push("Oversold bounce setup in uptrend"); }
    else if (row.rsi !== null && row.rsi > 70 && trend === "BEAR") { factorMR -= 50; mrReasons.push("Overbought fade in downtrend"); }
    if (row.low_20d && Math.abs(pctDist(row.close, row.low_20d)) < 2) { factorMR += 20; mrReasons.push("Near 20d support"); }
    if (row.high_20d && Math.abs(pctDist(row.close, row.high_20d)) < 2) { factorMR -= 20; mrReasons.push("Near 20d resistance"); }
    factorMR = clamp(factorMR, -100, 100);

    // Volume factor
    let factorVol = 0;
    const volReasons: string[] = [];
    if (row.vol_ratio !== null) {
      if (row.vol_ratio > 1.5 && change1d > 0) { factorVol += 40; volReasons.push("Accumulation day (high vol up)"); }
      else if (row.vol_ratio > 1.5 && change1d < 0) { factorVol -= 40; volReasons.push("Distribution day (high vol down)"); }
    }
    factorVol = clamp(factorVol, -100, 100);

    // RS factor
    let factorRS = 0;
    const rsReasons: string[] = [];
    if (row.rs_20d !== null) {
      const rs = row.rs_20d * 100;
      if (rs > 5) { factorRS += 40; rsReasons.push(`Strong vs SPY 20d (+${round1(rs)}%)`); }
      else if (rs > 2) { factorRS += 20; }
      else if (rs < -5) { factorRS -= 40; rsReasons.push(`Weak vs SPY 20d (${round1(rs)}%)`); }
      else if (rs < -2) { factorRS -= 20; }
    }
    if (row.rs_60d !== null) {
      const rs = row.rs_60d * 100;
      if (rs > 5) factorRS += 30;
      else if (rs > 0) factorRS += 10;
      else if (rs < -5) factorRS -= 30;
      else factorRS -= 10;
    }
    factorRS = clamp(factorRS, -100, 100);

    // Composite signal
    const composite = Math.round(
      factorTrend * W_TREND + factorMom * W_MOMENTUM + factorMR * W_MEAN_REV +
      factorVol * W_VOLUME + factorRS * W_RS
    );
    const signalScore = clamp(composite, -100, 100);

    let signal: Signal;
    if (signalScore >= 50) signal = "STRONG_BUY";
    else if (signalScore >= 20) signal = "BUY";
    else if (signalScore >= -20) signal = "HOLD";
    else if (signalScore >= -50) signal = "SELL";
    else signal = "STRONG_SELL";

    const allReasons = [...trendReasons, ...momReasons, ...mrReasons, ...volReasons, ...rsReasons].slice(0, 8);

    // Support/Resistance
    const price = round2(row.close);
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

    // Risk management
    let stop_loss: number | null = null;
    let stop_pct: number | null = null;
    let target_1: number | null = null;
    let target_2: number | null = null;
    let reward_risk: number | null = null;
    let position_size_pct: number | null = null;

    if (row.atr && row.atr > 0) {
      if (signal === "STRONG_BUY" || signal === "BUY") {
        const atrStop = price - row.atr * 1.5;
        stop_loss = nearSupport ? round2(Math.max(nearSupport.level * 0.995, atrStop)) : round2(atrStop);
        const risk = price - stop_loss;
        stop_pct = round2((risk / price) * 100);
        target_1 = round2(price + risk * 2);
        target_2 = round2(price + risk * 3);
        reward_risk = risk > 0 ? round1((target_1 - price) / risk) : null;
      } else if (signal === "SELL" || signal === "STRONG_SELL") {
        const atrStop = price + row.atr * 1.5;
        stop_loss = nearResist ? round2(Math.min(nearResist.level * 1.005, atrStop)) : round2(atrStop);
        const risk = stop_loss - price;
        stop_pct = round2((risk / price) * 100);
        target_1 = round2(price - risk * 2);
        target_2 = round2(price - risk * 3);
        reward_risk = risk > 0 ? round1((price - target_1) / risk) : null;
      }

      const atrPct = (row.atr / price) * 100;
      const tradeRisk = atrPct * 1.5;
      position_size_pct = tradeRisk > 0 ? round1(Math.min(25, 1 / (tradeRisk / 100))) : null;
    }

    const stock: DashboardStock = {
      symbol: sym,
      price,
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
      est_entry_date: (signal === "STRONG_BUY" || signal === "BUY" || signal === "SELL" || signal === "STRONG_SELL") ? new Date().toISOString().slice(0, 10) : null,
      est_exit_date: null,
      est_entry_price: (signal === "STRONG_BUY" || signal === "BUY" || signal === "SELL" || signal === "STRONG_SELL") ? price : null,
      est_hold_days: null,
    };

    return NextResponse.json({ stock }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error(`Lookup error for ${sym}:`, error);
    return NextResponse.json(
      { error: `Failed to analyze ${sym}. Make sure it's a valid ticker.` },
      { status: 500 }
    );
  }
}
