import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOwner = (session.user as { role?: string }).role === "owner";
  const userId = (session.user as { id?: string }).id!;

  const payments = await prisma.boothPayment.findMany({
    where: isOwner ? undefined : { userId },
    orderBy: { dueDate: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Auto-mark overdue payments as late
  const now = new Date();
  for (const p of payments) {
    if (p.status === "pending" && new Date(p.dueDate) < now) {
      await prisma.boothPayment.update({ where: { id: p.id }, data: { status: "late" } });
      p.status = "late";
    }
  }

  return NextResponse.json(payments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, amount, dueDate, period, notes } = await req.json();
  const payment = await prisma.boothPayment.create({
    data: {
      userId,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate),
      period,
      notes: notes || null,
    },
  });

  return NextResponse.json(payment);
}
