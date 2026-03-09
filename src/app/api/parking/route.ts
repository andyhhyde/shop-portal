import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const spot = await prisma.parkingSpot.findUnique({
    where: { spotId: "rear-stall" },
  });

  if (!spot) {
    return NextResponse.json({ spotId: "rear-stall", occupied: false, lastUpdated: null });
  }

  return NextResponse.json(spot);
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey || apiKey !== process.env.PARKING_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { spotId, occupied } = body;

  if (!spotId || typeof occupied !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const spot = await prisma.parkingSpot.upsert({
    where: { spotId },
    update: { occupied, lastUpdated: new Date() },
    create: { spotId, occupied, lastUpdated: new Date() },
  });

  return NextResponse.json(spot);
}
