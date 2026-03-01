import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const suggestions = await prisma.suggestion.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json(suggestions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { body } = await req.json();

  if (!body || !body.trim()) {
    return NextResponse.json({ error: "Suggestion cannot be empty" }, { status: 400 });
  }

  const suggestion = await prisma.suggestion.create({
    data: { userId, body: body.trim() },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json(suggestion);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const { id } = await req.json();

  const suggestion = await prisma.suggestion.findUnique({ where: { id } });
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the author or an owner can delete
  if (suggestion.userId !== userId && role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.suggestion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
