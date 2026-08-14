/**
 * Lessons module – short-form financial learning content.
 */

import { randomUUID as uuid } from "crypto";
import { getDb } from "./db";

export interface Lesson {
  id: string;
  title: string;
  body: string;
  category: string;
  difficulty: number;
  durationSeconds: number;
  completedAt?: string;
  score?: number;
}

export function listLessons(userId: string): Lesson[] {
  const db = getDb();

  const lessons = db
    .prepare(
      `SELECT id, title, body, category, difficulty, duration_s
       FROM lessons ORDER BY sort_order`
    )
    .all() as {
    id: string;
    title: string;
    body: string;
    category: string;
    difficulty: number;
    duration_s: number;
  }[];

  const completions = db
    .prepare(
      "SELECT lesson_id, score, completed_at FROM lesson_completions WHERE user_id=?"
    )
    .all(userId) as {
    lesson_id: string;
    score: number | null;
    completed_at: string;
  }[];

  const completionMap = new Map(completions.map((c) => [c.lesson_id, c]));

  return lessons.map((l) => {
    const c = completionMap.get(l.id);
    return {
      id: l.id,
      title: l.title,
      body: l.body,
      category: l.category,
      difficulty: l.difficulty,
      durationSeconds: l.duration_s,
      completedAt: c?.completed_at,
      score: c?.score ?? undefined,
    };
  });
}

export function completeLesson(
  userId: string,
  lessonId: string,
  score?: number
): { message: string } {
  const db = getDb();

  const lesson = db
    .prepare("SELECT id FROM lessons WHERE id=?")
    .get(lessonId) as { id: string } | undefined;
  if (!lesson) throw new Error("Lesson not found");

  // Upsert: mark complete (allow re-completion to update score)
  const existing = db
    .prepare(
      "SELECT id FROM lesson_completions WHERE user_id=? AND lesson_id=?"
    )
    .get(userId, lessonId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE lesson_completions SET score=?, completed_at=datetime('now') WHERE id=?"
    ).run(score ?? null, existing.id);
  } else {
    db.prepare(
      `INSERT INTO lesson_completions (id, user_id, lesson_id, score)
       VALUES (?,?,?,?)`
    ).run(uuid(), userId, lessonId, score ?? null);
  }

  return { message: "Lesson marked as complete." };
}
