import type { Metadata } from "next";
import type React from "react";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "../public/fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "../public/fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "FinLearn – AI Financial Education",
  description:
    "AI-powered financial literacy and paper trading platform for young learners.",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/lessons", label: "Lessons" },
  { href: "/quests", label: "Quests" },
  { href: "/trading", label: "Paper Trading" },
  { href: "/reports", label: "Parent Report" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <header className="bg-indigo-700 text-white shadow-md">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight">
              📈 FinLearn
            </Link>
            <nav className="flex gap-4 text-sm font-medium">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="hover:text-indigo-200 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
          {children}
        </main>
        <footer className="bg-gray-100 border-t text-center text-xs text-gray-500 py-3">
          FinLearn – AI-powered financial education. Paper trading only – no
          real money involved.
        </footer>
      </body>
    </html>
  );
}
