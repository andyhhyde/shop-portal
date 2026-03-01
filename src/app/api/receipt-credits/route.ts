import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  const credits = await prisma.receiptCredit.findMany({
    where: role === "owner" ? undefined : { userId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(credits);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUserId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  const formData = await req.formData();
  const period = formData.get("period") as string;
  const amount = formData.get("amount") as string;
  const description = formData.get("description") as string;
  const targetUserId = formData.get("userId") as string | null;
  const file = formData.get("receipt") as File | null;

  // Owner can submit on behalf of an artist; artists submit for themselves
  const creditUserId = role === "owner" && targetUserId ? targetUserId : sessionUserId;

  if (!period || !amount || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let imagePath: string | null = null;

  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    imagePath = `/uploads/receipts/${filename}`;
  }

  const credit = await prisma.receiptCredit.create({
    data: {
      userId: creditUserId,
      period,
      amount: parseFloat(amount),
      description,
      imagePath,
      status: "approved", // auto-approved; owner can flag for review later
    },
  });

  return NextResponse.json(credit);
}
