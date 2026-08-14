import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_DIR ?? path.join(process.cwd(), ".data");
const DB_PATH = path.join(DB_DIR, "paptrading.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('student','parent')),
      parent_id   TEXT REFERENCES users(id),
      balance     REAL NOT NULL DEFAULT 10000,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      category    TEXT NOT NULL,
      difficulty  INTEGER NOT NULL DEFAULT 1 CHECK(difficulty BETWEEN 1 AND 3),
      duration_s  INTEGER NOT NULL DEFAULT 60,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lesson_completions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      lesson_id   TEXT NOT NULL REFERENCES lessons(id),
      score       INTEGER,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quests (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      objective   TEXT NOT NULL,
      xp_reward   INTEGER NOT NULL DEFAULT 100,
      difficulty  INTEGER NOT NULL DEFAULT 1 CHECK(difficulty BETWEEN 1 AND 3)
    );

    CREATE TABLE IF NOT EXISTS quest_completions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      quest_id    TEXT NOT NULL REFERENCES quests(id),
      reflection  TEXT,
      ai_feedback TEXT,
      xp_earned   INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trades (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      symbol      TEXT NOT NULL,
      action      TEXT NOT NULL CHECK(action IN ('buy','sell')),
      quantity    REAL NOT NULL,
      price       REAL NOT NULL,
      reasoning   TEXT,
      ai_analysis TEXT,
      decision_score INTEGER,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      symbol      TEXT NOT NULL,
      quantity    REAL NOT NULL DEFAULT 0,
      avg_cost    REAL NOT NULL DEFAULT 0,
      UNIQUE(user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      content     TEXT NOT NULL,
      category    TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id          TEXT PRIMARY KEY,
      symbol      TEXT NOT NULL,
      price       REAL NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedIfEmpty(db);
}

function seedIfEmpty(db: Database.Database): void {
  const lessonCount = (
    db.prepare("SELECT COUNT(*) as n FROM lessons").get() as { n: number }
  ).n;
  if (lessonCount > 0) return;

  const lessons = [
    {
      id: "l1",
      title: "What Is a Stock?",
      body: "A stock represents a share of ownership in a company. When a company wants to raise money, it can sell small pieces of itself called shares. Buying a stock makes you a part-owner (shareholder) of that company.",
      category: "basics",
      difficulty: 1,
      duration_s: 90,
      sort_order: 1,
    },
    {
      id: "l2",
      title: "Understanding Risk vs. Reward",
      body: "Higher potential returns usually come with higher risk. A savings account is low-risk / low-reward. Individual stocks can be high-risk / high-reward. Diversification – spreading money across many investments – helps manage risk.",
      category: "risk",
      difficulty: 1,
      duration_s: 120,
      sort_order: 2,
    },
    {
      id: "l3",
      title: "How to Read a Stock Chart",
      body: "A stock chart plots price over time. The horizontal axis is time; the vertical axis is price. A candlestick chart shows the open, high, low, and closing prices for each period. A rising line means price increased; falling means it decreased.",
      category: "analysis",
      difficulty: 2,
      duration_s: 150,
      sort_order: 3,
    },
    {
      id: "l4",
      title: "What Are Dividends?",
      body: "Some companies share profits with shareholders as dividends – regular cash payments per share. Dividend-paying stocks can provide steady income on top of any price appreciation.",
      category: "basics",
      difficulty: 1,
      duration_s: 90,
      sort_order: 4,
    },
    {
      id: "l5",
      title: "The Power of Compound Interest",
      body: "Compound interest means earning interest on your interest. If you invest $1,000 at 10% per year: Year 1 → $1,100; Year 2 → $1,210; Year 10 → ~$2,594. Starting early dramatically multiplies your wealth.",
      category: "savings",
      difficulty: 1,
      duration_s: 120,
      sort_order: 5,
    },
    {
      id: "l6",
      title: "Fundamental vs. Technical Analysis",
      body: "Fundamental analysis studies a company's financials (earnings, revenue, debt) to decide if its stock is fairly priced. Technical analysis studies price charts and patterns to predict future movements. Most investors use both.",
      category: "analysis",
      difficulty: 2,
      duration_s: 180,
      sort_order: 6,
    },
    {
      id: "l7",
      title: "Market Orders vs. Limit Orders",
      body: "A market order buys or sells a stock immediately at the best available price. A limit order only executes at the price you specify or better. Limit orders give you price control but may not fill right away.",
      category: "mechanics",
      difficulty: 2,
      duration_s: 120,
      sort_order: 7,
    },
    {
      id: "l8",
      title: "Inflation and Purchasing Power",
      body: "Inflation means prices rise over time, so a dollar today buys more than a dollar tomorrow. If inflation is 3% per year and your savings earn 1%, your purchasing power is actually shrinking. Investing aims to beat inflation.",
      category: "economics",
      difficulty: 2,
      duration_s: 120,
      sort_order: 8,
    },
  ];

  const insertLesson = db.prepare(
    `INSERT INTO lessons (id,title,body,category,difficulty,duration_s,sort_order) VALUES (@id,@title,@body,@category,@difficulty,@duration_s,@sort_order)`
  );

  const quests = [
    {
      id: "q1",
      title: "First Buy",
      description:
        "Execute your first paper trade and explain WHY you chose that stock.",
      objective:
        "Buy at least 1 share of any stock and write a 2-sentence reasoning.",
      xp_reward: 150,
      difficulty: 1,
    },
    {
      id: "q2",
      title: "Diversify Your Portfolio",
      description: "Own shares in at least 3 different companies.",
      objective:
        "Hold positions in 3 or more different stock symbols simultaneously.",
      xp_reward: 200,
      difficulty: 2,
    },
    {
      id: "q3",
      title: "Long-term Thinker",
      description:
        "Explain how you would hold a stock for 5 years. What would change your mind?",
      objective:
        "Write a 3-sentence reflection on a long-term investment thesis.",
      xp_reward: 250,
      difficulty: 2,
    },
    {
      id: "q4",
      title: "Risk Manager",
      description:
        "Describe a time you avoided a trade because the risk was too high.",
      objective: "Write a reflection explaining the risk you identified.",
      xp_reward: 200,
      difficulty: 2,
    },
    {
      id: "q5",
      title: "Lesson Learner",
      description: "Complete all 8 short lessons in the learning hub.",
      objective: "Finish every lesson in the platform.",
      xp_reward: 300,
      difficulty: 1,
    },
  ];

  const insertQuest = db.prepare(
    `INSERT INTO quests (id,title,description,objective,xp_reward,difficulty) VALUES (@id,@title,@description,@objective,@xp_reward,@difficulty)`
  );

  const prices = [
    { symbol: "AAPL", price: 213.49 },
    { symbol: "MSFT", price: 415.32 },
    { symbol: "GOOGL", price: 178.02 },
    { symbol: "AMZN", price: 195.89 },
    { symbol: "TSLA", price: 248.5 },
    { symbol: "NVDA", price: 131.38 },
    { symbol: "META", price: 583.72 },
    { symbol: "BRK.B", price: 464.01 },
    { symbol: "JPM", price: 258.47 },
    { symbol: "V", price: 349.22 },
  ];

  const insertPrice = db.prepare(
    `INSERT INTO price_history (id,symbol,price) VALUES (lower(hex(randomblob(8))),@symbol,@price)`
  );

  const seedAll = db.transaction(() => {
    for (const l of lessons) insertLesson.run(l);
    for (const q of quests) insertQuest.run(q);
    for (const p of prices) insertPrice.run(p);

    // Seed a demo parent and student with well-known IDs so the UI works
    // out of the box without any sign-up flow.
    db.prepare(
      `INSERT OR IGNORE INTO users (id, name, role)
       VALUES ('demo-parent', 'Demo Parent', 'parent')`
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO users (id, name, role, parent_id)
       VALUES ('demo-student', 'Alex (Demo Student)', 'student', 'demo-parent')`
    ).run();
  });

  seedAll();
}
