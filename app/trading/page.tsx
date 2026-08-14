"use client";

import { useState, useEffect } from "react";

const DEMO_USER_ID = "demo-student";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface Position {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

interface Portfolio {
  balance: number;
  positions: Position[];
  totalMarketValue: number;
  totalUnrealizedPnl: number;
  totalValue: number;
}

interface TradeRecord {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  reasoning: string | null;
  decision_score: number | null;
  ai_analysis: string | null;
  executed_at: string;
}

export default function TradingPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [history, setHistory] = useState<TradeRecord[]>([]);
  const [tab, setTab] = useState<"trade" | "portfolio" | "history">("trade");

  // Trade form
  const [symbol, setSymbol] = useState("");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [reasoning, setReasoning] = useState("");
  const [trading, setTrading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  async function loadData() {
    const [qRes, pRes, hRes] = await Promise.all([
      fetch(`/api/trades?userId=${DEMO_USER_ID}&view=quotes`),
      fetch(`/api/trades?userId=${DEMO_USER_ID}&view=portfolio`),
      fetch(`/api/trades?userId=${DEMO_USER_ID}&view=history`),
    ]);
    if (qRes.ok) setQuotes(await qRes.json());
    if (pRes.ok) setPortfolio(await pRes.json());
    if (hRes.ok) setHistory(await hRes.json());
  }

  useEffect(() => {
    loadData();
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function executeTrade() {
    if (!symbol || !quantity || parseFloat(quantity) <= 0) return;
    setTrading(true);
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: DEMO_USER_ID,
        symbol: symbol.toUpperCase(),
        action,
        quantity: parseFloat(quantity),
        reasoning,
      }),
    });
    const data = await res.json();
    setTrading(false);
    if (res.ok) {
      showToast(
        `✅ ${action.toUpperCase()} ${quantity} × ${symbol.toUpperCase()} @ $${data.price}`,
        true
      );
      setSymbol("");
      setQuantity("1");
      setReasoning("");
      loadData();
    } else {
      showToast(`❌ ${data.error}`, false);
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 rounded-lg px-4 py-2 shadow-lg z-50 text-white ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">📈 Paper Trading Simulator</h1>
        <p className="text-gray-600 mt-1">
          Practice trading with $10,000 of simulated money. Write your reasoning
          for every trade.
        </p>
      </div>

      {/* Balance banner */}
      {portfolio && (
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white border rounded-xl px-4 py-3 text-sm">
            <div className="text-gray-500">Cash</div>
            <div className="font-bold text-lg">${portfolio.balance.toLocaleString()}</div>
          </div>
          <div className="bg-white border rounded-xl px-4 py-3 text-sm">
            <div className="text-gray-500">Portfolio Value</div>
            <div className="font-bold text-lg">${portfolio.totalValue.toLocaleString()}</div>
          </div>
          <div className="bg-white border rounded-xl px-4 py-3 text-sm">
            <div className="text-gray-500">Unrealised P&L</div>
            <div
              className={`font-bold text-lg ${
                portfolio.totalUnrealizedPnl >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {portfolio.totalUnrealizedPnl >= 0 ? "+" : ""}
              ${portfolio.totalUnrealizedPnl.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        {(["trade", "portfolio", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "trade" ? "New Trade" : t === "portfolio" ? "Portfolio" : "History"}
          </button>
        ))}
      </div>

      {tab === "trade" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Trade form */}
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-lg">Execute Trade</h2>

            {/* Symbol picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              >
                <option value="">Select a stock…</option>
                {quotes.map((q) => (
                  <option key={q.symbol} value={q.symbol}>
                    {q.symbol} – ${q.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div className="flex gap-2">
              {(["buy", "sell"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    action === a
                      ? a === "buy"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-red-600 text-white border-red-600"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {a.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (shares)</label>
              <input
                type="number"
                value={quantity}
                min="0.01"
                step="0.01"
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            {/* Reasoning – the key educational element */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Why are you making this trade?{" "}
                <span className="text-indigo-500 font-normal">(AI will analyse your reasoning)</span>
              </label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                rows={3}
                placeholder="e.g. I believe AAPL will grow because of their new product lineup and strong earnings…"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            <button
              onClick={executeTrade}
              disabled={trading || !symbol || !quantity}
              className={`w-full py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
                action === "buy"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {trading ? "Executing…" : `${action.toUpperCase()} ${symbol || "…"}`}
            </button>
          </div>

          {/* Live quotes */}
          <div className="bg-white border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Market Prices</h2>
              <button onClick={loadData} className="text-xs text-indigo-600 hover:underline">
                Refresh
              </button>
            </div>
            <div className="divide-y text-sm">
              {quotes.map((q) => (
                <div key={q.symbol} className="py-2 flex justify-between items-center">
                  <span className="font-mono font-semibold">{q.symbol}</span>
                  <div className="text-right">
                    <div className="font-semibold">${q.price.toFixed(2)}</div>
                    <div className={q.change >= 0 ? "text-green-600" : "text-red-600"}>
                      {q.change >= 0 ? "+" : ""}
                      {q.change.toFixed(2)} ({q.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "portfolio" && portfolio && (
        <div className="bg-white border rounded-xl p-5">
          {portfolio.positions.length === 0 ? (
            <p className="text-gray-500 text-sm">No positions yet. Make your first trade!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2">Avg Cost</th>
                    <th className="pb-2">Current</th>
                    <th className="pb-2">Market Value</th>
                    <th className="pb-2">Unrealised P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {portfolio.positions.map((p) => (
                    <tr key={p.symbol}>
                      <td className="py-2 font-mono font-semibold">{p.symbol}</td>
                      <td className="py-2">{p.quantity}</td>
                      <td className="py-2">${p.avgCost.toFixed(2)}</td>
                      <td className="py-2">${p.currentPrice.toFixed(2)}</td>
                      <td className="py-2">${p.marketValue.toLocaleString()}</td>
                      <td className={`py-2 font-medium ${p.unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {p.unrealizedPnl >= 0 ? "+" : ""}${p.unrealizedPnl.toFixed(2)} ({p.unrealizedPnlPct}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white border rounded-xl p-5">
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">No trade history yet.</p>
          ) : (
            <div className="space-y-4">
              {history.map((t) => (
                <div key={t.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${t.action === "buy" ? "text-green-600" : "text-red-600"}`}>
                      {t.action.toUpperCase()}
                    </span>
                    <span className="font-mono font-semibold">{t.symbol}</span>
                    <span className="text-gray-500">
                      {t.quantity} × ${t.price.toFixed(2)}
                    </span>
                    {t.decision_score !== null && (
                      <span className="ml-auto bg-indigo-100 text-indigo-700 rounded px-2 py-0.5 text-xs">
                        Reasoning score: {t.decision_score}/10
                      </span>
                    )}
                  </div>
                  {t.reasoning && (
                    <p className="text-gray-600 mt-1 italic">
                      &ldquo;{t.reasoning}&rdquo;
                    </p>
                  )}
                  {t.ai_analysis && (() => {
                    try {
                      const a = JSON.parse(t.ai_analysis);
                      return (
                        <div className="mt-2 bg-gray-50 rounded p-2 text-xs">
                          <strong>AI Feedback:</strong> {a.summary}
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(t.executed_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
