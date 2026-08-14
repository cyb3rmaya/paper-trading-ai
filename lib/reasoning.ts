/**
 * AI-powered decision-reasoning analysis.
 * Evaluates WHY the user made a trade, not just the outcome.
 */

import OpenAI from "openai";
import { getDb } from "./db";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface ReasoningAnalysis {
  score: number; // 1-10 quality of reasoning
  strengths: string[];
  improvements: string[];
  conceptsCovered: string[];
  summary: string;
}

/**
 * Analyse the reasoning behind a trade.
 * Returns structured feedback and persists it back to the trade record.
 */
export async function analyseTradeReasoning(
  tradeId: string
): Promise<ReasoningAnalysis> {
  const db = getDb();

  const trade = db
    .prepare(
      `SELECT t.*, u.name as user_name
       FROM trades t JOIN users u ON u.id = t.user_id
       WHERE t.id = ?`
    )
    .get(tradeId) as
    | {
        id: string;
        symbol: string;
        action: string;
        quantity: number;
        price: number;
        reasoning: string | null;
        user_name: string;
      }
    | undefined;

  if (!trade) throw new Error(`Trade ${tradeId} not found`);

  const reasoning = trade.reasoning?.trim() || "(no reasoning provided)";

  const systemPrompt = `You are a financial education coach for young learners (ages 12-18).
Evaluate the quality of the student's investment reasoning — NOT the outcome of the trade.
Focus on:
- Did they articulate a clear rationale?
- Did they mention risk?
- Did they reference any research or financial concepts?
- Is their thinking long-term or short-term focused?
Respond with ONLY valid JSON matching this schema:
{
  "score": <integer 1-10>,
  "strengths": [<string>, ...],
  "improvements": [<string>, ...],
  "conceptsCovered": [<string>, ...],
  "summary": <string, 1-2 sentences>
}`;

  const userMessage = `Student: ${trade.user_name}
Trade: ${trade.action.toUpperCase()} ${trade.quantity} shares of ${trade.symbol} at $${trade.price}
Reasoning: "${reasoning}"`;

  let analysis: ReasoningAnalysis;

  if (!process.env.OPENAI_API_KEY) {
    // Stub response when no API key is configured (development/testing)
    analysis = {
      score: 5,
      strengths: ["Attempted to articulate a reason for the trade."],
      improvements: [
        "Consider referencing specific financial metrics or research.",
        "Discuss your risk tolerance and time horizon.",
      ],
      conceptsCovered: [],
      summary:
        "The reasoning shows early-stage investment thinking. Keep practising!",
    };
  } else {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    analysis = JSON.parse(raw) as ReasoningAnalysis;
  }

  // Persist to trade record
  db.prepare(
    "UPDATE trades SET ai_analysis=?, decision_score=? WHERE id=?"
  ).run(JSON.stringify(analysis), analysis.score, tradeId);

  return analysis;
}
