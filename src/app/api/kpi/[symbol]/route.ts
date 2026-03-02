import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { StockKPIs } from "@/lib/dashboard-types";

export const maxDuration = 30;

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  try {
    const data = await yf.quoteSummary(symbol.toUpperCase(), {
      modules: ["defaultKeyStatistics", "financialData", "summaryDetail", "quoteType"],
    });

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const ks: any = data.defaultKeyStatistics || {};
    const fd: any = data.financialData || {};
    const sd: any = data.summaryDetail || {};
    const qt: any = data.quoteType || {};

    const kpis: StockKPIs = {
      symbol: symbol.toUpperCase(),
      company_name: qt.shortName || qt.longName || symbol.toUpperCase(),
      market_cap: sd.marketCap ?? null,
      pe_trailing: sd.trailingPE ?? null,
      pe_forward: ks.forwardPE ?? null,
      eps_ttm: ks.trailingEps ?? null,
      eps_forward: ks.forwardEps ?? null,
      revenue: fd.totalRevenue ?? null,
      revenue_growth: fd.revenueGrowth != null ? +(fd.revenueGrowth * 100).toFixed(1) : null,
      gross_margin: fd.grossMargins != null ? +(fd.grossMargins * 100).toFixed(1) : null,
      operating_margin: fd.operatingMargins != null ? +(fd.operatingMargins * 100).toFixed(1) : null,
      profit_margin: fd.profitMargins != null ? +(fd.profitMargins * 100).toFixed(1) : null,
      roe: fd.returnOnEquity != null ? +(fd.returnOnEquity * 100).toFixed(1) : null,
      roa: fd.returnOnAssets != null ? +(fd.returnOnAssets * 100).toFixed(1) : null,
      debt_to_equity: fd.debtToEquity ?? null,
      free_cash_flow: fd.freeCashflow ?? null,
      dividend_yield: sd.dividendYield != null ? +(sd.dividendYield * 100).toFixed(2) : null,
      beta: ks.beta ?? null,
      price_to_book: ks.priceToBook ?? null,
      short_pct_float: ks.shortPercentOfFloat != null ? +(ks.shortPercentOfFloat * 100).toFixed(2) : null,
      analyst_target: fd.targetMeanPrice ?? null,
      analyst_recommendation: fd.recommendationKey ?? null,
      week52_high: sd.fiftyTwoWeekHigh ?? null,
      week52_low: sd.fiftyTwoWeekLow ?? null,
    };

    return NextResponse.json(kpis, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=1800" },
    });
  } catch (error) {
    console.error(`KPI fetch error for ${symbol}:`, error);
    return NextResponse.json({ error: `Failed to fetch KPIs for ${symbol}` }, { status: 500 });
  }
}
