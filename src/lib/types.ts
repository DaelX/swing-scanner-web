export interface ScanCandidate {
  rank: number;
  symbol: string;
  score: number;
  date: string;
  entry: number;
  stop_loss: number;
  target: number;
  reward_risk: number;
  holding_days: number;
  tags: string[];
  reason: string;
  news_sentiment: string;
  news_summary: string;
  risk_flags: string[];
  scores: {
    trend: number;
    momentum: number;
    breakout: number;
    volatility: number;
    relative_strength: number;
  };
}

export interface ScanResponse {
  disclaimer: string;
  scan_date: string;
  universe: string;
  total_scanned: number;
  candidates: ScanCandidate[];
}
