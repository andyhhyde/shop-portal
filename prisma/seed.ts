import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create owner account
  const ownerPassword = await bcrypt.hash("owner123", 10);
  const owner = await prisma.user.upsert({
    where: { email: "owner@shop.com" },
    update: {},
    create: {
      name: "Shop Owner",
      email: "owner@shop.com",
      password: ownerPassword,
      role: "owner",
      phone: "555-0100",
    },
  });

  // Create sample artists
  const artistPassword = await bcrypt.hash("artist123", 10);
  const artist1 = await prisma.user.upsert({
    where: { email: "alex@shop.com" },
    update: {},
    create: {
      name: "Alex Rivera",
      email: "alex@shop.com",
      password: artistPassword,
      role: "artist",
      phone: "555-0101",
    },
  });

  const artist2 = await prisma.user.upsert({
    where: { email: "jordan@shop.com" },
    update: {},
    create: {
      name: "Jordan Blake",
      email: "jordan@shop.com",
      password: artistPassword,
      role: "artist",
      phone: "555-0102",
    },
  });

  // Create a sample meeting event
  await prisma.event.upsert({
    where: { id: "seed-event-1" },
    update: {},
    create: {
      id: "seed-event-1",
      title: "Monthly Shop Meeting",
      description: "Go over shop policies, upcoming events, and any issues.",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: "Shop Floor",
      type: "meeting",
      createdById: owner.id,
    },
  });

  // Create a sample maintenance event
  await prisma.event.upsert({
    where: { id: "seed-event-2" },
    update: {},
    create: {
      id: "seed-event-2",
      title: "HVAC Maintenance",
      description: "Annual HVAC service and filter replacement.",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      location: "Shop",
      type: "maintenance",
      createdById: owner.id,
    },
  });

  // Create a sample inspection event
  await prisma.event.upsert({
    where: { id: "seed-event-3" },
    update: {},
    create: {
      id: "seed-event-3",
      title: "Health Dept. Inspection",
      description: "Annual health department review.",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      location: "Shop",
      type: "inspection",
      createdById: owner.id,
    },
  });

  // Create sample booth payments
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // 1st of next month

  await prisma.boothPayment.upsert({
    where: { id: "seed-payment-1" },
    update: {},
    create: {
      id: "seed-payment-1",
      userId: artist1.id,
      amount: 600,
      dueDate,
      period: "March 2026",
      status: "pending",
    },
  });

  await prisma.boothPayment.upsert({
    where: { id: "seed-payment-2" },
    update: {},
    create: {
      id: "seed-payment-2",
      userId: artist2.id,
      amount: 600,
      dueDate,
      period: "March 2026",
      status: "pending",
    },
  });

  // Create sample inventory
  const inventoryItems = [
    { name: "Dynamic Black Ink", category: "ink", quantity: 12, unit: "bottles", reorderAt: 4, supplier: "Dynamic Color" },
    { name: "Eternal Red Ink", category: "ink", quantity: 3, unit: "bottles", reorderAt: 4, supplier: "Eternal Ink" },
    { name: "Hustle Butter Deluxe", category: "aftercare", quantity: 6, unit: "jars", reorderAt: 3, supplier: "Hustle Butter" },
    { name: "Saniderm Rolls", category: "aftercare", quantity: 4, unit: "rolls", reorderAt: 3 },
    { name: "Nitrile Gloves (M)", category: "equipment", quantity: 200, unit: "gloves", reorderAt: 50 },
    { name: "Nitrile Gloves (L)", category: "equipment", quantity: 2, unit: "boxes", reorderAt: 5 },
    { name: "Clip Cords", category: "equipment", quantity: 4, unit: "units", reorderAt: 2 },
    { name: "Green Soap", category: "general", quantity: 10, unit: "bottles", reorderAt: 3 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { id: `seed-inv-${item.name.toLowerCase().replace(/\s/g, "-")}` },
      update: {},
      create: {
        id: `seed-inv-${item.name.toLowerCase().replace(/\s/g, "-")}`,
        ...item,
        supplier: (item as { supplier?: string }).supplier ?? null,
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log("  Owner:  owner@shop.com  / owner123");
  console.log("  Artist: alex@shop.com   / artist123");
  console.log("  Artist: jordan@shop.com / artist123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
