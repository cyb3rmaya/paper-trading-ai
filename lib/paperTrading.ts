/**
 * Paper-trading engine.
 * Executes buy/sell orders against simulated market prices
 * and persists positions to the portfolio table.
 */

import { randomUUID as uuid } from "crypto";
import { getDb } from "./db";
import { getQuote } from "./market";

export interface TradeRequest {
  userId: string;
  symbol: string;
  action: "buy" | "sell";
  quantity: number;
  reasoning?: string;
}

export interface TradeResult {
  tradeId: string;
  symbol: string;
  action: "buy" | "sell";
  quantity: number;
  price: number;
  totalValue: number;
  newBalance: number;
  error?: never;
}

export interface TradeError {
  error: string;
}

export type TradeOutcome = TradeResult | TradeError;

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface PortfolioSummary {
  balance: number;
  positions: PortfolioPosition[];
  totalMarketValue: number;
  totalUnrealizedPnl: number;
  totalValue: number;
}

export function executeTrade(req: TradeRequest): TradeOutcome {
  const db = getDb();

  const user = db
    .prepare("SELECT id, balance FROM users WHERE id = ?")
    .get(req.userId) as { id: string; balance: number } | undefined;

  if (!user) return { error: "User not found" };
  if (req.quantity <= 0) return { error: "Quantity must be positive" };

  const quote = getQuote(req.symbol.toUpperCase());
  if (!quote) return { error: `Unknown symbol: ${req.symbol}` };

  const totalValue = parseFloat((quote.price * req.quantity).toFixed(2));

  if (req.action === "buy") {
    if (user.balance < totalValue) {
      return { error: "Insufficient funds" };
    }

    const tradeId = uuid();
    const doTrade = db.transaction(() => {
      db.prepare(
        `INSERT INTO trades (id,user_id,symbol,action,quantity,price,reasoning)
         VALUES (?,?,?,?,?,?,?)`
      ).run(
        tradeId,
        req.userId,
        req.symbol.toUpperCase(),
        "buy",
        req.quantity,
        quote.price,
        req.reasoning ?? null
      );

      const existing = db
        .prepare(
          "SELECT id, quantity, avg_cost FROM portfolio WHERE user_id=? AND symbol=?"
        )
        .get(req.userId, req.symbol.toUpperCase()) as
        | { id: string; quantity: number; avg_cost: number }
        | undefined;

      if (existing) {
        const newQty = existing.quantity + req.quantity;
        const newAvg =
          (existing.quantity * existing.avg_cost + totalValue) / newQty;
        db.prepare(
          "UPDATE portfolio SET quantity=?, avg_cost=? WHERE id=?"
        ).run(parseFloat(newQty.toFixed(6)), parseFloat(newAvg.toFixed(4)), existing.id);
      } else {
        db.prepare(
          `INSERT INTO portfolio (id,user_id,symbol,quantity,avg_cost) VALUES (?,?,?,?,?)`
        ).run(
          uuid(),
          req.userId,
          req.symbol.toUpperCase(),
          req.quantity,
          quote.price
        );
      }

      const newBalance = parseFloat((user.balance - totalValue).toFixed(2));
      db.prepare("UPDATE users SET balance=? WHERE id=?").run(
        newBalance,
        req.userId
      );
      return newBalance;
    });

    const newBalance = doTrade() as number;
    return {
      tradeId,
      symbol: req.symbol.toUpperCase(),
      action: "buy",
      quantity: req.quantity,
      price: quote.price,
      totalValue,
      newBalance,
    };
  } else {
    // sell
    const position = db
      .prepare(
        "SELECT id, quantity FROM portfolio WHERE user_id=? AND symbol=?"
      )
      .get(req.userId, req.symbol.toUpperCase()) as
      | { id: string; quantity: number }
      | undefined;

    if (!position || position.quantity < req.quantity) {
      return { error: "Insufficient shares to sell" };
    }

    const tradeId = uuid();
    const doSell = db.transaction(() => {
      db.prepare(
        `INSERT INTO trades (id,user_id,symbol,action,quantity,price,reasoning)
         VALUES (?,?,?,?,?,?,?)`
      ).run(
        tradeId,
        req.userId,
        req.symbol.toUpperCase(),
        "sell",
        req.quantity,
        quote.price,
        req.reasoning ?? null
      );

      const newQty = parseFloat(
        (position.quantity - req.quantity).toFixed(6)
      );
      if (newQty < 0.000001) {
        db.prepare("DELETE FROM portfolio WHERE id=?").run(position.id);
      } else {
        db.prepare("UPDATE portfolio SET quantity=? WHERE id=?").run(
          newQty,
          position.id
        );
      }

      const newBalance = parseFloat((user.balance + totalValue).toFixed(2));
      db.prepare("UPDATE users SET balance=? WHERE id=?").run(
        newBalance,
        req.userId
      );
      return newBalance;
    });

    const newBalance = doSell() as number;
    return {
      tradeId,
      symbol: req.symbol.toUpperCase(),
      action: "sell",
      quantity: req.quantity,
      price: quote.price,
      totalValue,
      newBalance,
    };
  }
}

export function getPortfolio(userId: string): PortfolioSummary {
  const db = getDb();

  const user = db
    .prepare("SELECT balance FROM users WHERE id=?")
    .get(userId) as { balance: number } | undefined;

  const balance = user?.balance ?? 0;

  const rows = db
    .prepare(
      "SELECT symbol, quantity, avg_cost FROM portfolio WHERE user_id=? AND quantity > 0"
    )
    .all(userId) as { symbol: string; quantity: number; avg_cost: number }[];

  let totalMarketValue = 0;
  let totalUnrealizedPnl = 0;

  const positions: PortfolioPosition[] = rows.map((r) => {
    const quote = getQuote(r.symbol);
    const currentPrice = quote?.price ?? r.avg_cost;
    const marketValue = parseFloat((currentPrice * r.quantity).toFixed(2));
    const costBasis = parseFloat((r.avg_cost * r.quantity).toFixed(2));
    const unrealizedPnl = parseFloat((marketValue - costBasis).toFixed(2));
    const unrealizedPnlPct =
      costBasis > 0
        ? parseFloat(((unrealizedPnl / costBasis) * 100).toFixed(2))
        : 0;

    totalMarketValue += marketValue;
    totalUnrealizedPnl += unrealizedPnl;

    return {
      symbol: r.symbol,
      quantity: r.quantity,
      avgCost: r.avg_cost,
      currentPrice,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct,
    };
  });

  return {
    balance,
    positions,
    totalMarketValue: parseFloat(totalMarketValue.toFixed(2)),
    totalUnrealizedPnl: parseFloat(totalUnrealizedPnl.toFixed(2)),
    totalValue: parseFloat((balance + totalMarketValue).toFixed(2)),
  };
}

export function getTradeHistory(userId: string, limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, symbol, action, quantity, price, reasoning, ai_analysis,
              decision_score, executed_at
       FROM trades WHERE user_id=? ORDER BY executed_at DESC LIMIT ?`
    )
    .all(userId, limit);
}
