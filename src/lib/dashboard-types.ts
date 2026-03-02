/**
 * Dashboard types — shows ALL stocks with proximity to buy zones.
 */

export interface DashboardStock {
  symbol: string;
  price: number;
  change_1d: number;    // % change from prev close
  change_5d: number;    // % change over 5 days

  // Key levels
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  support_20d: number | null;   // 20-day low
  resistance_20d: number | null; // 20-day high

  // Distance to levels (% from current price, negative = below)
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

  // Buy zone analysis
  buy_zone_score: number;         // 0-100: how ready this stock is
  buy_zone_label: "IN_ZONE" | "APPROACHING" | "WATCH" | "NOT_READY";
  buy_zone_reasons: string[];
  nearest_support: number | null;  // closest key level below
  nearest_support_label: string;
  dist_to_buy: number | null;      // % to the buy zone

  // Trade timing estimates
  est_entry_date: string | null;   // estimated date to enter (YYYY-MM-DD)
  est_exit_date: string | null;    // estimated date to exit (YYYY-MM-DD)
  est_entry_price: number | null;  // estimated entry price
  est_target_price: number | null; // estimated target price
  est_hold_days: number | null;    // estimated holding period in days
  est_reward_risk: number | null;  // estimated reward/risk ratio
}

export interface DashboardResponse {
  scan_date: string;
  universe: string;
  total_scanned: number;
  stocks: DashboardStock[];
}
