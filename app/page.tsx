"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DEMO_USER_ID = "demo-student";

interface Lesson {
  id: string;
  title: string;
  completedAt?: string;
}

interface Quest {
  id: string;
  title: string;
  completedAt?: string;
}

interface PortfolioSummary {
  balance: number;
  totalValue: number;
}

export default function Dashboard() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const [lessonsRes, questsRes, portfolioRes] = await Promise.all([
        fetch(`/api/lessons?userId=${DEMO_USER_ID}`),
        fetch(`/api/quests?userId=${DEMO_USER_ID}`),
        fetch(`/api/trades?userId=${DEMO_USER_ID}&view=portfolio`),
      ]);

      if (lessonsRes.ok) setLessons(await lessonsRes.json());
      if (questsRes.ok) {
        const d = await questsRes.json();
        setQuests(d.quests ?? []);
        setXp(d.totalXp ?? 0);
      }
      if (portfolioRes.ok) setPortfolio(await portfolioRes.json());
      setLoading(false);
    }
    init();
  }, []);

  const completedLessons = lessons.filter((l) => l.completedAt).length;
  const completedQuests = quests.filter((q) => q.completedAt).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-indigo-600 text-lg animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-indigo-800">
          Welcome to FinLearn! 👋
        </h1>
        <p className="text-indigo-600 mt-1">
          Build real financial skills through lessons, quests, and simulated
          trading. Focus on your reasoning, not just the numbers.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "XP Earned", value: `${xp.toLocaleString()} XP`, icon: "⭐", color: "yellow" },
          { label: "Lessons Done", value: `${completedLessons} / ${lessons.length}`, icon: "📚", color: "blue" },
          { label: "Quests Done", value: `${completedQuests} / ${quests.length}`, icon: "🏆", color: "green" },
          { label: "Portfolio Value", value: `$${portfolio?.totalValue?.toLocaleString() ?? "–"}`, icon: "💼", color: "indigo" },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border p-4 ${
              {
                yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
                blue: "bg-blue-50 border-blue-200 text-blue-800",
                green: "bg-green-50 border-green-200 text-green-800",
                indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
              }[s.color]
            }`}
          >
            <div className="text-2xl">{s.icon}</div>
            <div className="text-lg font-bold mt-1">{s.value}</div>
            <div className="text-xs mt-0.5 opacity-70">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { href: "/lessons", title: "📚 Short-Form Lessons", desc: "Bite-sized financial concepts in under 3 minutes.", cta: "Start Learning" },
          { href: "/quests", title: "🏆 Quests", desc: "Complete challenges and reflect on your decisions to earn XP.", cta: "View Quests" },
          { href: "/trading", title: "📈 Paper Trading", desc: "Buy and sell simulated stocks – practise without real money.", cta: "Open Simulator" },
          { href: "/reports", title: "📋 Parent Report", desc: "Generate an AI progress report focused on financial literacy.", cta: "View Report" },
        ].map((c) => (
          <div key={c.href} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg">{c.title}</h3>
            <p className="text-gray-600 text-sm mt-1">{c.desc}</p>
            <Link href={c.href} className="inline-block mt-3 text-sm font-medium text-indigo-600 hover:underline">
              {c.cta} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
