import { NextRequest, NextResponse } from "next/server";
import { getLatestScannerResults } from "@/lib/db/scanner-cache";

const DISCLAIMER =
  "DISCLAIMER: This is a probability scanner for research/educational purposes only. It is NOT financial advice. yfinance is not affiliated with or endorsed by Yahoo. Past performance does not guarantee future results. Always do your own due diligence.";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const universe = searchParams.get("universe") ?? "sp500";
  const topN = parseInt(searchParams.get("top_n") ?? "10", 10);

  try {
    const cached = await getLatestScannerResults(universe, topN);

    if (!cached || cached.candidates.length === 0) {
      return NextResponse.json({
        disclaimer: DISCLAIMER,
        scan_date: new Date().toISOString().slice(0, 10),
        universe,
        total_scanned: 0,
        candidates: [],
        message: "No cached scanner data available. Run the cache writer to populate.",
      });
    }

    return NextResponse.json(cached);
  } catch (err) {
    console.error("Scanner cache read failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    );
  }
}
