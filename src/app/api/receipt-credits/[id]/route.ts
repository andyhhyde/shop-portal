import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status, reviewNote } = await req.json();

  const validStatuses = ["approved", "flagged", "ineligible"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const credit = await prisma.receiptCredit.update({
    where: { id },
    data: {
      status,
      reviewNote: reviewNote ?? null,
      reviewedAt: new Date(),
      reviewedById: (session.user as { id: string }).id,
    },
  });

  return NextResponse.json(credit);
}
