/**
 * Quests module – financial decision challenges that reward reasoning.
 */

import { randomUUID as uuid } from "crypto";
import { getDb } from "./db";

export interface Quest {
  id: string;
  title: string;
  description: string;
  objective: string;
  xpReward: number;
  difficulty: number;
  completedAt?: string;
  reflection?: string;
  aiFeedback?: string;
  xpEarned?: number;
}

export function listQuests(userId: string): Quest[] {
  const db = getDb();

  const quests = db
    .prepare("SELECT id, title, description, objective, xp_reward, difficulty FROM quests ORDER BY difficulty, id")
    .all() as {
    id: string;
    title: string;
    description: string;
    objective: string;
    xp_reward: number;
    difficulty: number;
  }[];

  const completions = db
    .prepare(
      `SELECT quest_id, reflection, ai_feedback, xp_earned, completed_at
       FROM quest_completions WHERE user_id=?`
    )
    .all(userId) as {
    quest_id: string;
    reflection: string | null;
    ai_feedback: string | null;
    xp_earned: number;
    completed_at: string;
  }[];

  const completionMap = new Map(completions.map((c) => [c.quest_id, c]));

  return quests.map((q) => {
    const completion = completionMap.get(q.id);
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      objective: q.objective,
      xpReward: q.xp_reward,
      difficulty: q.difficulty,
      completedAt: completion?.completed_at,
      reflection: completion?.reflection ?? undefined,
      aiFeedback: completion?.ai_feedback ?? undefined,
      xpEarned: completion?.xp_earned,
    };
  });
}

export function completeQuest(
  userId: string,
  questId: string,
  reflection: string
): { xpEarned: number; message: string } {
  const db = getDb();

  const quest = db
    .prepare("SELECT id, xp_reward FROM quests WHERE id=?")
    .get(questId) as { id: string; xp_reward: number } | undefined;
  if (!quest) throw new Error("Quest not found");

  // Allow re-completion but track each submission
  const xpEarned = quest.xp_reward;
  db.prepare(
    `INSERT INTO quest_completions (id, user_id, quest_id, reflection, xp_earned)
     VALUES (?,?,?,?,?)`
  ).run(uuid(), userId, questId, reflection, xpEarned);

  return {
    xpEarned,
    message: `Quest completed! You earned ${xpEarned} XP.`,
  };
}

export function getTotalXp(userId: string): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(xp_earned),0) as total FROM quest_completions WHERE user_id=?"
    )
    .get(userId) as { total: number };
  return row.total;
}
