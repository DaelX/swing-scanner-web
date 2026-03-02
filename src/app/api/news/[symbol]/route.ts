import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const maxDuration = 15;

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

export interface NewsItem {
  title: string;
  publisher: string;
  date: string;
  link: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  try {
    const data = await yf.search(symbol.toUpperCase(), { newsCount: 8 });

    const news: NewsItem[] = (data.news || [])
      .filter((n: any) => n.title && n.link)
      .map((n: any) => ({
        title: n.title,
        publisher: n.publisher || "Unknown",
        date: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString().split("T")[0]
          : "",
        link: n.link,
      }));

    return NextResponse.json({ symbol: symbol.toUpperCase(), news }, {
      headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=900" },
    });
  } catch (error) {
    console.error(`News fetch error for ${symbol}:`, error);
    return NextResponse.json({ error: `Failed to fetch news for ${symbol}` }, { status: 500 });
  }
}
