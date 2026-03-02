"use client";

import Image from "next/image";
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
  X,
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

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isOwner = (session?.user as { role?: string })?.role === "owner";

  const sidebarContent = (
    <aside className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/STC_Logo.png" alt="STC Logo" width={36} height={36} className="rounded" />
          <div>
            <p className="font-bold text-white text-sm leading-tight">Shop Portal</p>
            <p className="text-zinc-500 text-xs">{session?.user?.name}</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1 text-zinc-500 hover:text-white"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Icon size={18} />
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
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-red-600 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <Icon size={18} />
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
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:flex min-h-screen">
        {sidebarContent}
      </div>

      {/* Mobile: slide-in overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative z-10 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
