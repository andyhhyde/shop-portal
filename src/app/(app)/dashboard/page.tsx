import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { CalendarDays, CreditCard, Package, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id ?? "";

  const [upcomingEvents, pendingPayments, allInventory, myPayments] =
    await Promise.all([
      prisma.event.findMany({
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 3,
        include: { rsvps: { where: { userId } } },
      }),
      prisma.boothPayment.findMany({
        where: { status: { in: ["pending", "late"] } },
        include: { user: true },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.inventoryItem.findMany({ orderBy: { name: "asc" } }),
      prisma.boothPayment.findMany({
        where: { userId, status: { in: ["pending", "late"] } },
        orderBy: { dueDate: "asc" },
        take: 3,
      }),
    ]);

  const lowStockItems = allInventory.filter((i) => i.quantity <= i.reorderAt).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Welcome back, {session?.user?.name}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Upcoming Events"
          value={upcomingEvents.length.toString()}
          color="blue"
          href="/events"
        />
        <StatCard
          icon={<CreditCard size={20} />}
          label="Pending Payments"
          value={pendingPayments.length.toString()}
          color="yellow"
          href="/booth-rental"
        />
        <StatCard
          icon={<Package size={20} />}
          label="Low Stock Items"
          value={lowStockItems.length.toString()}
          color="red"
          href="/inventory"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Section title="Upcoming Events" href="/events">
          {upcomingEvents.length === 0 ? (
            <Empty text="No upcoming events" />
          ) : (
            upcomingEvents.map((m) => (
              <div key={m.id} className="flex items-start justify-between py-3 border-b border-zinc-800 last:border-0">
                <div>
                  <p className="text-white font-medium text-sm">{m.title}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {format(new Date(m.date), "EEE, MMM d 'at' h:mm a")}
                    {m.location ? ` · ${m.location}` : ""}
                  </p>
                </div>
                <RSVPBadge status={m.rsvps[0]?.status ?? "pending"} />
              </div>
            ))
          )}
        </Section>

        {/* My Booth Payments */}
        <Section title="My Booth Payments" href="/booth-rental">
          {myPayments.length === 0 ? (
            <Empty text="No pending payments 🎉" />
          ) : (
            myPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                <div>
                  <p className="text-white font-medium text-sm">{p.period}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Due {format(new Date(p.dueDate), "MMM d")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold text-sm">${p.amount.toFixed(2)}</p>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))
          )}
        </Section>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-950 border border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-400" />
            <p className="text-amber-300 font-semibold text-sm">Low Stock Alert</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => (
              <Link
                key={item.id}
                href="/inventory"
                className="bg-amber-900 text-amber-200 text-xs px-3 py-1 rounded-full hover:bg-amber-800 transition-colors"
              >
                {item.name} ({item.quantity} {item.unit} left)
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "yellow" | "red";
  href: string;
}) {
  const colors = {
    blue: "bg-blue-950 border-blue-800 text-blue-400",
    yellow: "bg-yellow-950 border-yellow-800 text-yellow-400",
    red: "bg-red-950 border-red-800 text-red-400",
  };
  return (
    <Link href={href} className={`${colors[color]} border rounded-xl p-4 flex items-center gap-4 hover:opacity-80 transition-opacity`}>
      <div className="opacity-80">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-70 mt-0.5">{label}</p>
      </div>
    </Link>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">{title}</h2>
        <Link href={href} className="text-red-400 hover:text-red-300 text-xs transition-colors">View all →</Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-zinc-500 text-sm py-4 text-center">{text}</p>;
}

function RSVPBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    attending: "bg-green-900 text-green-300",
    not_attending: "bg-red-900 text-red-300",
    pending: "bg-zinc-800 text-zinc-400",
  };
  const labels: Record<string, string> = {
    attending: "Going",
    not_attending: "Not Going",
    pending: "Pending",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[status] ?? map.pending}`}>
      {labels[status] ?? "Pending"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "text-green-400",
    pending: "text-yellow-400",
    late: "text-red-400",
  };
  return (
    <span className={`text-xs font-medium capitalize ${map[status] ?? "text-zinc-400"}`}>
      {status}
    </span>
  );
}
