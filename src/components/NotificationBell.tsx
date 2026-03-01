"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Check, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Notif = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
};

/** Convert a VAPID base64url public key to the ArrayBuffer PushManager expects */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    // Generate any pending notifications, then fetch the list
    await fetch("/api/notifications/generate", { method: "POST" });
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifs(await res.json());
  }, []);

  // Load on mount, then poll every 5 minutes
  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  // Detect push permission state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushPermission("unsupported");
      return;
    }
    setPushPermission(Notification.permission);

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription()
    ).then((sub) => {
      setPushSubscribed(!!sub);
    }).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  async function enablePush() {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setPushSubscribed(true);
    } catch (err) {
      console.warn("Push subscribe failed:", err);
    } finally {
      setPushLoading(false);
    }
  }

  async function disablePush() {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
    } catch (err) {
      console.warn("Push unsubscribe failed:", err);
    } finally {
      setPushLoading(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-white">
              Notifications
              {unread > 0 && (
                <span className="ml-1.5 text-zinc-500 font-normal text-xs">
                  {unread} unread
                </span>
              )}
            </h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          {/* Push notification opt-in banner */}
          {pushPermission !== "unsupported" && pushPermission !== "denied" && (
            <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/30">
              {!pushSubscribed ? (
                <button
                  onClick={enablePush}
                  disabled={pushLoading}
                  className="flex items-center gap-2 w-full text-left text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-60"
                >
                  <Bell size={13} className="shrink-0" />
                  <span>{pushLoading ? "Enabling…" : "Enable push notifications on this device"}</span>
                </button>
              ) : (
                <button
                  onClick={disablePush}
                  disabled={pushLoading}
                  className="flex items-center gap-2 w-full text-left text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-60"
                >
                  <BellOff size={13} className="shrink-0" />
                  <span>{pushLoading ? "Disabling…" : "Push notifications enabled · tap to disable"}</span>
                </button>
              )}
            </div>
          )}
          {pushPermission === "denied" && (
            <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/30">
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                <BellOff size={13} className="shrink-0" />
                Push blocked in browser settings
              </p>
            </div>
          )}

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800/50">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Bell size={24} className="text-zinc-700" />
                <p className="text-zinc-500 text-sm">You&apos;re all caught up!</p>
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`px-4 py-3 group transition-colors cursor-default ${
                    !n.read ? "bg-zinc-800/40 hover:bg-zinc-800/70" : "hover:bg-zinc-800/20"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-0.5" />
                        )}
                        <p
                          className={`text-sm font-medium leading-tight ${
                            n.type === "rent_overdue"
                              ? "text-red-400"
                              : !n.read
                              ? "text-white"
                              : "text-zinc-300"
                          }`}
                        >
                          {n.title}
                        </p>
                      </div>
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{n.body}</p>
                      <p className="text-zinc-600 text-[11px] mt-1.5">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss(n.id);
                      }}
                      className="text-zinc-700 hover:text-zinc-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100 mt-0.5"
                      title="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}