import { NextRequest } from "next/server";
import { generateFeedback, getFeedbackHistory } from "@/lib/feedback";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  const limit = parseInt(searchParams.get("limit") ?? "10", 10);
  return Response.json(getFeedbackHistory(userId, limit));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId } = body as { userId?: string };

  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const feedback = await generateFeedback(userId);
    return Response.json(feedback, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
