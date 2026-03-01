import { NextRequest, NextResponse } from "next/server";
import { runDashboardScan } from "@/lib/scanner/dashboard";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const universe = searchParams.get("universe") ?? "sp500";

  try {
    const { stocks, totalScanned } = await runDashboardScan(universe);

    return NextResponse.json({
      scan_date: new Date().toISOString().slice(0, 10),
      universe,
      total_scanned: totalScanned,
      stocks,
    });
  } catch (err) {
    console.error("Dashboard scan failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Dashboard scan failed" },
      { status: 500 }
    );
  }
}
