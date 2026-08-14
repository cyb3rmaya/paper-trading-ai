import { NextRequest } from "next/server";
import {
  executeTrade,
  getPortfolio,
  getTradeHistory,
} from "@/lib/paperTrading";
import { analyseTradeReasoning } from "@/lib/reasoning";
import { getAllQuotes } from "@/lib/market";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const view = searchParams.get("view") ?? "portfolio";

  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  if (view === "history") {
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    return Response.json(getTradeHistory(userId, limit));
  }

  if (view === "quotes") {
    return Response.json(getAllQuotes());
  }

  // default: portfolio
  return Response.json(getPortfolio(userId));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, symbol, action, quantity, reasoning } = body as {
    userId?: string;
    symbol?: string;
    action?: string;
    quantity?: number;
    reasoning?: string;
  };

  if (!userId || !symbol || !action || !quantity) {
    return Response.json(
      { error: "userId, symbol, action, and quantity are required" },
      { status: 400 }
    );
  }

  if (!["buy", "sell"].includes(action)) {
    return Response.json(
      { error: "action must be 'buy' or 'sell'" },
      { status: 400 }
    );
  }

  const outcome = executeTrade({
    userId,
    symbol,
    action: action as "buy" | "sell",
    quantity,
    reasoning,
  });

  if ("error" in outcome) {
    return Response.json({ error: outcome.error }, { status: 422 });
  }

  // Asynchronously run AI reasoning analysis (don't block the response)
  if (reasoning?.trim()) {
    analyseTradeReasoning(outcome.tradeId).catch(() => {
      // Non-fatal: reasoning analysis failure should not break the trade
    });
  }

  return Response.json(outcome, { status: 201 });
}
