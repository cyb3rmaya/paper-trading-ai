import { NextRequest } from "next/server";
import { generateProgressReport } from "@/lib/reports";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return Response.json(
      { error: "studentId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const report = await generateProgressReport(studentId);
    return Response.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
