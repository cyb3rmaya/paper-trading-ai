import { NextRequest } from "next/server";
import { listQuests, completeQuest, getTotalXp } from "@/lib/quests";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  const quests = listQuests(userId);
  const totalXp = getTotalXp(userId);
  return Response.json({ quests, totalXp });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, questId, reflection } = body as {
    userId?: string;
    questId?: string;
    reflection?: string;
  };

  if (!userId || !questId || !reflection?.trim()) {
    return Response.json(
      { error: "userId, questId, and reflection are required" },
      { status: 400 }
    );
  }

  try {
    const result = completeQuest(userId, questId, reflection);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 400 });
  }
}
