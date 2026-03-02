import { NextRequest, NextResponse } from "next/server";
import { getLatestScan, writeScanCache } from "@/lib/db/dashboard-cache";
import { runDashboardScan } from "@/lib/scanner/dashboard";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const universe = searchParams.get("universe") ?? "sp500";
  const forceRefresh = searchParams.get("refresh") === "true";

  try {
    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = await getLatestScan(universe);

      if (cached && cached.stocks.length > 0) {
        // Only use cache if it's from today
        const today = new Date().toISOString().slice(0, 10);
        if (cached.scan_date === today) {
          return NextResponse.json(cached);
        }
      }
    }

    // Run a live scan
    console.log(`[Dashboard API] Running live scan for ${universe}...`);
    const { stocks, totalScanned } = await runDashboardScan(universe);
    const scanDate = new Date().toISOString().slice(0, 10);

    // Write to cache in background (don't block response)
    writeScanCache(universe, scanDate, stocks).catch((err) =>
      console.error("[Dashboard API] Cache write failed:", err)
    );

    return NextResponse.json({
      scan_date: scanDate,
      universe,
      total_scanned: totalScanned,
      stocks,
    });
  } catch (err) {
    console.error("Dashboard scan failed:", err);

    // Fall back to cache on error
    try {
      const cached = await getLatestScan(universe);
      if (cached && cached.stocks.length > 0) {
        return NextResponse.json({
          ...cached,
          _note: "Live scan failed, showing cached data",
        });
      }
    } catch { /* ignore cache fallback errors */ }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Dashboard scan failed" },
      { status: 500 }
    );
  }
}
