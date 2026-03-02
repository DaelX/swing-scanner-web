import { NextResponse } from "next/server";
import { getUpcomingMacroEvents, type MacroEvent } from "@/lib/calendar/macro-events";
import { fetchEarningsDates, type EarningsEvent } from "@/lib/calendar/earnings";
import { getUniverse } from "@/lib/scanner/data";

export const maxDuration = 60;

export interface CalendarResponse {
  macro: MacroEvent[];
  earnings: EarningsEvent[];
  generated: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") || "60"), 120);
  const includeEarnings = searchParams.get("earnings") !== "false";

  try {
    // Macro events from our static calendar
    const macro = getUpcomingMacroEvents(days);

    // Earnings dates from Yahoo Finance for watchlist + key S&P stocks
    let earnings: EarningsEvent[] = [];
    if (includeEarnings) {
      const watchlist = getUniverse("watchlist");
      // Also grab some high-impact S&P names not in watchlist
      const extraTickers = ["JPM", "BAC", "GS", "UNH", "JNJ", "V", "MA", "HD", "DIS", "CRM", "AVGO", "COST", "PEP", "KO", "MCD", "BA", "CAT", "XOM", "CVX"];
      const allTickers = [...new Set([...watchlist, ...extraTickers])];
      earnings = await fetchEarningsDates(allTickers);
    }

    const response: CalendarResponse = {
      macro,
      earnings,
      generated: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=1800" },
    });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json({ error: "Failed to load calendar" }, { status: 500 });
  }
}
