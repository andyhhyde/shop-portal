import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { differenceInDays, format } from "date-fns";
import webpush from "web-push";

// Configure VAPID keys once at module level
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || "mailto:admin@shop.local",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// POST — scan all unpaid booth payments and generate notifications as needed.
// Called automatically by the NotificationBell on mount and every 5 minutes.
// Idempotent: won't create duplicates if called repeatedly.
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.boothPayment.findMany({
    where: { status: { notIn: ["paid"] } },
    include: {
      user: { include: { notificationSettings: true } },
    },
  });

  const now = new Date();
  let generated = 0;

  for (const payment of payments) {
    const raw = payment.user.notificationSettings;
    const settings = {
      enabled: raw?.enabled ?? true,
      daysBeforeDue: raw?.daysBeforeDue ?? 7,
      recurringEvery: raw?.recurringEvery ?? 3,
    };

    if (!settings.enabled) continue;

    const dueDate = new Date(payment.dueDate);
    const daysUntilDue = differenceInDays(dueDate, now);

    // Only notify if within the advance window or already overdue
    if (daysUntilDue > settings.daysBeforeDue) continue;

    // Check how recently we last notified for this specific payment
    const lastNotif = await prisma.notification.findFirst({
      where: { relatedId: payment.id, userId: payment.userId },
      orderBy: { createdAt: "desc" },
    });

    if (lastNotif) {
      const daysSinceLast = differenceInDays(now, new Date(lastNotif.createdAt));
      if (daysSinceLast < settings.recurringEvery) continue;
    }

    // Build title + body based on timing
    let title: string;
    let body: string;
    let type: string;

    if (daysUntilDue < 0) {
      const overdue = Math.abs(daysUntilDue);
      title = `Rent Overdue — ${overdue} day${overdue !== 1 ? "s" : ""} past due`;
      body = `Your booth rent of $${payment.amount.toFixed(2)} for ${payment.period} was due on ${format(dueDate, "MMM d, yyyy")} and has not been marked as paid.`;
      type = "rent_overdue";
    } else if (daysUntilDue === 0) {
      title = "Rent Due Today";
      body = `Your booth rent of $${payment.amount.toFixed(2)} for ${payment.period} is due today.`;
      type = "rent_reminder";
    } else {
      title = `Rent Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? "s" : ""}`;
      body = `Your booth rent of $${payment.amount.toFixed(2)} for ${payment.period} is due on ${format(dueDate, "MMM d, yyyy")}.`;
      type = "rent_reminder";
    }

    await prisma.notification.create({
      data: { userId: payment.userId, title, body, type, relatedId: payment.id },
    });
    generated++;

    // Send web push if user has registered push subscriptions
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: payment.userId },
    });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, type, relatedId: payment.id, url: "/dashboard" })
        );
      } catch (err: unknown) {
        // 410 = subscription expired / unsubscribed — clean it up
        if ((err as { statusCode?: number }).statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }
  }

  return NextResponse.json({ generated });
}
