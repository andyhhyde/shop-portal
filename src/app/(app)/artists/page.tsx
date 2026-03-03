"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Users, Check, X, Eye, Pencil, Trash2, Bell, DollarSign } from "lucide-react";

type Artist = { id: string; name: string; email: string; role: string; phone: string | null; rentAmount: number; createdAt: string };
type NotifSettings = { enabled: boolean; daysBeforeDue: number; recurringEvery: number };
type NotifUser = { id: string; notificationSettings: NotifSettings | null };
type ReceiptCredit = {
  id: string;
  userId: string;
  period: string;
  amount: number;
  description: string;
  imagePath: string | null;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  user: { name: string };
};

export default function ArtistsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isOwner = (session?.user as { role?: string })?.role === "owner";

  const [artists, setArtists] = useState<Artist[]>([]);
  const [credits, setCredits] = useState<ReceiptCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "artist" });
  const [error, setError] = useState("");
  const [creditFilter, setCreditFilter] = useState<"flagged" | "all">("flagged");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "artist", password: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [notifSettings, setNotifSettings] = useState<Record<string, NotifSettings>>({});
  const [savingNotif, setSavingNotif] = useState<Record<string, boolean>>({});
  const [rentAmounts, setRentAmounts] = useState<Record<string, number>>({});
  const [savingRent, setSavingRent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOwner && session) router.push("/dashboard");
  }, [isOwner, session, router]);

  async function loadAll() {
    const [artistsRes, creditsRes, notifRes] = await Promise.all([
      fetch("/api/artists"),
      fetch("/api/receipt-credits"),
      fetch("/api/notification-settings"),
    ]);
    const artistsData: Artist[] = await artistsRes.json();
    setArtists(artistsData);
    const rentMap: Record<string, number> = {};
    for (const a of artistsData) rentMap[a.id] = a.rentAmount ?? 0;
    setRentAmounts(rentMap);
    setCredits(await creditsRes.json());
    const notifData: NotifUser[] = await notifRes.json();
    const map: Record<string, NotifSettings> = {};
    for (const u of notifData) {
      map[u.id] = u.notificationSettings ?? { enabled: true, daysBeforeDue: 7, recurringEvery: 3 };
    }
    setNotifSettings(map);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create account");
      setSaving(false);
      return;
    }
    setForm({ name: "", email: "", password: "", phone: "", role: "artist" });
    setShowForm(false);
    setSaving(false);
    loadAll();
  }

  async function handleCreditAction(creditId: string, action: "flagged" | "ineligible" | "approved", note?: string) {
    await fetch(`/api/receipt-credits/${creditId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, reviewNote: note ?? null }),
    });
    setRejectingId(null);
    setRejectNote("");
    loadAll();
  }

  async function handleDeleteArtist(artistId: string) {
    if (!confirm("Remove this account permanently? All their data will be deleted.")) return;
    const res = await fetch(`/api/artists/${artistId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Could not delete account");
      return;
    }
    loadAll();
  }

  function openEdit(artist: Artist) {
    setEditingArtist(artist);
    setEditForm({ name: artist.name, email: artist.email, phone: artist.phone ?? "", role: artist.role, password: "" });
    setEditError("");
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingArtist) return;
    setEditSaving(true);
    setEditError("");
    const body: Record<string, string> = { name: editForm.name, email: editForm.email, phone: editForm.phone, role: editForm.role };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/artists/${editingArtist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error ?? "Failed to update");
      setEditSaving(false);
      return;
    }
    setEditingArtist(null);
    setEditSaving(false);
    loadAll();
  }

  function updateNotif(userId: string, field: keyof NotifSettings, value: boolean | number) {
    setNotifSettings((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? { enabled: true, daysBeforeDue: 7, recurringEvery: 3 }), [field]: value },
    }));
  }

  async function handleSaveNotifSettings(userId: string) {
    setSavingNotif((prev) => ({ ...prev, [userId]: true }));
    await fetch(`/api/notification-settings/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifSettings[userId]),
    });
    setSavingNotif((prev) => ({ ...prev, [userId]: false }));
  }

  async function handleSaveRentAmount(artistId: string) {
    setSavingRent((prev) => ({ ...prev, [artistId]: true }));
    await fetch(`/api/artists/${artistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rentAmount: rentAmounts[artistId] ?? 0 }),
    });
    setSavingRent((prev) => ({ ...prev, [artistId]: false }));
  }

  const flaggedCount = credits.filter((c) => c.status === "flagged").length;
  const filteredCredits = creditFilter === "flagged"
    ? credits.filter((c) => c.status === "flagged")
    : credits;

  return (
    <div className="space-y-6 max-w-3xl">
      {editingArtist && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditingArtist(null); }}>
          <form onSubmit={handleEditSave} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Edit Account</h2>
              <button type="button" onClick={() => setEditingArtist(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            {editError && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">{editError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Name *</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Email *</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Phone</label>
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="artist">Artist</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">New Password <span className="text-zinc-600">(leave blank to keep current)</span></label>
                <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••••" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={editSaving} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">{editSaving ? "Saving…" : "Save Changes"}</button>
              <button type="button" onClick={() => setEditingArtist(null)} className="text-zinc-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Artists</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage shop accounts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Create Account</h2>
          {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Jane Smith" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="jane@shop.com" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Password *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="••••••••" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="555-0100" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="artist">Artist</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">{saving ? "Creating…" : "Create Account"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <>
          {/* Artists table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {artists.length === 0 ? (
              <div className="py-12 text-center">
                <Users size={32} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No accounts yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-5 py-3 text-zinc-400 font-medium">Name</th>
                    <th className="text-left px-5 py-3 text-zinc-400 font-medium">Email</th>
                    <th className="text-left px-5 py-3 text-zinc-400 font-medium">Phone</th>
                    <th className="text-left px-5 py-3 text-zinc-400 font-medium">Role</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {artists.map((a) => (
                    <tr key={a.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40">
                      <td className="px-5 py-3 text-white font-medium">{a.name}</td>
                      <td className="px-5 py-3 text-zinc-300">{a.email}</td>
                      <td className="px-5 py-3 text-zinc-400">{a.phone ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${a.role === "owner" ? "bg-red-900 text-red-300" : "bg-zinc-800 text-zinc-300"}`}>
                          {a.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEdit(a)} className="text-zinc-500 hover:text-zinc-300 transition-colors" title="Edit account"><Pencil size={13} /></button>
                          <button onClick={() => handleDeleteArtist(a.id)} className="text-zinc-500 hover:text-red-400 transition-colors" title="Remove account"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Receipt Credit Submissions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Receipt Credit Submissions</h2>
                <p className="text-zinc-500 text-xs mt-0.5">Supply credits submitted by artists toward their booth rent</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setCreditFilter("flagged")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${creditFilter === "flagged" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                >
                  Flagged{flaggedCount > 0 ? ` (${flaggedCount})` : ""}
                </button>
                <button
                  onClick={() => setCreditFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${creditFilter === "all" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                >
                  All
                </button>
              </div>
            </div>

            {filteredCredits.length === 0 ? (
              <p className="text-zinc-500 text-sm py-6 text-center">
                {creditFilter === "flagged" ? "No flagged submissions — you're all clear." : "No receipt credits on record."}
              </p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {filteredCredits.map((c) => (
                  <div key={c.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm">{c.user.name}</p>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-400 text-xs">{c.period}</span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-green-400 font-bold text-sm">${c.amount.toFixed(2)}</span>
                          <CreditStatusPill status={c.status} />
                        </div>
                        <p className="text-zinc-300 text-xs mt-1">{c.description}</p>
                        {c.reviewNote && (
                          <p className="text-zinc-500 text-xs mt-1 italic">Review note: {c.reviewNote}</p>
                        )}
                        <p className="text-zinc-600 text-xs mt-1">Submitted {format(new Date(c.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {c.imagePath && (
                          <a
                            href={c.imagePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-1 rounded-md transition-colors"
                          >
                            <Eye size={11} /> Receipt
                          </a>
                        )}
                        {/* Approved: owner can flag for review */}
                        {c.status === "approved" && (
                          <button
                            onClick={() => { setRejectingId(c.id); setRejectNote(""); }}
                            className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 border border-orange-900 hover:border-orange-700 px-2 py-1 rounded-md transition-colors"
                          >
                            <X size={11} /> Flag
                          </button>
                        )}
                        {/* Flagged: mark ineligible (removes from rent credit) or reinstate */}
                        {c.status === "flagged" && rejectingId !== c.id && (
                          <>
                            <button
                              onClick={() => handleCreditAction(c.id, "approved")}
                              className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-2 py-1 rounded-md transition-colors"
                            >
                              <Check size={11} /> Reinstate
                            </button>
                            <button
                              onClick={() => { setRejectingId(c.id); setRejectNote(""); }}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2 py-1 rounded-md transition-colors"
                            >
                              <X size={11} /> Mark Ineligible
                            </button>
                          </>
                        )}
                        {/* Ineligible: can reinstate */}
                        {c.status === "ineligible" && (
                          <button
                            onClick={() => handleCreditAction(c.id, "approved")}
                            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded-md transition-colors"
                          >
                            <Check size={11} /> Reinstate
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Inline reject note */}
                    {rejectingId === c.id && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder={c.status === "approved" ? "Reason for flagging…" : "Reason credit is ineligible…"}
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                        <button
                          onClick={() => handleCreditAction(c.id, c.status === "approved" ? "flagged" : "ineligible", rejectNote)}
                          className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {c.status === "approved" ? "Confirm Flag" : "Confirm Ineligible"}
                        </button>
                        <button
                          onClick={() => setRejectingId(null)}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Rent Amounts */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <DollarSign size={15} className="text-zinc-400" /> Monthly Rent
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">
                Set the booth rent amount each person owes per month. Owners typically pay a reduced rate.
              </p>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-zinc-800">
              {artists.map((a) => {
                const amount = rentAmounts[a.id] ?? 0;
                const saving = savingRent[a.id] ?? false;
                return (
                  <div key={a.id} className="px-5 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{a.name}</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        a.role === "owner" ? "bg-red-900 text-red-300" : "bg-zinc-800 text-zinc-300"
                      }`}>{a.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-sm">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) =>
                          setRentAmounts((prev) => ({ ...prev, [a.id]: parseFloat(e.target.value) || 0 }))
                        }
                        min="0"
                        step="0.01"
                        className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <span className="text-zinc-500 text-xs">/month</span>
                    </div>
                    <button
                      onClick={() => handleSaveRentAmount(a.id)}
                      disabled={saving}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg transition-colors font-medium"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Role</th>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Monthly Rent</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {artists.map((a) => {
                  const amount = rentAmounts[a.id] ?? 0;
                  const saving = savingRent[a.id] ?? false;
                  return (
                    <tr key={a.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                      <td className="px-5 py-3 text-white font-medium">{a.name}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          a.role === "owner" ? "bg-red-900 text-red-300" : "bg-zinc-800 text-zinc-300"
                        }`}>{a.role}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">$</span>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) =>
                              setRentAmounts((prev) => ({ ...prev, [a.id]: parseFloat(e.target.value) || 0 }))
                            }
                            min="0"
                            step="0.01"
                            className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <span className="text-zinc-500 text-xs">/month</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleSaveRentAmount(a.id)}
                          disabled={saving}
                          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notification Settings */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Bell size={15} className="text-zinc-400" /> Notification Settings
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">
                Configure when each artist receives rent reminders. Reminders repeat until rent is marked paid.
              </p>
            </div>

            {/* Mobile cards (hidden on md+) */}
            <div className="md:hidden divide-y divide-zinc-800">
              {artists.map((a) => {
                const s = notifSettings[a.id] ?? { enabled: true, daysBeforeDue: 7, recurringEvery: 3 };
                const saving = savingNotif[a.id] ?? false;
                return (
                  <div key={a.id} className="px-5 py-4 space-y-3">
                    {/* Artist name + toggle on one row */}
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{a.name}</span>
                      <button
                        type="button"
                        onClick={() => updateNotif(a.id, "enabled", !s.enabled)}
                        className={`relative inline-flex w-10 h-5 rounded-full transition-colors focus:outline-none ${
                          s.enabled ? "bg-red-600" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                            s.enabled ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    {/* Two number inputs in a 2-col grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-zinc-400 text-xs">First Notice</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={s.daysBeforeDue}
                            onChange={(e) =>
                              updateNotif(a.id, "daysBeforeDue", Math.max(1, parseInt(e.target.value) || 1))
                            }
                            min="1"
                            max="30"
                            disabled={!s.enabled}
                            className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-40"
                          />
                          <span className="text-zinc-500 text-xs">days before</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-400 text-xs">Repeat Every</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={s.recurringEvery}
                            onChange={(e) =>
                              updateNotif(a.id, "recurringEvery", Math.max(1, parseInt(e.target.value) || 1))
                            }
                            min="1"
                            max="14"
                            disabled={!s.enabled}
                            className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-40"
                          />
                          <span className="text-zinc-500 text-xs">days</span>
                        </div>
                      </div>
                    </div>
                    {/* Save button */}
                    <button
                      onClick={() => handleSaveNotifSettings(a.id)}
                      disabled={saving}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg transition-colors font-medium"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop table (hidden below md) */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Artist</th>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Active</th>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">First Notice</th>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Repeat Every</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {artists.map((a) => {
                  const s = notifSettings[a.id] ?? { enabled: true, daysBeforeDue: 7, recurringEvery: 3 };
                  const saving = savingNotif[a.id] ?? false;
                  return (
                    <tr key={a.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                      <td className="px-5 py-3 text-white font-medium">{a.name}</td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => updateNotif(a.id, "enabled", !s.enabled)}
                          className={`relative inline-flex w-10 h-5 rounded-full transition-colors focus:outline-none ${
                            s.enabled ? "bg-red-600" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              s.enabled ? "left-5" : "left-0.5"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={s.daysBeforeDue}
                            onChange={(e) =>
                              updateNotif(a.id, "daysBeforeDue", Math.max(1, parseInt(e.target.value) || 1))
                            }
                            min="1"
                            max="30"
                            disabled={!s.enabled}
                            className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-40"
                          />
                          <span className="text-zinc-500 text-xs">days before due</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs">every</span>
                          <input
                            type="number"
                            value={s.recurringEvery}
                            onChange={(e) =>
                              updateNotif(a.id, "recurringEvery", Math.max(1, parseInt(e.target.value) || 1))
                            }
                            min="1"
                            max="14"
                            disabled={!s.enabled}
                            className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-40"
                          />
                          <span className="text-zinc-500 text-xs">days until paid</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleSaveNotifSettings(a.id)}
                          disabled={saving}
                          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CreditStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-green-900 text-green-300",
    flagged: "bg-orange-900 text-orange-300",
    ineligible: "bg-red-900 text-red-300",
    pending: "bg-yellow-900 text-yellow-300",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-zinc-800 text-zinc-400"}`}>
      {status}
    </span>
  );
}

