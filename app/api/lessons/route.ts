import { NextRequest } from "next/server";
import { listLessons, completeLesson } from "@/lib/lessons";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  return Response.json(listLessons(userId));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, lessonId, score } = body as {
    userId?: string;
    lessonId?: string;
    score?: number;
  };

  if (!userId || !lessonId) {
    return Response.json(
      { error: "userId and lessonId are required" },
      { status: 400 }
    );
  }

  try {
    const result = completeLesson(userId, lessonId, score);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 400 });
  }
}
