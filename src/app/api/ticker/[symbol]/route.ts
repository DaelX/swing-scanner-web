import { NextRequest, NextResponse } from "next/server";
import { getCandles } from "@/lib/scanner/data";
import { computeAllIndicators } from "@/lib/scanner/indicators";

const DISCLAIMER =
  "DISCLAIMER: This is a probability scanner for research/educational purposes only. Not financial advice.";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const days = parseInt(
    request.nextUrl.searchParams.get("days") ?? "180",
    10
  );

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const candles = await getCandles(sym, start, end);
    if (candles.length === 0) {
      return NextResponse.json(
        { error: `No data for ${sym}` },
        { status: 404 }
      );
    }

    const rows = computeAllIndicators(candles);
    const formatted = rows.map((r) => ({
      date: r.date,
      open: Math.round(r.open * 100) / 100,
      high: Math.round(r.high * 100) / 100,
      low: Math.round(r.low * 100) / 100,
      close: Math.round(r.close * 100) / 100,
      volume: r.volume,
      sma20: r.sma20 !== null ? Math.round(r.sma20 * 100) / 100 : null,
      sma50: r.sma50 !== null ? Math.round(r.sma50 * 100) / 100 : null,
      rsi: r.rsi !== null ? Math.round(r.rsi * 10) / 10 : null,
    }));

    return NextResponse.json({
      disclaimer: DISCLAIMER,
      symbol: sym,
      candles: formatted,
    });
  } catch (err) {
    console.error(`Ticker detail error for ${sym}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error fetching data" },
      { status: 500 }
    );
  }
}
