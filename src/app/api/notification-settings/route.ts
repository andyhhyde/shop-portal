import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET — owner: all users + their settings; artist: own settings
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOwner = (session.user as { role?: string }).role === "owner";

  if (isOwner) {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        notificationSettings: true,
      },
    });
    return NextResponse.json(users);
  }

  const userId = (session.user as { id: string }).id;
  const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
  return NextResponse.json(settings);
}
