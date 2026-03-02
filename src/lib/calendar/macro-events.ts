/**
 * 2026 US Economic Calendar — Major Market-Moving Events
 * Sources: Federal Reserve, BLS, BEA, White House PFEI Schedule
 */

export type MacroEventType =
  | "FOMC"
  | "CPI"
  | "NFP"
  | "GDP"
  | "PCE"
  | "PPI"
  | "RETAIL_SALES"
  | "ISM_MFG"
  | "ISM_SVC"
  | "CONSUMER_CONFIDENCE"
  | "JOBLESS_CLAIMS";

export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

export interface MacroEvent {
  date: string;            // YYYY-MM-DD
  time: string;            // HH:MM ET
  type: MacroEventType;
  name: string;
  description: string;
  impact: ImpactLevel;
  affects: string[];       // sectors or broad market tags
}

// Which sectors each event type typically moves
const FOMC_AFFECTS = ["Financials", "Real Estate", "Tech", "Broad Market"];
const CPI_AFFECTS = ["Consumer Staples", "Real Estate", "Financials", "Broad Market"];
const NFP_AFFECTS = ["Consumer Discretionary", "Financials", "Broad Market"];
const GDP_AFFECTS = ["Broad Market", "Industrials", "Consumer Discretionary"];
const PCE_AFFECTS = ["Consumer Staples", "Financials", "Broad Market"];
const PPI_AFFECTS = ["Industrials", "Materials", "Energy"];
const RETAIL_AFFECTS = ["Consumer Discretionary", "Retail", "E-Commerce"];
const ISM_MFG_AFFECTS = ["Industrials", "Materials", "Manufacturing"];
const ISM_SVC_AFFECTS = ["Technology", "Healthcare", "Financials"];

export const MACRO_EVENTS_2026: MacroEvent[] = [
  // ─── FOMC MEETINGS (8 scheduled) ───────────────────────────────
  { date: "2026-01-28", time: "14:00", type: "FOMC", name: "FOMC Rate Decision", description: "January meeting — Statement + Press Conference", impact: "HIGH", affects: FOMC_AFFECTS },
  { date: "2026-03-18", time: "14:00", type: "FOMC", name: "FOMC Rate Decision + SEP", description: "March meeting — Statement, Dot Plot, Press Conference", impact: "HIGH", affects: FOMC_AFFECTS },
  { date: "2026-04-29", time: "14:00", type: "FOMC", name: "FOMC Rate Decision", description: "April meeting — Statement + Press Conference", impact: "HIGH", affects: FOMC_AFFECTS },
  { date: "2026-06-17", time: "14:00", type: "FOMC", name: "FOMC Rate Decision + SEP", description: "June meeting — Statement, Dot Plot, Press Conference", impact: "HIGH", affects: FOMC_AFFECTS },
  { date: "2026-07-29", time: "14:00", type: "FOMC", name: "FOMC Rate Decision", description: "July meeting — Statement + Press Conference", impact: "HIGH", affects: FOMC_AFFECTS },
  { date: "2026-09-16", time: "14:00", type: "FOMC", name: "FOMC Rate Decision + SEP", description: "September meeting — Statement, Dot Plot, Press Conference", impact: "HIGH", affects: FOMC_AFFECTS },
  { date: "2026-10-28", time: "14:00", type: "FOMC", name: "FOMC Rate Decision", description: "October meeting — Statement + Press Conference", impact: "HIGH", affects: FOMC_AFFECTS },
  { date: "2026-12-09", time: "14:00", type: "FOMC", name: "FOMC Rate Decision + SEP", description: "December meeting — Statement, Dot Plot, Press Conference", impact: "HIGH", affects: FOMC_AFFECTS },

  // ─── CPI RELEASES (monthly, ~8:30 AM ET) ───────────────────────
  { date: "2026-01-14", time: "08:30", type: "CPI", name: "CPI — Dec 2025", description: "Consumer Price Index for December 2025", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-02-13", time: "08:30", type: "CPI", name: "CPI — Jan 2026", description: "Consumer Price Index for January 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-03-11", time: "08:30", type: "CPI", name: "CPI — Feb 2026", description: "Consumer Price Index for February 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-04-14", time: "08:30", type: "CPI", name: "CPI — Mar 2026", description: "Consumer Price Index for March 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-05-12", time: "08:30", type: "CPI", name: "CPI — Apr 2026", description: "Consumer Price Index for April 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-06-10", time: "08:30", type: "CPI", name: "CPI — May 2026", description: "Consumer Price Index for May 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-07-14", time: "08:30", type: "CPI", name: "CPI — Jun 2026", description: "Consumer Price Index for June 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-08-12", time: "08:30", type: "CPI", name: "CPI — Jul 2026", description: "Consumer Price Index for July 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-09-15", time: "08:30", type: "CPI", name: "CPI — Aug 2026", description: "Consumer Price Index for August 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-10-13", time: "08:30", type: "CPI", name: "CPI — Sep 2026", description: "Consumer Price Index for September 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-11-10", time: "08:30", type: "CPI", name: "CPI — Oct 2026", description: "Consumer Price Index for October 2026", impact: "HIGH", affects: CPI_AFFECTS },
  { date: "2026-12-10", time: "08:30", type: "CPI", name: "CPI — Nov 2026", description: "Consumer Price Index for November 2026", impact: "HIGH", affects: CPI_AFFECTS },

  // ─── NON-FARM PAYROLLS (monthly, first Friday, 8:30 AM ET) ─────
  { date: "2026-01-09", time: "08:30", type: "NFP", name: "NFP — Dec 2025", description: "Non-Farm Payrolls for December 2025", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-02-11", time: "08:30", type: "NFP", name: "NFP — Jan 2026", description: "Non-Farm Payrolls for January 2026 (incl. benchmark revisions)", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-03-06", time: "08:30", type: "NFP", name: "NFP — Feb 2026", description: "Non-Farm Payrolls for February 2026", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-04-03", time: "08:30", type: "NFP", name: "NFP — Mar 2026", description: "Non-Farm Payrolls for March 2026", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-05-01", time: "08:30", type: "NFP", name: "NFP — Apr 2026", description: "Non-Farm Payrolls for April 2026", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-06-05", time: "08:30", type: "NFP", name: "NFP — May 2026", description: "Non-Farm Payrolls for May 2026", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-07-02", time: "08:30", type: "NFP", name: "NFP — Jun 2026", description: "Non-Farm Payrolls for June 2026", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-08-07", time: "08:30", type: "NFP", name: "NFP — Jul 2026", description: "Non-Farm Payrolls for July 2026", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-09-04", time: "08:30", type: "NFP", name: "NFP — Aug 2026", description: "Non-Farm Payrolls for August 2026", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-10-02", time: "08:30", type: "NFP", name: "NFP — Sep 2026", description: "Non-Farm Payrolls for September 2026", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-11-06", time: "08:30", type: "NFP", name: "NFP — Oct 2026", description: "Non-Farm Payrolls for October 2026", impact: "HIGH", affects: NFP_AFFECTS },
  { date: "2026-12-04", time: "08:30", type: "NFP", name: "NFP — Nov 2026", description: "Non-Farm Payrolls for November 2026", impact: "HIGH", affects: NFP_AFFECTS },

  // ─── GDP RELEASES (quarterly, 3 estimates each) ────────────────
  { date: "2026-01-29", time: "08:30", type: "GDP", name: "GDP Q4 2025 — Advance", description: "First estimate of Q4 2025 GDP growth", impact: "HIGH", affects: GDP_AFFECTS },
  { date: "2026-02-26", time: "08:30", type: "GDP", name: "GDP Q4 2025 — Second", description: "Revised estimate of Q4 2025 GDP growth", impact: "MEDIUM", affects: GDP_AFFECTS },
  { date: "2026-03-27", time: "08:30", type: "GDP", name: "GDP Q4 2025 — Third", description: "Final estimate of Q4 2025 GDP growth", impact: "MEDIUM", affects: GDP_AFFECTS },
  { date: "2026-04-30", time: "08:30", type: "GDP", name: "GDP Q1 2026 — Advance", description: "First estimate of Q1 2026 GDP growth", impact: "HIGH", affects: GDP_AFFECTS },
  { date: "2026-05-28", time: "08:30", type: "GDP", name: "GDP Q1 2026 — Second", description: "Revised estimate of Q1 2026 GDP growth", impact: "MEDIUM", affects: GDP_AFFECTS },
  { date: "2026-06-25", time: "08:30", type: "GDP", name: "GDP Q1 2026 — Third", description: "Final estimate of Q1 2026 GDP growth", impact: "MEDIUM", affects: GDP_AFFECTS },
  { date: "2026-07-30", time: "08:30", type: "GDP", name: "GDP Q2 2026 — Advance", description: "First estimate of Q2 2026 GDP growth", impact: "HIGH", affects: GDP_AFFECTS },
  { date: "2026-08-26", time: "08:30", type: "GDP", name: "GDP Q2 2026 — Second", description: "Revised estimate of Q2 2026 GDP growth", impact: "MEDIUM", affects: GDP_AFFECTS },
  { date: "2026-09-30", time: "08:30", type: "GDP", name: "GDP Q2 2026 — Third", description: "Final estimate of Q2 2026 GDP growth", impact: "MEDIUM", affects: GDP_AFFECTS },
  { date: "2026-10-29", time: "08:30", type: "GDP", name: "GDP Q3 2026 — Advance", description: "First estimate of Q3 2026 GDP growth", impact: "HIGH", affects: GDP_AFFECTS },
  { date: "2026-11-25", time: "08:30", type: "GDP", name: "GDP Q3 2026 — Second", description: "Revised estimate of Q3 2026 GDP growth", impact: "MEDIUM", affects: GDP_AFFECTS },
  { date: "2026-12-23", time: "08:30", type: "GDP", name: "GDP Q3 2026 — Third", description: "Final estimate of Q3 2026 GDP growth", impact: "MEDIUM", affects: GDP_AFFECTS },

  // ─── PCE (Fed's preferred inflation gauge, ~last Friday of month) ──
  { date: "2026-01-30", time: "08:30", type: "PCE", name: "PCE — Dec 2025", description: "Personal Consumption Expenditures for December 2025", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-02-27", time: "08:30", type: "PCE", name: "PCE — Jan 2026", description: "Personal Consumption Expenditures for January 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-03-27", time: "08:30", type: "PCE", name: "PCE — Feb 2026", description: "Personal Consumption Expenditures for February 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-04-30", time: "08:30", type: "PCE", name: "PCE — Mar 2026", description: "Personal Consumption Expenditures for March 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-05-29", time: "08:30", type: "PCE", name: "PCE — Apr 2026", description: "Personal Consumption Expenditures for April 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-06-26", time: "08:30", type: "PCE", name: "PCE — May 2026", description: "Personal Consumption Expenditures for May 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-07-31", time: "08:30", type: "PCE", name: "PCE — Jun 2026", description: "Personal Consumption Expenditures for June 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-08-28", time: "08:30", type: "PCE", name: "PCE — Jul 2026", description: "Personal Consumption Expenditures for July 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-09-25", time: "08:30", type: "PCE", name: "PCE — Aug 2026", description: "Personal Consumption Expenditures for August 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-10-30", time: "08:30", type: "PCE", name: "PCE — Sep 2026", description: "Personal Consumption Expenditures for September 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-11-25", time: "08:30", type: "PCE", name: "PCE — Oct 2026", description: "Personal Consumption Expenditures for October 2026", impact: "HIGH", affects: PCE_AFFECTS },
  { date: "2026-12-23", time: "08:30", type: "PCE", name: "PCE — Nov 2026", description: "Personal Consumption Expenditures for November 2026", impact: "HIGH", affects: PCE_AFFECTS },

  // ─── PPI (monthly, ~day before CPI typically) ──────────────────
  { date: "2026-01-13", time: "08:30", type: "PPI", name: "PPI — Dec 2025", description: "Producer Price Index for December 2025", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-02-12", time: "08:30", type: "PPI", name: "PPI — Jan 2026", description: "Producer Price Index for January 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-03-12", time: "08:30", type: "PPI", name: "PPI — Feb 2026", description: "Producer Price Index for February 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-04-09", time: "08:30", type: "PPI", name: "PPI — Mar 2026", description: "Producer Price Index for March 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-05-14", time: "08:30", type: "PPI", name: "PPI — Apr 2026", description: "Producer Price Index for April 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-06-11", time: "08:30", type: "PPI", name: "PPI — May 2026", description: "Producer Price Index for May 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-07-15", time: "08:30", type: "PPI", name: "PPI — Jun 2026", description: "Producer Price Index for June 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-08-13", time: "08:30", type: "PPI", name: "PPI — Jul 2026", description: "Producer Price Index for July 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-09-11", time: "08:30", type: "PPI", name: "PPI — Aug 2026", description: "Producer Price Index for August 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-10-14", time: "08:30", type: "PPI", name: "PPI — Sep 2026", description: "Producer Price Index for September 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-11-12", time: "08:30", type: "PPI", name: "PPI — Oct 2026", description: "Producer Price Index for October 2026", impact: "MEDIUM", affects: PPI_AFFECTS },
  { date: "2026-12-11", time: "08:30", type: "PPI", name: "PPI — Nov 2026", description: "Producer Price Index for November 2026", impact: "MEDIUM", affects: PPI_AFFECTS },

  // ─── RETAIL SALES (monthly, ~mid-month) ────────────────────────
  { date: "2026-01-16", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Dec 2025", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-02-17", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Jan 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-03-17", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Feb 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-04-15", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Mar 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-05-15", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Apr 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-06-16", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — May 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-07-16", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Jun 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-08-14", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Jul 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-09-16", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Aug 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-10-16", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Sep 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-11-17", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Oct 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },
  { date: "2026-12-15", time: "08:30", type: "RETAIL_SALES", name: "Retail Sales — Nov 2026", description: "Advance Monthly Retail Trade Survey", impact: "MEDIUM", affects: RETAIL_AFFECTS },

  // ─── ISM MANUFACTURING (first business day of month) ───────────
  { date: "2026-01-05", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Dec 2025", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-02-02", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Jan 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-03-02", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Feb 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-04-01", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Mar 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-05-01", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Apr 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-06-01", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — May 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-07-01", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Jun 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-08-03", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Jul 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-09-01", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Aug 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-10-01", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Sep 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-11-02", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Oct 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },
  { date: "2026-12-01", time: "10:00", type: "ISM_MFG", name: "ISM Manufacturing — Nov 2026", description: "ISM Manufacturing PMI", impact: "MEDIUM", affects: ISM_MFG_AFFECTS },

  // ─── ISM SERVICES (third business day of month) ────────────────
  { date: "2026-01-07", time: "10:00", type: "ISM_SVC", name: "ISM Services — Dec 2025", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-02-04", time: "10:00", type: "ISM_SVC", name: "ISM Services — Jan 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-03-04", time: "10:00", type: "ISM_SVC", name: "ISM Services — Feb 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-04-03", time: "10:00", type: "ISM_SVC", name: "ISM Services — Mar 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-05-05", time: "10:00", type: "ISM_SVC", name: "ISM Services — Apr 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-06-03", time: "10:00", type: "ISM_SVC", name: "ISM Services — May 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-07-06", time: "10:00", type: "ISM_SVC", name: "ISM Services — Jun 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-08-05", time: "10:00", type: "ISM_SVC", name: "ISM Services — Jul 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-09-03", time: "10:00", type: "ISM_SVC", name: "ISM Services — Aug 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-10-05", time: "10:00", type: "ISM_SVC", name: "ISM Services — Sep 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-11-04", time: "10:00", type: "ISM_SVC", name: "ISM Services — Oct 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
  { date: "2026-12-03", time: "10:00", type: "ISM_SVC", name: "ISM Services — Nov 2026", description: "ISM Services PMI", impact: "MEDIUM", affects: ISM_SVC_AFFECTS },
];

/** Get events within a date range */
export function getMacroEvents(from: string, to: string): MacroEvent[] {
  return MACRO_EVENTS_2026.filter((e) => e.date >= from && e.date <= to);
}

/** Get upcoming events from today */
export function getUpcomingMacroEvents(days: number = 30): MacroEvent[] {
  const today = new Date().toISOString().split("T")[0];
  const future = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
  return getMacroEvents(today, future);
}

/** Color map for event type badges */
export const EVENT_COLORS: Record<MacroEventType, string> = {
  FOMC: "#dc2626",           // red — highest impact
  CPI: "#ea580c",            // orange
  NFP: "#d97706",            // amber
  GDP: "#7c3aed",            // purple
  PCE: "#db2777",            // pink
  PPI: "#2563eb",            // blue
  RETAIL_SALES: "#0891b2",   // cyan
  ISM_MFG: "#059669",        // emerald
  ISM_SVC: "#16a34a",        // green
  CONSUMER_CONFIDENCE: "#6366f1", // indigo
  JOBLESS_CLAIMS: "#64748b", // slate
};

/** Emoji map for event types */
export const EVENT_ICONS: Record<MacroEventType, string> = {
  FOMC: "🏛️",
  CPI: "📊",
  NFP: "👷",
  GDP: "📈",
  PCE: "💳",
  PPI: "🏭",
  RETAIL_SALES: "🛒",
  ISM_MFG: "⚙️",
  ISM_SVC: "🏢",
  CONSUMER_CONFIDENCE: "😊",
  JOBLESS_CLAIMS: "📋",
};
