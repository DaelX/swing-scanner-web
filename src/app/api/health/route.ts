import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    disclaimer:
      "DISCLAIMER: This is a probability scanner for research/educational purposes only. It is NOT financial advice. Past performance does not guarantee future results. Trade at your own risk. Always do your own due diligence.",
  });
}
