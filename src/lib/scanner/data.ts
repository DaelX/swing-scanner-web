/**
 * Yahoo Finance data provider using yahoo-finance2.
 * Handles fetching candles for individual tickers and batches.
 */

import YahooFinance from "yahoo-finance2";
import type { CandleData } from "./indicators";

const yahooFinance = new YahooFinance();

// In-memory cache with TTL
const cache = new Map<string, { data: CandleData[]; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// S&P 500 top ~100 tickers (fallback if Wikipedia fetch fails)
const SP500_FALLBACK = [
  "AAPL","MSFT","AMZN","NVDA","GOOGL","META","BRK-B","TSLA","UNH","XOM",
  "JNJ","JPM","V","PG","MA","HD","CVX","MRK","ABBV","LLY",
  "PEP","KO","AVGO","COST","TMO","MCD","WMT","CSCO","ACN","ABT",
  "CRM","DHR","TXN","NEE","NFLX","BMY","UPS","AMGN","PM","LIN",
  "RTX","HON","UNP","LOW","QCOM","INTC","SBUX","INTU","IBM","BA",
  "AMD","GE","CAT","ISRG","MDLZ","PLD","GILD","ADI","REGN","ADP",
  "NOW","BKNG","SCHW","GS","BLK","C","SPGI","SYK","ELV","CI",
  "LRCX","MMC","PYPL","TJX","SO","DE","ZTS","DUK","BDX","CL",
  "MO","CME","AMAT","APD","SLB","TGT","ITW","ETN","AON","PNC",
  "FIS","ORLY","AEP","ADSK","D","KLAC","GD","MSI","KMB","SHW",
];

const NASDAQ100_FALLBACK = [
  "AAPL","MSFT","AMZN","NVDA","GOOGL","META","TSLA","AVGO","COST","NFLX",
  "AMD","ADBE","PEP","CSCO","INTC","CMCSA","TXN","QCOM","AMGN","INTU",
  "ISRG","HON","LRCX","BKNG","AMAT","ADI","SBUX","MDLZ","GILD","REGN",
  "KLAC","ADP","PYPL","CDNS","MELI","SNPS","ORLY","MNST","CTAS","MAR",
  "FTNT","CSX","ABNB","MCHP","DASH","DXCM","PCAR","ON","WDAY","FANG",
];

export async function getCandles(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<CandleData[]> {
  const key = `${symbol}_${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}`;
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) return cached.data;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = await (yahooFinance as any).historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });

    if (!result?.length) return [];

    const candles: CandleData[] = result
      .filter((q: any) => q.close != null && q.open != null && q.high != null && q.low != null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString().slice(0, 10),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume ?? 0,
      }));

    cache.set(key, { data: candles, expiry: Date.now() + CACHE_TTL });
    return candles;
  } catch (err) {
    console.warn(`Failed to fetch ${symbol}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

export async function batchGetCandles(
  symbols: string[],
  startDate: Date,
  endDate: Date,
  chunkSize: number = 10
): Promise<Map<string, CandleData[]>> {
  const results = new Map<string, CandleData[]>();

  // Process in chunks to avoid rate limiting
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    const promises = chunk.map(async (sym) => {
      const candles = await getCandles(sym, startDate, endDate);
      if (candles.length > 0) {
        results.set(sym, candles);
      }
    });
    await Promise.all(promises);

    // Pause between chunks
    if (i + chunkSize < symbols.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}

export function getUniverse(name: string = "sp500"): string[] {
  switch (name.toLowerCase()) {
    case "nasdaq100":
      return NASDAQ100_FALLBACK;
    case "sp500":
    default:
      return SP500_FALLBACK;
  }
}
