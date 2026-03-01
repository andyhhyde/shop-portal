"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Package,
  Users,
  LogOut,
  MessageSquarePlus,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/booth-rental", label: "Booth Rental", icon: CreditCard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/suggestions", label: "Suggestion Box", icon: MessageSquarePlus },
];

const ownerItems = [
  { href: "/artists", label: "Artists", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isOwner = (session?.user as { role?: string })?.role === "owner";

  return (
    <aside className="w-60 min-h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗡️</span>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Shop Portal</p>
            <p className="text-zinc-500 text-xs">{session?.user?.name}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}

        {isOwner && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-xs text-zinc-600 uppercase tracking-wider font-semibold">Owner</p>
            </div>
            {ownerItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-red-600 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
