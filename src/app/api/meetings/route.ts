import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: {
      createdBy: { select: { name: true } },
      rsvps: {
        where: { userId: (session.user as { id?: string }).id },
      },
      _count: { select: { rsvps: true } },
    },
  });

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, description, date, location, type } = await req.json();
  const event = await prisma.event.create({
    data: {
      title,
      description: description || null,
      date: new Date(date),
      location: location || null,
      type: type || "meeting",
      createdById: (session.user as { id?: string }).id!,
    },
  });

  return NextResponse.json(event);
}
