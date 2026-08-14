/**
 * User management utilities.
 */

import { randomUUID as uuid } from "crypto";
import { getDb } from "./db";

export interface User {
  id: string;
  name: string;
  role: "student" | "parent";
  parentId?: string;
  balance: number;
  createdAt: string;
}

export function createUser(
  name: string,
  role: "student" | "parent",
  parentId?: string
): User {
  const db = getDb();
  const id = uuid();

  if (parentId) {
    const parent = db
      .prepare("SELECT id FROM users WHERE id=? AND role='parent'")
      .get(parentId);
    if (!parent) throw new Error("Parent not found");
  }

  db.prepare(
    `INSERT INTO users (id, name, role, parent_id) VALUES (?,?,?,?)`
  ).run(id, name, role, parentId ?? null);

  return getUser(id)!;
}

export function getUser(id: string): User | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, name, role, parent_id, balance, created_at FROM users WHERE id=?"
    )
    .get(id) as {
    id: string;
    name: string;
    role: "student" | "parent";
    parent_id: string | null;
    balance: number;
    created_at: string;
  } | undefined;

  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    parentId: row.parent_id ?? undefined,
    balance: row.balance,
    createdAt: row.created_at,
  };
}

export function getChildren(parentId: string): User[] {
  const db = getDb();
  return (
    db
      .prepare(
        "SELECT id, name, role, parent_id, balance, created_at FROM users WHERE parent_id=?"
      )
      .all(parentId) as {
      id: string;
      name: string;
      role: "student" | "parent";
      parent_id: string | null;
      balance: number;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    parentId: r.parent_id ?? undefined,
    balance: r.balance,
    createdAt: r.created_at,
  }));
}
