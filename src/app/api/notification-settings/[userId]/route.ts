import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH — owner updates (or creates) notification settings for a user
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const { enabled, daysBeforeDue, recurringEvery } = await req.json();

  const settings = await prisma.notificationSettings.upsert({
    where: { userId },
    create: {
      userId,
      enabled: enabled ?? true,
      daysBeforeDue: Math.max(1, parseInt(daysBeforeDue) || 7),
      recurringEvery: Math.max(1, parseInt(recurringEvery) || 3),
    },
    update: {
      enabled: enabled ?? true,
      daysBeforeDue: Math.max(1, parseInt(daysBeforeDue) || 7),
      recurringEvery: Math.max(1, parseInt(recurringEvery) || 3),
    },
  });

  return NextResponse.json(settings);
}
