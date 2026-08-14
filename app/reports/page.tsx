"use client";

import { useState } from "react";

const DEMO_STUDENT_ID = "demo-student";

interface ProgressReport {
  studentName: string;
  reportDate: string;
  totalXpEarned: number;
  lessonsCompleted: number;
  questsCompleted: number;
  totalTrades: number;
  averageDecisionScore: number | null;
  portfolioValue: number;
  startingBalance: number;
  literacyHighlights: string[];
  growthAreas: string[];
  parentRecommendations: string[];
  overallSummary: string;
}

export default function ReportsPage() {
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/reports?studentId=${DEMO_STUDENT_ID}`
      );
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to generate report");
      } else {
        setReport(await res.json());
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📋 Parent Progress Report</h1>
        <p className="text-gray-600 mt-1">
          An AI-generated report focused on your child's financial literacy
          growth — not just trading results.
        </p>
      </div>

      {!report && (
        <div className="bg-white border rounded-xl p-6 text-center space-y-4">
          <div className="text-5xl">📊</div>
          <h2 className="text-lg font-semibold">Generate Progress Report</h2>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            This report analyses your child's lessons completed, quests
            finished, and the quality of their investment reasoning —
            not profit or loss.
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="bg-indigo-600 text-white rounded-lg px-6 py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate Report"}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-indigo-800">
                  Progress Report: {report.studentName}
                </h2>
                <p className="text-indigo-600 text-sm">{report.reportDate}</p>
              </div>
              <button
                onClick={() => setReport(null)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Generate New
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "XP Earned", value: report.totalXpEarned.toLocaleString(), icon: "⭐" },
              { label: "Lessons Done", value: String(report.lessonsCompleted), icon: "📚" },
              { label: "Quests Done", value: String(report.questsCompleted), icon: "🏆" },
              { label: "Total Trades", value: String(report.totalTrades), icon: "📈" },
              {
                label: "Avg. Reasoning Score",
                value:
                  report.averageDecisionScore !== null
                    ? `${report.averageDecisionScore}/10`
                    : "N/A",
                icon: "🧠",
              },
              {
                label: "Portfolio Value",
                value: `$${report.portfolioValue.toLocaleString()}`,
                icon: "💼",
              },
              {
                label: "Starting Balance",
                value: `$${report.startingBalance.toLocaleString()}`,
                icon: "🏦",
              },
              {
                label: "Return",
                value: `${(((report.portfolioValue - report.startingBalance) / report.startingBalance) * 100).toFixed(1)}%`,
                icon: "📉",
              },
            ].map((s) => (
              <div key={s.label} className="bg-white border rounded-xl p-3 text-sm">
                <div className="text-xl">{s.icon}</div>
                <div className="font-bold text-base mt-1">{s.value}</div>
                <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Overall summary */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold text-lg mb-2">Overall Summary</h3>
            <p className="text-gray-700 leading-relaxed">{report.overallSummary}</p>
          </div>

          {/* AI sections */}
          <div className="grid md:grid-cols-3 gap-4">
            <ReportSection
              title="🌟 Literacy Highlights"
              items={report.literacyHighlights}
              color="green"
            />
            <ReportSection
              title="📈 Areas to Grow"
              items={report.growthAreas}
              color="yellow"
            />
            <ReportSection
              title="💡 Recommendations for Parents"
              items={report.parentRecommendations}
              color="blue"
            />
          </div>

          <p className="text-xs text-gray-400 text-center">
            This report was generated by AI and focuses on learning progress.
            It does not constitute financial advice.
          </p>
        </div>
      )}
    </div>
  );
}

function ReportSection({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: "green" | "yellow" | "blue";
}) {
  const colors = {
    green: "bg-green-50 border-green-100",
    yellow: "bg-yellow-50 border-yellow-100",
    blue: "bg-blue-50 border-blue-100",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-700 flex gap-2">
            <span className="text-gray-400 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
