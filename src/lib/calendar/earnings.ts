/**
 * Earnings Date Fetcher — pulls upcoming earnings dates from Yahoo Finance
 */
import YahooFinance from "yahoo-finance2";

export interface EarningsEvent {
  symbol: string;
  date: string;           // YYYY-MM-DD
  time: "BMO" | "AMC" | "TBD";  // Before Market Open / After Market Close / TBD
  name: string;
  confirmed: boolean;
}

const yf = new YahooFinance();

/**
 * Fetch earnings date for a single ticker using quoteSummary calendarEvents
 */
async function fetchEarningsDate(symbol: string): Promise<EarningsEvent | null> {
  try {
    const result = await yf.quoteSummary(symbol, {
      modules: ["calendarEvents", "quoteType"],
    });

    const earnings = result.calendarEvents?.earnings;
    const companyName = result.quoteType?.shortName || result.quoteType?.longName || symbol;

    if (!earnings?.earningsDate || earnings.earningsDate.length === 0) {
      return null;
    }

    // earningsDate is an array of Date objects — first is the date
    const earningsDate = earnings.earningsDate[0];
    if (!earningsDate) return null;

    const dateStr = new Date(earningsDate).toISOString().split("T")[0];

    // Determine BMO/AMC based on time — Yahoo returns dates with times
    // Typically BMO is early morning, AMC is after 4pm
    const hours = new Date(earningsDate).getUTCHours();
    let timing: "BMO" | "AMC" | "TBD" = "TBD";
    if (hours <= 14) timing = "BMO";  // before ~10am ET
    else if (hours >= 20) timing = "AMC"; // after ~4pm ET

    // If there are two dates in the array, it's a range (not confirmed)
    const confirmed = earnings.earningsDate.length === 1;

    return {
      symbol,
      date: dateStr,
      time: timing,
      name: `${symbol} Earnings — ${companyName}`,
      confirmed,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch earnings dates for a list of tickers (batched)
 */
export async function fetchEarningsDates(symbols: string[]): Promise<EarningsEvent[]> {
  const BATCH = 10;
  const results: EarningsEvent[] = [];

  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const promises = batch.map((s) => fetchEarningsDate(s));
    const batchResults = await Promise.all(promises);
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}
