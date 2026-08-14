# FinLearn – AI-Powered Financial Education Platform

An AI-powered financial literacy and paper trading platform for young learners, built with Next.js 16, TypeScript, SQLite, and OpenAI.

## Features

| Feature | Description |
|---|---|
| 📚 Short-Form Lessons | 8 bite-sized financial concept lessons (stocks, risk, charts, dividends, compound interest, etc.) |
| 🏆 Quests | Financial decision challenges where students earn XP by reflecting on their thinking |
| 📈 Paper Trading | Simulated stock market with 10 pre-seeded equities; buy/sell with a $10,000 virtual balance |
| 🧠 Decision-Reasoning Analysis | Every trade is evaluated by AI for reasoning quality — not profit/loss |
| 💬 Personalized Feedback | AI coach generates individualised feedback based on trading, lessons, and quests |
| 📋 Parent Reports | AI-written progress reports focused on financial literacy growth for parents |

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: SQLite via `better-sqlite3` (zero-config, file-based)
- **AI**: OpenAI `gpt-4o-mini` for reasoning analysis, feedback, and reports
- **Styling**: Tailwind CSS v4
- **Testing**: Jest + ts-jest (26 tests)

## Getting Started

```bash
# Install dependencies
npm install

# (Optional) Configure OpenAI for AI features
cp .env.example .env.local
# Then add your OPENAI_API_KEY to .env.local

# Run in development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **No API key needed for development.** All AI features return sensible stub responses when `OPENAI_API_KEY` is not set.

## Project Structure

```
lib/
  db.ts            – SQLite schema, migrations, and seed data
  market.ts        – Simulated market price engine
  paperTrading.ts  – Buy/sell execution and portfolio management
  reasoning.ts     – AI decision-reasoning analysis
  feedback.ts      – AI personalized coaching feedback
  reports.ts       – AI parent progress reports
  lessons.ts       – Short-form lesson management
  quests.ts        – Quest challenges and XP system
  users.ts         – User management (student / parent roles)

app/
  page.tsx          – Dashboard
  lessons/page.tsx  – Short-form learning hub
  quests/page.tsx   – Quest challenges
  trading/page.tsx  – Paper trading simulator
  reports/page.tsx  – Parent progress report

  api/
    users/route.ts
    lessons/route.ts
    quests/route.ts
    trades/route.ts
    feedback/route.ts
    reports/route.ts
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create a student or parent user |
| GET | `/api/users?id=` | Get a user by ID |
| GET | `/api/lessons?userId=` | List all lessons with completion status |
| POST | `/api/lessons` | Mark a lesson complete |
| GET | `/api/quests?userId=` | List all quests with XP totals |
| POST | `/api/quests` | Complete a quest with reflection |
| GET | `/api/trades?userId=&view=portfolio` | Get portfolio summary |
| GET | `/api/trades?userId=&view=quotes` | Get live (simulated) market prices |
| GET | `/api/trades?userId=&view=history` | Get trade history |
| POST | `/api/trades` | Execute a paper trade |
| GET | `/api/feedback?userId=` | Get feedback history |
| POST | `/api/feedback` | Generate new AI feedback |
| GET | `/api/reports?studentId=` | Generate parent progress report |

## Running Tests

```bash
npm test
```

26 tests covering users, lessons, quests, paper trading, and market quotes.

## Design Philosophy

> **Reward reasoning, not returns.**

The platform deliberately does not rank students by portfolio performance. Instead:
- Every trade prompts the student to explain *why* they're making it
- AI analyses the quality of reasoning (clarity, risk awareness, time horizon)
- Quest XP is earned through reflection, not profitable trades
- Parent reports focus on financial literacy concepts learned, not gains/losses
