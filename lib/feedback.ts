/**
 * Personalized AI feedback module.
 * Generates holistic coaching feedback based on a student's activity.
 */

import OpenAI from "openai";
import { randomUUID as uuid } from "crypto";
import { getDb } from "./db";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface FeedbackItem {
  id: string;
  category: string;
  content: string;
  createdAt: string;
}

export interface PersonalizedFeedback {
  strengths: string[];
  areasToImprove: string[];
  nextSteps: string[];
  encouragement: string;
  saved: FeedbackItem;
}

/**
 * Generate and persist personalized feedback for a student
 * based on their recent trades, lesson completions, and quest activity.
 */
export async function generateFeedback(
  userId: string
): Promise<PersonalizedFeedback> {
  const db = getDb();

  const user = db
    .prepare("SELECT name FROM users WHERE id=?")
    .get(userId) as { name: string } | undefined;
  if (!user) throw new Error("User not found");

  const trades = db
    .prepare(
      `SELECT symbol, action, reasoning, decision_score, ai_analysis
       FROM trades WHERE user_id=? ORDER BY executed_at DESC LIMIT 10`
    )
    .all(userId) as {
    symbol: string;
    action: string;
    reasoning: string | null;
    decision_score: number | null;
    ai_analysis: string | null;
  }[];

  const completedLessons = db
    .prepare(
      `SELECT l.title, lc.score FROM lesson_completions lc
       JOIN lessons l ON l.id = lc.lesson_id
       WHERE lc.user_id=? ORDER BY lc.completed_at DESC LIMIT 10`
    )
    .all(userId) as { title: string; score: number | null }[];

  const completedQuests = db
    .prepare(
      `SELECT q.title, qc.reflection, qc.xp_earned FROM quest_completions qc
       JOIN quests q ON q.id = qc.quest_id
       WHERE qc.user_id=? ORDER BY qc.completed_at DESC LIMIT 10`
    )
    .all(userId) as {
    title: string;
    reflection: string | null;
    xp_earned: number;
  }[];

  const systemPrompt = `You are a warm, encouraging financial education coach for young learners.
Generate personalised feedback based on the student's recent activity.
Focus on growth, reasoning quality, and financial literacy — NOT on profit/loss.
Respond with ONLY valid JSON matching this schema:
{
  "strengths": [<string>, ...],
  "areasToImprove": [<string>, ...],
  "nextSteps": [<string>, ...],
  "encouragement": <string, 1-2 sentences>
}`;

  const activitySummary = `Student: ${user.name}
Recent trades (${trades.length}):
${
  trades
    .map(
      (t) =>
        `  - ${t.action} ${t.symbol} | reasoning score: ${t.decision_score ?? "unscored"} | reasoning: "${t.reasoning ?? "none"}"`
    )
    .join("\n") || "  No trades yet."
}

Completed lessons (${completedLessons.length}):
${completedLessons.map((l) => `  - ${l.title}`).join("\n") || "  None yet."}

Completed quests (${completedQuests.length}):
${
  completedQuests
    .map(
      (q) =>
        `  - ${q.title} | reflection: "${q.reflection ?? "none"}"`
    )
    .join("\n") || "  None yet."
}`;

  let result: Omit<PersonalizedFeedback, "saved">;

  if (!process.env.OPENAI_API_KEY) {
    result = {
      strengths: ["You are actively engaging with the platform."],
      areasToImprove: [
        "Try adding more detailed reasoning when you make trades.",
        "Complete more lessons to build your financial knowledge.",
      ],
      nextSteps: [
        "Finish at least one lesson today.",
        "Write a 2-sentence reasoning next time you trade.",
      ],
      encouragement:
        "Great start! Every expert investor was once a beginner. Keep going!",
    };
  } else {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: activitySummary },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });
    const raw = completion.choices[0].message.content ?? "{}";
    result = JSON.parse(raw) as Omit<PersonalizedFeedback, "saved">;
  }

  const content = JSON.stringify(result);
  const feedbackId = uuid();
  db.prepare(
    `INSERT INTO feedback (id, user_id, content, category) VALUES (?,?,?,'personalized')`
  ).run(feedbackId, userId, content);

  // re-fetch to get created_at from DB
  const saved = db
    .prepare("SELECT id, category, content, created_at FROM feedback WHERE id=?")
    .get(feedbackId) as {
    id: string;
    category: string;
    content: string;
    created_at: string;
  };

  return {
    ...result,
    saved: {
      id: saved.id,
      category: saved.category,
      content: saved.content,
      createdAt: saved.created_at,
    },
  };
}

/** Return the most recent feedback items for a user. */
export function getFeedbackHistory(userId: string, limit = 10): FeedbackItem[] {
  const db = getDb();
  return (
    db
      .prepare(
        `SELECT id, category, content, created_at FROM feedback
       WHERE user_id=? ORDER BY created_at DESC LIMIT ?`
      )
      .all(userId, limit) as {
      id: string;
      category: string;
      content: string;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    category: r.category,
    content: r.content,
    createdAt: r.created_at,
  }));
}
