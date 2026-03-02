import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const maxDuration = 30;

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

export interface PortfolioQuote {
  symbol: string;
  name: string;
  price: number;
  change_1d: number;
  change_pct_1d: number;
  prev_close: number;
  day_high: number;
  day_low: number;
  week52_high: number | null;
  week52_low: number | null;
}

export async function POST(req: Request) {
  try {
    const { symbols } = await req.json() as { symbols: string[] };

    if (!symbols || symbols.length === 0) {
      return NextResponse.json({ quotes: [] });
    }

    const quotes: PortfolioQuote[] = [];

    // Batch fetch - process in groups of 10
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += 10) {
      batches.push(symbols.slice(i, i + 10));
    }

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (sym) => {
          const data = await yf.quoteSummary(sym.toUpperCase(), {
            modules: ["price"],
          });
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const p: any = data.price || {};
          return {
            symbol: sym.toUpperCase(),
            name: p.shortName || p.longName || sym.toUpperCase(),
            price: p.regularMarketPrice ?? 0,
            change_1d: p.regularMarketChange ?? 0,
            change_pct_1d: p.regularMarketChangePercent != null ? p.regularMarketChangePercent * 100 : 0,
            prev_close: p.regularMarketPreviousClose ?? 0,
            day_high: p.regularMarketDayHigh ?? 0,
            day_low: p.regularMarketDayLow ?? 0,
            week52_high: p.fiftyTwoWeekHigh ?? null,
            week52_low: p.fiftyTwoWeekLow ?? null,
          } as PortfolioQuote;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") quotes.push(r.value);
      }
    }

    return NextResponse.json({ quotes }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Portfolio quote error:", error);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}
