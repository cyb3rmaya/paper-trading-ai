"use client";

import { useState, useEffect } from "react";

const DEMO_USER_ID = "demo-student";

interface Quest {
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

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [active, setActive] = useState<Quest | null>(null);
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/quests?userId=${DEMO_USER_ID}`);
    if (res.ok) {
      const d = await res.json();
      setQuests(d.quests ?? []);
      setTotalXp(d.totalXp ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function submit() {
    if (!active || !reflection.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: DEMO_USER_ID,
        questId: active.id,
        reflection,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const d = await res.json();
      showToast(`🎉 ${d.message}`);
      setActive(null);
      setReflection("");
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-indigo-600 text-lg animate-pulse">Loading quests…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white rounded-lg px-4 py-2 shadow-lg z-50">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">🏆 Quests</h1>
        <p className="text-gray-600 mt-1">
          Total XP earned: <strong>{totalXp.toLocaleString()}</strong>
        </p>
      </div>

      {active ? (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{active.title}</h2>
            <button onClick={() => { setActive(null); setReflection(""); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <p className="text-gray-600">{active.description}</p>
          <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
            <strong>Objective:</strong> {active.objective}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Reflection <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={4}
              placeholder="Write your reflection here…"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={submitting || !reflection.trim()}
              className="bg-indigo-600 text-white rounded-lg px-5 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : `Submit & Earn ${active.xpReward} XP`}
            </button>
            <button onClick={() => { setActive(null); setReflection(""); }} className="border border-gray-300 rounded-lg px-5 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {quests.map((q) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{q.title}</h3>
                    <span className="text-xs bg-indigo-100 text-indigo-700 rounded px-2 py-0.5">
                      {q.xpReward} XP
                    </span>
                    <span className="text-xs text-gray-400">{"⭐".repeat(q.difficulty)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{q.description}</p>
                  {q.completedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Completed on {new Date(q.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setActive(q)}
                  className="ml-4 shrink-0 text-sm font-medium text-indigo-600 hover:underline"
                >
                  {q.completedAt ? "Redo" : "Start →"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
