"use client";

import { useState, useEffect } from "react";

const DEMO_USER_ID = "demo-student";

interface Lesson {
  id: string;
  title: string;
  body: string;
  category: string;
  difficulty: number;
  durationSeconds: number;
  completedAt?: string;
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [active, setActive] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/lessons?userId=${DEMO_USER_ID}`);
    if (res.ok) setLessons(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markComplete(lessonId: string) {
    setMarking(true);
    await fetch("/api/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: DEMO_USER_ID, lessonId }),
    });
    setMarking(false);
    setActive(null);
    load();
  }

  const completed = lessons.filter((l) => l.completedAt).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-indigo-600 text-lg animate-pulse">Loading lessons…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📚 Short-Form Lessons</h1>
        <p className="text-gray-600 mt-1">
          {completed} of {lessons.length} lessons completed
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{
              width: lessons.length
                ? `${(completed / lessons.length) * 100}%`
                : "0%",
            }}
          />
        </div>
      </div>

      {active ? (
        <LessonReader
          lesson={active}
          onClose={() => setActive(null)}
          onComplete={() => markComplete(active.id)}
          marking={marking}
        />
      ) : (
        <div className="grid gap-4">
          {lessons.map((l) => (
            <button
              key={l.id}
              onClick={() => setActive(l)}
              className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow w-full"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-base">{l.title}</h3>
                  <div className="flex gap-2 mt-1 text-xs text-gray-500">
                    <span className="capitalize bg-gray-100 rounded px-2 py-0.5">
                      {l.category}
                    </span>
                    <span>{"⭐".repeat(l.difficulty)}</span>
                    <span>~{Math.ceil(l.durationSeconds / 60)} min</span>
                  </div>
                </div>
                {l.completedAt ? (
                  <span className="text-green-600 text-xl">✅</span>
                ) : (
                  <span className="text-gray-400 text-xl">○</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonReader({
  lesson,
  onClose,
  onComplete,
  marking,
}: {
  lesson: Lesson;
  onClose: () => void;
  onComplete: () => void;
  marking: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{lesson.title}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>
      </div>
      <div className="flex gap-2 text-xs text-gray-500">
        <span className="capitalize bg-gray-100 rounded px-2 py-0.5">
          {lesson.category}
        </span>
        <span>{"⭐".repeat(lesson.difficulty)}</span>
        <span>~{Math.ceil(lesson.durationSeconds / 60)} min read</span>
      </div>
      <p className="text-gray-800 leading-relaxed whitespace-pre-line">
        {lesson.body}
      </p>
      {lesson.completedAt ? (
        <p className="text-green-600 font-medium">
          ✅ Completed on {new Date(lesson.completedAt).toLocaleDateString()}
        </p>
      ) : (
        <button
          onClick={onComplete}
          disabled={marking}
          className="bg-indigo-600 text-white rounded-lg px-5 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {marking ? "Saving…" : "Mark as Complete ✓"}
        </button>
      )}
    </div>
  );
}
