import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/lib/scanner/ranker";

const DISCLAIMER =
  "DISCLAIMER: This is a probability scanner for research/educational purposes only. It is NOT financial advice. yfinance is not affiliated with or endorsed by Yahoo. Past performance does not guarantee future results. Always do your own due diligence.";

export const maxDuration = 60; // Vercel Pro: up to 60s for serverless functions

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const universe = searchParams.get("universe") ?? "sp500";
  const topN = parseInt(searchParams.get("top_n") ?? "10", 10);

  try {
    const { candidates, totalScanned } = await runScan(universe, topN);

    return NextResponse.json({
      disclaimer: DISCLAIMER,
      scan_date: new Date().toISOString().slice(0, 10),
      universe,
      total_scanned: totalScanned,
      candidates,
    });
  } catch (err) {
    console.error("Scan failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    );
  }
}
