import { NextResponse } from "next/server";
import { getCurrentUser } from "./session";

// Returns the userId for the current request, or a 401 response to return early.
// Usage:
//   const auth = await requireUser();
//   if (auth instanceof NextResponse) return auth;
//   const { userId } = auth;
export async function requireUser(): Promise<
  { userId: string; username: string } | NextResponse
> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}
