import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const payment = await prisma.boothPayment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Artists can only apply credits to their own payments; owners can apply to any
  const role = (session.user as { role?: string }).role;
  if (role !== "owner" && payment.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Sum all approved credits for this artist/period
  const credits = await prisma.receiptCredit.findMany({
    where: { userId: payment.userId, period: payment.period, status: "approved" },
  });

  const creditTotal = credits.reduce((sum, c) => sum + c.amount, 0);
  const netDue = Math.max(0, payment.amount - creditTotal);

  // If net is 0, mark as paid; otherwise update the stored amount to the net value
  const updated = await prisma.boothPayment.update({
    where: { id },
    data: {
      amount: netDue,
      status: netDue === 0 ? "paid" : payment.status,
      paidDate: netDue === 0 ? new Date() : payment.paidDate,
      notes: `Credits applied: −$${creditTotal.toFixed(2)}${payment.notes ? `. ${payment.notes}` : ""}`,
    },
  });

  return NextResponse.json(updated);
}
