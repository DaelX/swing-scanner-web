/**
 * DaelX Stocks Trading — Elite Strategy Types
 *
 * Multi-factor institutional signal system:
 *   STRONG BUY / BUY / HOLD / SELL / STRONG SELL
 *
 * Built on trend regime + mean-reversion + momentum confluence.
 */

export type Signal = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";

export interface DashboardStock {
  symbol: string;
  price: number;
  change_1d: number;
  change_5d: number;

  // Key levels
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  support_20d: number | null;
  resistance_20d: number | null;

  // Distance to levels (%)
  dist_sma20: number | null;
  dist_sma50: number | null;
  dist_sma200: number | null;
  dist_support: number | null;

  // Technical indicators
  rsi: number | null;
  macd_hist: number | null;
  macd_signal_cross: "bullish" | "bearish" | "none";
  vol_ratio: number | null;
  atr: number | null;
  atr_pct: number | null;

  // Relative strength
  rs_20d: number | null;
  rs_60d: number | null;

  // ─── ELITE SIGNAL SYSTEM ───

  // Signal & conviction
  signal: Signal;
  signal_score: number;          // -100 (max bearish) to +100 (max bullish)
  signal_reasons: string[];

  // Trend regime (the macro filter)
  trend: "BULL" | "BEAR" | "RANGE";
  trend_reasons: string[];

  // Factor scores (-100 to +100 each)
  factor_trend: number;         // SMA alignment, slope, price position
  factor_momentum: number;      // RSI, MACD, rate-of-change
  factor_mean_reversion: number; // RSI extremes at support/resistance, Bollinger
  factor_volume: number;        // Accumulation/distribution, vol profile
  factor_relative_strength: number; // vs SPY, sector rotation signal

  // Risk management
  stop_loss: number | null;      // hard stop price
  stop_pct: number | null;       // stop distance as % of entry
  target_1: number | null;       // first target (1R)
  target_2: number | null;       // second target (2R)
  reward_risk: number | null;    // R:R ratio to target_1
  position_size_pct: number | null; // suggested position size (% of portfolio) based on volatility

  // Support / resistance
  nearest_support: number | null;
  nearest_support_label: string;
  nearest_resistance: number | null;
  nearest_resistance_label: string;

  // Trade timing
  est_entry_date: string | null;
  est_exit_date: string | null;
  est_entry_price: number | null;
  est_hold_days: number | null;
}

export interface DashboardResponse {
  scan_date: string;
  universe: string;
  total_scanned: number;
  stocks: DashboardStock[];
}

/** Fundamental KPIs for a single stock */
export interface StockKPIs {
  symbol: string;
  company_name: string;
  market_cap: number | null;
  pe_trailing: number | null;
  pe_forward: number | null;
  eps_ttm: number | null;
  eps_forward: number | null;
  revenue: number | null;
  revenue_growth: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  profit_margin: number | null;
  roe: number | null;
  roa: number | null;
  debt_to_equity: number | null;
  free_cash_flow: number | null;
  dividend_yield: number | null;
  beta: number | null;
  price_to_book: number | null;
  short_pct_float: number | null;
  analyst_target: number | null;
  analyst_recommendation: string | null;
  week52_high: number | null;
  week52_low: number | null;
}
