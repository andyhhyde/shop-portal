import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = { lastUpdated: new Date() };
  if (body.quantity !== undefined) data.quantity = parseFloat(body.quantity);
  if (body.orderUrl !== undefined) data.orderUrl = body.orderUrl || null;
  if (body.name !== undefined) data.name = body.name;
  if (body.category !== undefined) data.category = body.category;
  if (body.unit !== undefined) data.unit = body.unit;
  if (body.reorderAt !== undefined) data.reorderAt = parseFloat(body.reorderAt) || 0;
  if (body.supplier !== undefined) data.supplier = body.supplier || null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const item = await prisma.inventoryItem.update({
    where: { id },
    data,
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
