import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

// GET /api/projects -> current user's projects with their client
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const rows = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: asc(projects.name),
    with: { client: true },
  });
  return NextResponse.json(rows);
}

// POST /api/projects -> create a project, optionally creating/attaching a client by name
export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const color = typeof body.color === "string" ? body.color : "#3b82f6";
  const clientName =
    typeof body.clientName === "string" ? body.clientName.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let clientId: string | null = null;
  if (clientName) {
    // Reuse the user's existing client with the same name, else create one.
    const existing = await db
      .select()
      .from(clients)
      .where(and(eq(clients.userId, userId), eq(clients.name, clientName)))
      .limit(1);
    if (existing[0]) {
      clientId = existing[0].id;
    } else {
      const [created] = await db
        .insert(clients)
        .values({ userId, name: clientName })
        .returning();
      clientId = created.id;
    }
  }

  const [project] = await db
    .insert(projects)
    .values({ userId, name, color, clientId })
    .returning();

  const withClient = await db.query.projects.findFirst({
    where: eq(projects.id, project.id),
    with: { client: true },
  });

  return NextResponse.json(withClient, { status: 201 });
}
