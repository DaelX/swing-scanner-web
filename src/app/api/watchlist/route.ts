import { NextResponse } from "next/server";
import { getLatestScan } from "@/lib/db/dashboard-cache";

export const maxDuration = 60;

export async function GET() {
  try {
    const cached = await getLatestScan("watchlist");

    if (!cached || cached.stocks.length === 0) {
      return NextResponse.json({
        scan_date: new Date().toISOString().slice(0, 10),
        universe: "watchlist",
        total_scanned: 0,
        stocks: [],
        message: "No cached data available. Run the cache writer to populate.",
      });
    }

    return NextResponse.json(cached);
  } catch (err) {
    console.error("Watchlist cache read failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Watchlist read failed" },
      { status: 500 }
    );
  }
}
