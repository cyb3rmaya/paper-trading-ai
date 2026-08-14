import { NextRequest } from "next/server";
import { createUser, getUser, getChildren } from "@/lib/users";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const parentId = searchParams.get("parentId");

  if (id) {
    const user = getUser(id);
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json(user);
  }

  if (parentId) {
    return Response.json(getChildren(parentId));
  }

  return Response.json({ error: "Provide id or parentId" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, role, parentId } = body as {
    name?: string;
    role?: string;
    parentId?: string;
  };

  if (!name || !["student", "parent"].includes(role ?? "")) {
    return Response.json(
      { error: "name and role ('student'|'parent') are required" },
      { status: 400 }
    );
  }

  try {
    const user = createUser(name, role as "student" | "parent", parentId);
    return Response.json(user, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 400 });
  }
}
