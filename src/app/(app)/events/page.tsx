"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Plus, CalendarDays, MapPin, Check, X, Clock } from "lucide-react";

const EVENT_TYPES = [
  { value: "meeting", label: "Shop Meeting", color: "bg-blue-600 text-blue-100" },
  { value: "maintenance", label: "Maintenance", color: "bg-amber-600 text-amber-100" },
  { value: "inspection", label: "Inspection / Health Dept", color: "bg-orange-600 text-orange-100" },
  { value: "flash", label: "Flash Event", color: "bg-purple-600 text-purple-100" },
  { value: "other", label: "Other", color: "bg-zinc-600 text-zinc-100" },
];

function typeInfo(type: string) {
  return EVENT_TYPES.find((t) => t.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

type ShopEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  type: string;
  createdBy: { name: string };
  rsvps: { status: string }[];
  _count: { rsvps: number };
};

export default function EventsPage() {
  const { data: session } = useSession();
  const isOwner = (session?.user as { role?: string })?.role === "owner";
  const [events, setEvents] = useState<ShopEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    type: "meeting",
  });
  const [saving, setSaving] = useState(false);

  async function loadEvents() {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data);
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", description: "", date: "", location: "", type: "meeting" });
    setShowForm(false);
    setSaving(false);
    loadEvents();
  }

  async function handleRSVP(eventId: string, status: string) {
    await fetch(`/api/events/${eventId}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadEvents();
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    loadEvents();
  }

  const upcoming = events.filter((e) => new Date(e.date) >= new Date());
  const past = events.filter((e) => new Date(e.date) < new Date());

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Shop meetings, maintenance visits, inspections &amp; more
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Add Event
          </button>
        )}
      </div>

      {/* New Event Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4"
        >
          <h2 className="font-semibold text-white">Add Event</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="e.g. Health Dept. Inspection, HVAC Maintenance…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Date &amp; Time *</label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Shop floor / Back room / On-site"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Notes</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Any details or instructions…"
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {saving ? "Saving…" : "Add Event"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-zinc-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <>
          <div>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4">No upcoming events scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    isOwner={isOwner}
                    onRSVP={handleRSVP}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Past
              </h2>
              <div className="space-y-3 opacity-50">
                {past.slice(0, 8).map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    isOwner={false}
                    onRSVP={handleRSVP}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({
  event,
  isOwner,
  onRSVP,
  onDelete,
}: {
  event: ShopEvent;
  isOwner: boolean;
  onRSVP: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const myRSVP = event.rsvps[0]?.status ?? "pending";
  const isPast = new Date(event.date) < new Date();
  const type = typeInfo(event.type);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold">{event.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${type.color}`}>
              {type.label}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-zinc-400 text-xs">
              <CalendarDays size={12} />
              {format(new Date(event.date), "EEE, MMM d 'at' h:mm a")}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 text-zinc-400 text-xs">
                <MapPin size={12} />
                {event.location}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-zinc-400 text-sm mt-2">{event.description}</p>
          )}
          <p className="text-zinc-600 text-xs mt-2">Added by {event.createdBy.name}</p>
        </div>
        {isOwner && !isPast && (
          <button
            onClick={() => onDelete(event.id)}
            className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* RSVP row */}
      {!isPast && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
          <span className="text-zinc-500 text-xs mr-1">Will you be here?</span>
          <RSVPButton
            active={myRSVP === "attending"}
            color="green"
            icon={<Check size={12} />}
            label="Yes"
            onClick={() => onRSVP(event.id, "attending")}
          />
          <RSVPButton
            active={myRSVP === "not_attending"}
            color="red"
            icon={<X size={12} />}
            label="No"
            onClick={() => onRSVP(event.id, "not_attending")}
          />
          <RSVPButton
            active={myRSVP === "pending"}
            color="zinc"
            icon={<Clock size={12} />}
            label="Not sure"
            onClick={() => onRSVP(event.id, "pending")}
          />
        </div>
      )}
    </div>
  );
}

function RSVPButton({
  active,
  color,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    green: active
      ? "bg-green-700 text-green-200 border-green-600"
      : "border-zinc-700 text-zinc-400 hover:border-green-700 hover:text-green-300",
    red: active
      ? "bg-red-900 text-red-200 border-red-700"
      : "border-zinc-700 text-zinc-400 hover:border-red-700 hover:text-red-300",
    zinc: active
      ? "bg-zinc-700 text-zinc-200 border-zinc-600"
      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${colors[color]}`}
    >
      {icon} {label}
    </button>
  );
}
