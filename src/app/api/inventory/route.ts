import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, category, quantity, unit, reorderAt, supplier, orderUrl, notes } = await req.json();
  const item = await prisma.inventoryItem.create({
    data: {
      name,
      category: category || "general",
      quantity: parseFloat(quantity) || 0,
      unit: unit || "units",
      reorderAt: parseFloat(reorderAt) || 5,
      supplier: supplier || null,
      orderUrl: orderUrl || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(item);
}
