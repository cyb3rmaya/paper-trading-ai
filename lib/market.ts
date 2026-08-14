/**
 * Simulated market prices for paper trading.
 * In production this could be replaced with a real market data feed.
 */

import { getDb } from "./db";

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

/** Return the latest simulated price for a symbol. */
export function getQuote(symbol: string): Quote | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT symbol, price FROM price_history
       WHERE symbol = ? ORDER BY recorded_at DESC LIMIT 1`
    )
    .get(symbol) as { symbol: string; price: number } | undefined;
  if (!row) return null;

  // Simulate a small random fluctuation (±0.5 %) to make prices feel live
  const pct = (Math.random() - 0.5) * 0.01;
  const newPrice = parseFloat((row.price * (1 + pct)).toFixed(2));
  const change = parseFloat((newPrice - row.price).toFixed(2));
  const changePercent = parseFloat((pct * 100).toFixed(3));

  // Persist the new simulated price
  db.prepare(
    `INSERT INTO price_history (id,symbol,price) VALUES (lower(hex(randomblob(8))),?,?)`
  ).run(symbol, newPrice);

  return { symbol, price: newPrice, change, changePercent };
}

/** Return all available symbols with their latest prices. */
export function getAllQuotes(): Quote[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT symbol, price FROM price_history p1
       WHERE recorded_at = (
         SELECT MAX(p2.recorded_at) FROM price_history p2 WHERE p2.symbol = p1.symbol
       )
       GROUP BY symbol`
    )
    .all() as { symbol: string; price: number }[];

  return rows.map((r) => {
    const pct = (Math.random() - 0.5) * 0.01;
    const newPrice = parseFloat((r.price * (1 + pct)).toFixed(2));
    const change = parseFloat((newPrice - r.price).toFixed(2));

    db.prepare(
      `INSERT INTO price_history (id,symbol,price) VALUES (lower(hex(randomblob(8))),?,?)`
    ).run(r.symbol, newPrice);

    return {
      symbol: r.symbol,
      price: newPrice,
      change,
      changePercent: parseFloat((pct * 100).toFixed(3)),
    };
  });
}
