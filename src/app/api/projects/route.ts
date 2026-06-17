import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

// GET /api/projects -> projects with their client
export async function GET() {
  const rows = await db.query.projects.findMany({
    orderBy: asc(projects.name),
    with: { client: true },
  });
  return NextResponse.json(rows);
}

// POST /api/projects -> create a project, optionally creating/attaching a client by name
export async function POST(req: Request) {
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
    // Reuse an existing client with the same name, else create one.
    const existing = await db
      .select()
      .from(clients)
      .where(eq(clients.name, clientName))
      .limit(1);
    if (existing[0]) {
      clientId = existing[0].id;
    } else {
      const [created] = await db
        .insert(clients)
        .values({ name: clientName })
        .returning();
      clientId = created.id;
    }
  }

  const [project] = await db
    .insert(projects)
    .values({ name, color, clientId })
    .returning();

  const withClient = await db.query.projects.findFirst({
    where: eq(projects.id, project.id),
    with: { client: true },
  });

  return NextResponse.json(withClient, { status: 201 });
}
