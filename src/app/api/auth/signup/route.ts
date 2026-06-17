import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username =
    typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (username.length < 3) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing[0]) {
    return NextResponse.json(
      { error: "Username is already taken" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ username, passwordHash })
    .returning();

  await setSessionCookie({ userId: user.id, username: user.username });
  return NextResponse.json(
    { id: user.id, username: user.username },
    { status: 201 },
  );
}
