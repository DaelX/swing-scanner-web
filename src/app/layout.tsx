import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swing Scanner | Stock Market Scanner",
  description:
    "Scan the US stock market for short-term swing trade opportunities. Research/educational tool only — not financial advice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-white min-h-screen`}
      >
        <nav className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span>⚡</span>
            <span className="text-blue-400">Swing Scanner</span>
          </div>
          <div className="flex gap-4 text-sm text-slate-400">
            <a href="/" className="hover:text-white transition">
              Scanner
            </a>
            <a href="/dashboard" className="hover:text-white transition">
              Dashboard
            </a>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
