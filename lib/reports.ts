/**
 * Parent-facing progress reports.
 * Summarises a student's financial literacy growth, not just trading results.
 */

import OpenAI from "openai";
import { getDb } from "./db";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface ProgressReport {
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

export async function generateProgressReport(
  studentId: string
): Promise<ProgressReport> {
  const db = getDb();

  const user = db
    .prepare("SELECT name, balance FROM users WHERE id=? AND role='student'")
    .get(studentId) as { name: string; balance: number } | undefined;
  if (!user) throw new Error("Student not found");

  const lessonsCompleted = (
    db
      .prepare(
        "SELECT COUNT(*) as n FROM lesson_completions WHERE user_id=?"
      )
      .get(studentId) as { n: number }
  ).n;

  const questsRow = db
    .prepare(
      "SELECT COUNT(*) as n, COALESCE(SUM(xp_earned),0) as xp FROM quest_completions WHERE user_id=?"
    )
    .get(studentId) as { n: number; xp: number };

  const tradesRow = db
    .prepare(
      `SELECT COUNT(*) as n, AVG(decision_score) as avg_score
       FROM trades WHERE user_id=?`
    )
    .get(studentId) as { n: number; avg_score: number | null };

  // Compute portfolio market value
  const portfolioRows = db
    .prepare(
      `SELECT p.symbol, p.quantity, p.avg_cost,
         (SELECT price FROM price_history ph WHERE ph.symbol=p.symbol ORDER BY ph.recorded_at DESC LIMIT 1) as current_price
       FROM portfolio p WHERE p.user_id=? AND p.quantity > 0`
    )
    .all(studentId) as {
    symbol: string;
    quantity: number;
    avg_cost: number;
    current_price: number | null;
  }[];

  let portfolioValue = user.balance;
  for (const pos of portfolioRows) {
    portfolioValue += (pos.current_price ?? pos.avg_cost) * pos.quantity;
  }
  portfolioValue = parseFloat(portfolioValue.toFixed(2));

  const recentTrades = db
    .prepare(
      `SELECT symbol, action, reasoning, decision_score
       FROM trades WHERE user_id=? ORDER BY executed_at DESC LIMIT 5`
    )
    .all(studentId) as {
    symbol: string;
    action: string;
    reasoning: string | null;
    decision_score: number | null;
  }[];

  const recentLessons = db
    .prepare(
      `SELECT l.title FROM lesson_completions lc
       JOIN lessons l ON l.id=lc.lesson_id
       WHERE lc.user_id=? ORDER BY lc.completed_at DESC LIMIT 5`
    )
    .all(studentId) as { title: string }[];

  const systemPrompt = `You are writing a progress report for parents about their child's financial literacy learning journey.
Focus entirely on learning, reasoning quality, and character growth — NOT profit/loss.
Be warm, specific, and actionable.
Respond with ONLY valid JSON matching this schema:
{
  "literacyHighlights": [<string>, ...],
  "growthAreas": [<string>, ...],
  "parentRecommendations": [<string>, ...],
  "overallSummary": <string, 2-3 sentences>
}`;

  const dataContext = `Student: ${user.name}
Period: last 30 days
Lessons completed: ${lessonsCompleted}
Quests completed: ${questsRow.n}
Total trades: ${tradesRow.n}
Average decision-reasoning score (1-10): ${tradesRow.avg_score !== null ? tradesRow.avg_score.toFixed(1) : "N/A"}
Portfolio value (started with $10,000): $${portfolioValue.toLocaleString()}

Recent lesson topics: ${recentLessons.map((l) => l.title).join(", ") || "none"}

Recent trade reasonings:
${
  recentTrades
    .map(
      (t) =>
        `  - ${t.action} ${t.symbol} | score: ${t.decision_score ?? "unscored"} | "${t.reasoning ?? "none"}"`
    )
    .join("\n") || "  None yet."
}`;

  let aiPart: {
    literacyHighlights: string[];
    growthAreas: string[];
    parentRecommendations: string[];
    overallSummary: string;
  };

  if (!process.env.OPENAI_API_KEY) {
    aiPart = {
      literacyHighlights: [
        `${user.name} has completed ${lessonsCompleted} lessons and ${questsRow.n} quests.`,
        "Shows initiative in exploring the paper trading simulator.",
      ],
      growthAreas: [
        "Encourage more detailed written reasoning before each trade.",
        "Discuss long-term investing concepts at home.",
      ],
      parentRecommendations: [
        "Ask your child to explain their last trade at dinner.",
        "Read a short financial article together once a week.",
      ],
      overallSummary: `${user.name} is building foundational financial literacy skills through hands-on simulated trading and structured lessons. Consistent engagement with the platform will strengthen their decision-making skills over time.`,
    };
  } else {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: dataContext },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });
    aiPart = JSON.parse(
      completion.choices[0].message.content ?? "{}"
    ) as typeof aiPart;
  }

  return {
    studentName: user.name,
    reportDate: new Date().toISOString().split("T")[0],
    totalXpEarned: questsRow.xp,
    lessonsCompleted,
    questsCompleted: questsRow.n,
    totalTrades: tradesRow.n,
    averageDecisionScore:
      tradesRow.avg_score !== null
        ? parseFloat(tradesRow.avg_score.toFixed(1))
        : null,
    portfolioValue,
    startingBalance: 10000,
    ...aiPart,
  };
}
