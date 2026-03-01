"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, CalendarDays, MapPin } from "lucide-react";

const EVENT_TYPES = [
  { value: "meeting", label: "Shop Meeting", pill: "bg-blue-600 text-blue-100", dot: "bg-blue-500" },
  { value: "maintenance", label: "Maintenance", pill: "bg-amber-600 text-amber-100", dot: "bg-amber-500" },
  { value: "inspection", label: "Inspection / Health Dept", pill: "bg-orange-600 text-orange-100", dot: "bg-orange-500" },
  { value: "flash", label: "Flash Event", pill: "bg-purple-600 text-purple-100", dot: "bg-purple-500" },
  { value: "other", label: "Other", pill: "bg-zinc-600 text-zinc-100", dot: "bg-zinc-500" },
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
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { data: session } = useSession();
  const isOwner = (session?.user as { role?: string })?.role === "owner";

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<ShopEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "", location: "", type: "meeting" });

  async function loadEvents() {
    const res = await fetch("/api/events");
    if (res.ok) setEvents(await res.json());
  }

  useEffect(() => {
    loadEvents();
  }, []);

  // Prefill date when a day is selected and form is opened
  function openFormForDay(day: Date) {
    const localDate = format(day, "yyyy-MM-dd") + "T09:00";
    setForm((f) => ({ ...f, date: localDate }));
    setShowForm(true);
  }

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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  function getEventsForDay(day: Date) {
    return events.filter((ev) => isSameDay(new Date(ev.date), day));
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-zinc-400 text-sm mt-1">All shop events at a glance</p>
        </div>
        {isOwner && (
          <button
            onClick={() => { setForm((f) => ({ ...f, date: "" })); setShowForm(!showForm); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Add Event
          </button>
        )}
      </div>

      {/* Quick Add Form */}
      {showForm && isOwner && (
        <form
          onSubmit={handleCreate}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">New Event</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Event name…"
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
                  <option key={t.value} value={t.value}>{t.label}</option>
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
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Optional"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Notes</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {saving ? "Saving…" : "Save Event"}
            </button>
          </div>
        </form>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-white font-semibold text-lg">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 bg-zinc-950/60 border-b border-zinc-800">
          {DOW.map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Leading padding */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[88px] border-r border-b border-zinc-800 bg-zinc-950/30" />
          ))}

          {/* Actual days */}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`min-h-[88px] border-r border-b border-zinc-800 p-1.5 cursor-pointer transition-colors group
                  ${isSelected ? "bg-zinc-800" : "hover:bg-zinc-800/50"}
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                      ${today ? "bg-red-600 text-white" : "text-zinc-400 group-hover:text-zinc-200"}
                    `}
                  >
                    {format(day, "d")}
                  </span>
                  {/* Quick add for owners on hover */}
                  {isOwner && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openFormForDay(day); }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-all p-0.5 rounded"
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>

                {/* Event pills */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const t = typeInfo(ev.type);
                    return (
                      <div
                        key={ev.id}
                        className={`${t.pill} text-xs px-1.5 py-0.5 rounded truncate leading-tight`}
                      >
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-zinc-500 text-xs px-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">
              {format(selectedDay, "EEEE, MMMM d, yyyy")}
            </h2>
            {isOwner && (
              <button
                onClick={() => openFormForDay(selectedDay)}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2 py-1 rounded-md transition-colors"
              >
                <Plus size={12} /> Add event this day
              </button>
            )}
          </div>
          {selectedDayEvents.length === 0 ? (
            <p className="text-zinc-500 text-sm">Nothing scheduled on this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((ev) => {
                const t = typeInfo(ev.type);
                return (
                  <div key={ev.id} className="flex items-start gap-3">
                    <div className={`${t.dot} w-2.5 h-2.5 rounded-full mt-1 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium text-sm">{ev.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.pill}`}>{t.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-zinc-400 text-xs">
                          <CalendarDays size={11} />
                          {format(new Date(ev.date), "h:mm a")}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1 text-zinc-400 text-xs">
                            <MapPin size={11} />
                            {ev.location}
                          </span>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-zinc-400 text-xs mt-1">{ev.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap pb-2">
        {EVENT_TYPES.map((t) => (
          <div key={t.value} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${t.dot}`} />
            <span className="text-zinc-400 text-xs">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
