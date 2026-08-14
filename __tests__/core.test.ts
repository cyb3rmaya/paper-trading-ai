/**
 * Tests for core platform modules:
 * - User creation
 * - Lesson listing & completion
 * - Quest listing & completion
 * - Paper trading (buy/sell, portfolio)
 * - Market quotes
 */

import path from "path";
import fs from "fs";
import os from "os";

// Use a temporary database for tests
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "finlearn-test-"));
process.env.DB_DIR = tmpDir;

// Import modules AFTER setting DB_DIR so the db is created in tmpDir
import { createUser, getUser, getChildren } from "@/lib/users";
import { listLessons, completeLesson } from "@/lib/lessons";
import { listQuests, completeQuest, getTotalXp } from "@/lib/quests";
import {
  executeTrade,
  getPortfolio,
  getTradeHistory,
} from "@/lib/paperTrading";
import { getAllQuotes, getQuote } from "@/lib/market";

afterAll(() => {
  // Clean up temp db
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────

describe("Users", () => {
  let parentId: string;
  let studentId: string;

  it("creates a parent user", () => {
    const parent = createUser("Alice Parent", "parent");
    expect(parent.id).toBeTruthy();
    expect(parent.role).toBe("parent");
    expect(parent.balance).toBe(10000);
    parentId = parent.id;
  });

  it("creates a student linked to the parent", () => {
    const student = createUser("Bob Student", "student", parentId);
    expect(student.role).toBe("student");
    expect(student.parentId).toBe(parentId);
    studentId = student.id;
  });

  it("retrieves a user by id", () => {
    const u = getUser(studentId);
    expect(u?.name).toBe("Bob Student");
  });

  it("returns null for non-existent user", () => {
    expect(getUser("does-not-exist")).toBeNull();
  });

  it("lists children of a parent", () => {
    const kids = getChildren(parentId);
    expect(kids.length).toBe(1);
    expect(kids[0].name).toBe("Bob Student");
  });

  it("throws when creating student with non-existent parent", () => {
    expect(() => createUser("Orphan", "student", "bad-parent-id")).toThrow();
  });
});

// ─── Lessons ──────────────────────────────────────────────────────────────────

describe("Lessons", () => {
  let userId: string;

  beforeAll(() => {
    userId = createUser("Learner", "student").id;
  });

  it("lists seeded lessons", () => {
    const lessons = listLessons(userId);
    expect(lessons.length).toBeGreaterThanOrEqual(8);
    expect(lessons[0].title).toBeTruthy();
    expect(lessons[0].completedAt).toBeUndefined();
  });

  it("marks a lesson complete", () => {
    const lessons = listLessons(userId);
    const first = lessons[0];
    const result = completeLesson(userId, first.id, 85);
    expect(result.message).toMatch(/complete/i);

    const updated = listLessons(userId).find((l) => l.id === first.id)!;
    expect(updated.completedAt).toBeTruthy();
    expect(updated.score).toBe(85);
  });

  it("re-completing a lesson updates the score", () => {
    const lessons = listLessons(userId);
    const first = lessons[0];
    completeLesson(userId, first.id, 95);
    const updated = listLessons(userId).find((l) => l.id === first.id)!;
    expect(updated.score).toBe(95);
  });

  it("throws for unknown lesson id", () => {
    expect(() => completeLesson(userId, "bad-id")).toThrow();
  });
});

// ─── Quests ───────────────────────────────────────────────────────────────────

describe("Quests", () => {
  let userId: string;

  beforeAll(() => {
    userId = createUser("Quester", "student").id;
  });

  it("lists seeded quests", () => {
    const { quests } = { quests: listQuests(userId) };
    expect(quests.length).toBeGreaterThanOrEqual(5);
    expect(quests[0].xpReward).toBeGreaterThan(0);
  });

  it("starts with 0 XP", () => {
    expect(getTotalXp(userId)).toBe(0);
  });

  it("completes a quest and awards XP", () => {
    const quests = listQuests(userId);
    const q = quests[0];
    const result = completeQuest(userId, q.id, "I learned that stocks represent ownership.");
    expect(result.xpEarned).toBe(q.xpReward);
    expect(getTotalXp(userId)).toBe(q.xpReward);
  });

  it("throws for unknown quest id", () => {
    expect(() => completeQuest(userId, "bad-quest", "reflection")).toThrow();
  });
});

// ─── Paper Trading ────────────────────────────────────────────────────────────

describe("Paper Trading", () => {
  let userId: string;

  beforeAll(() => {
    userId = createUser("Trader", "student").id;
  });

  it("starts with empty portfolio and $10,000 balance", () => {
    const p = getPortfolio(userId);
    expect(p.balance).toBe(10000);
    expect(p.positions).toHaveLength(0);
  });

  it("buys shares and deducts balance", () => {
    const result = executeTrade({
      userId,
      symbol: "AAPL",
      action: "buy",
      quantity: 5,
      reasoning: "Apple has a strong brand and consistent earnings growth.",
    });

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.symbol).toBe("AAPL");
      expect(result.action).toBe("buy");
      expect(result.quantity).toBe(5);
      expect(result.price).toBeGreaterThan(0);
      expect(result.newBalance).toBeLessThan(10000);
    }
  });

  it("portfolio reflects the purchase", () => {
    const p = getPortfolio(userId);
    expect(p.positions.length).toBe(1);
    expect(p.positions[0].symbol).toBe("AAPL");
    expect(p.positions[0].quantity).toBe(5);
  });

  it("sells shares and increases balance", () => {
    const before = getPortfolio(userId).balance;
    const result = executeTrade({
      userId,
      symbol: "AAPL",
      action: "sell",
      quantity: 2,
      reasoning: "Taking partial profit after strong run.",
    });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.action).toBe("sell");
      expect(result.newBalance).toBeGreaterThan(before);
    }
  });

  it("portfolio quantity updates after partial sell", () => {
    const p = getPortfolio(userId);
    expect(p.positions[0].quantity).toBe(3);
  });

  it("rejects buy with insufficient funds", () => {
    const result = executeTrade({
      userId,
      symbol: "MSFT",
      action: "buy",
      quantity: 100000,
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatch(/insufficient/i);
    }
  });

  it("rejects sell with insufficient shares", () => {
    const result = executeTrade({
      userId,
      symbol: "AAPL",
      action: "sell",
      quantity: 1000,
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatch(/insufficient/i);
    }
  });

  it("rejects trade for unknown symbol", () => {
    const result = executeTrade({
      userId,
      symbol: "FAKE",
      action: "buy",
      quantity: 1,
    });
    expect("error" in result).toBe(true);
  });

  it("returns trade history", () => {
    const history = getTradeHistory(userId);
    // bought 5, sold 2 → 2 records
    expect(history.length).toBe(2);
  });
});

// ─── Market ───────────────────────────────────────────────────────────────────

describe("Market Quotes", () => {
  it("returns all seeded quotes", () => {
    const quotes = getAllQuotes();
    expect(quotes.length).toBeGreaterThanOrEqual(10);
    quotes.forEach((q) => {
      expect(q.price).toBeGreaterThan(0);
      expect(q.symbol).toBeTruthy();
    });
  });

  it("returns a single quote with simulated fluctuation", () => {
    const q = getQuote("MSFT");
    expect(q).not.toBeNull();
    expect(q!.price).toBeGreaterThan(0);
  });

  it("returns null for unknown symbol", () => {
    const q = getQuote("NOTREAL");
    expect(q).toBeNull();
  });
});
