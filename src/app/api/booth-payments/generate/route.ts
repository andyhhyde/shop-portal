import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { period, dueDate } = await req.json();
  if (!period || !dueDate) {
    return NextResponse.json({ error: "period and dueDate are required" }, { status: 400 });
  }

  // Get all users who have a rentAmount > 0
  const users = await prisma.user.findMany({
    where: { rentAmount: { gt: 0 } },
    select: { id: true, name: true, rentAmount: true },
  });

  // Find who already has a payment record for this period
  const existing = await prisma.boothPayment.findMany({
    where: { period },
    select: { userId: true },
  });
  const existingUserIds = new Set(existing.map((p) => p.userId));

  // Create payment records for everyone who doesn't already have one
  const toCreate = users.filter((u) => !existingUserIds.has(u.id));

  if (toCreate.length === 0) {
    return NextResponse.json({ created: 0, skipped: users.length });
  }

  await prisma.boothPayment.createMany({
    data: toCreate.map((u) => ({
      userId: u.id,
      amount: u.rentAmount,
      dueDate: new Date(dueDate),
      period,
      status: "pending",
    })),
  });

  return NextResponse.json({ created: toCreate.length, skipped: existingUserIds.size });
}
