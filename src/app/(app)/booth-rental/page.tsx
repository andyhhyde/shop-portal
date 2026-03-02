"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format, addMonths, startOfMonth } from "date-fns";
import { Plus, Check, DollarSign, Receipt, Upload, X, Eye, AlertTriangle } from "lucide-react";

type Artist = { id: string; name: string; email: string; rentAmount: number };
type Payment = {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  notes: string | null;
  user: Artist;
};
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
};

// Generate a list of month/year options: 3 months back through 3 months forward
function getPeriodOptions(): string[] {
  const base = startOfMonth(new Date());
  return Array.from({ length: 7 }, (_, i) =>
    format(addMonths(base, i - 3), "MMMM yyyy")
  );
}

export default function BoothRentalPage() {
  const { data: session } = useSession();
  const isOwner = (session?.user as { role?: string })?.role === "owner";
  const userId = (session?.user as { id?: string })?.id;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [credits, setCredits] = useState<ReceiptCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCredit, setSavingCredit] = useState(false);
  const [applyingCredit, setApplyingCredit] = useState<string | null>(null); // paymentId being applied
  const [form, setForm] = useState({ userId: "", amount: "", dueDate: "", period: "", notes: "" });
  const periodOptions = getPeriodOptions();
  const currentPeriod = format(startOfMonth(new Date()), "MMMM yyyy");
  const [creditForm, setCreditForm] = useState({
    forUserId: "",
    period: currentPeriod,
    amount: "",
    description: "",
    file: null as File | null,
  });

  async function loadData() {
    const [paymentsRes, artistsRes, creditsRes] = await Promise.all([
      fetch("/api/booth-payments"),
      fetch("/api/artists"),
      fetch("/api/receipt-credits"),
    ]);
    setPayments(await paymentsRes.json());
    setArtists(await artistsRes.json());
    setCredits(await creditsRes.json());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/booth-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ userId: "", amount: "", dueDate: "", period: "", notes: "" });
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleCreditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingCredit(true);
    const fd = new FormData();
    fd.append("period", creditForm.period);
    fd.append("amount", creditForm.amount);
    fd.append("description", creditForm.description);
    if (isOwner && creditForm.forUserId) fd.append("userId", creditForm.forUserId);
    if (creditForm.file) fd.append("receipt", creditForm.file);
    await fetch("/api/receipt-credits", { method: "POST", body: fd });
    setCreditForm({ forUserId: "", period: currentPeriod, amount: "", description: "", file: null });
    setShowCreditForm(false);
    setSavingCredit(false);
    loadData();
  }

  async function markPaid(paymentId: string) {
    await fetch(`/api/booth-payments/${paymentId}/pay`, { method: "POST" });
    loadData();
  }

  // Apply all approved credits for a period to a payment (marks as paid if net = 0)
  async function applyCredits(paymentId: string) {
    setApplyingCredit(paymentId);
    await fetch(`/api/booth-payments/${paymentId}/apply-credits`, { method: "POST" });
    setApplyingCredit(null);
    loadData();
  }

  function approvedCreditsFor(uid: string, period: string) {
    return credits
      .filter((c) => c.userId === uid && c.period === period && c.status === "approved")
      .reduce((sum, c) => sum + c.amount, 0);
  }

  function ineligibleCreditsFor(uid: string, period: string) {
    return credits
      .filter((c) => c.userId === uid && c.period === period && c.status === "ineligible")
      .reduce((sum, c) => sum + c.amount, 0);
  }

  const myPayments = payments.filter((p) => p.user.id === userId);
  const myCredits = credits.filter((c) => c.userId === userId);
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const lateCount = payments.filter((p) => p.status === "late").length;
  const totalCollected = payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Booth Rental</h1>
          <p className="text-zinc-400 text-sm mt-1">Payment tracking per artist</p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Add Payment
            </button>
          )}
          <button
            onClick={() => setShowCreditForm(!showCreditForm)}
            className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Receipt size={16} /> Submit Credit
          </button>
        </div>
      </div>

      {/* Stats (owner only) */}
      {isOwner && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
            <p className="text-xs text-zinc-400 mt-1">Pending</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{lateCount}</p>
            <p className="text-xs text-zinc-400 mt-1">Late</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">${totalCollected.toFixed(0)}</p>
            <p className="text-xs text-zinc-400 mt-1">Collected</p>
          </div>
        </div>
      )}

      {/* Add Payment Form (owner only) */}
      {showForm && isOwner && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Add Booth Payment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Artist *</label>
              <select value={form.userId} onChange={(e) => { const a = artists.find(x => x.id === e.target.value); setForm({ ...form, userId: e.target.value, amount: a?.rentAmount ? String(a.rentAmount) : form.amount }); }} required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select artist…</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Period *</label>
              <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select month…</option>
                {periodOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Amount ($) *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="600" min="0" step="0.01" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Due Date *</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">{saving ? "Saving…" : "Add"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Submit Credit Form */}
      {showCreditForm && (
        <form onSubmit={handleCreditSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Submit Supply Credit</h2>
            <button type="button" onClick={() => setShowCreditForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
          </div>
          <p className="text-zinc-400 text-xs">Picked up supplies for the shop? Upload your receipt and enter the amount. It&apos;ll be applied as a credit toward your rent for that month.</p>
          <div className="grid grid-cols-2 gap-4">
            {isOwner && (
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Submitting for Artist *</label>
                <select value={creditForm.forUserId} onChange={(e) => setCreditForm({ ...creditForm, forUserId: e.target.value })} required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select artist…</option>
                  {artists.filter((a) => (a as Artist & { role?: string }).role !== "owner").map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Month / Period *</label>
              <select value={creditForm.period} onChange={(e) => setCreditForm({ ...creditForm, period: e.target.value })} required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                {periodOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Credit Amount ($) *</label>
              <input type="number" value={creditForm.amount} onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })} required min="0.01" step="0.01" placeholder="45.00" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">What did you buy? *</label>
              <input value={creditForm.description} onChange={(e) => setCreditForm({ ...creditForm, description: e.target.value })} required placeholder="e.g. Paper towels and green soap from Costco" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Receipt Photo <span className="text-zinc-600">(optional but recommended)</span></label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setCreditForm({ ...creditForm, file: e.target.files?.[0] ?? null })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm file:mr-3 file:bg-zinc-700 file:text-white file:text-xs file:border-0 file:px-2 file:py-1 file:rounded focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={savingCredit} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <span className="flex items-center gap-2"><Upload size={14} />{savingCredit ? "Submitting…" : "Submit Credit"}</span>
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <>
          {isOwner ? (
            /* Owner: all payments with credits */
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h2 className="font-semibold text-white">All Payments</h2>
              </div>
              {payments.length === 0 ? (
                <p className="text-zinc-500 text-sm py-6 text-center">No payments yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Artist</th>
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Period</th>
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Rent</th>
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Credits</th>
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Disputed</th>
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Net Due</th>
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Due</th>
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const creditTotal = approvedCreditsFor(p.user.id, p.period);
                        const ineligibleTotal = ineligibleCreditsFor(p.user.id, p.period);
                        const netDue = Math.max(0, p.amount - creditTotal + ineligibleTotal);
                        return (
                          <tr key={p.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40">
                            <td className="px-5 py-3 text-white">{p.user.name}</td>
                            <td className="px-5 py-3 text-zinc-300">{p.period}</td>
                            <td className="px-5 py-3 text-white font-semibold">
                              <span className="flex items-center gap-1"><DollarSign size={13} className="text-zinc-400" />{p.amount.toFixed(2)}</span>
                            </td>
                            <td className="px-5 py-3">
                              {creditTotal > 0
                                ? <span className="text-amber-400 font-semibold">−${creditTotal.toFixed(2)}</span>
                                : <span className="text-zinc-600">—</span>}
                            </td>
                            <td className="px-5 py-3">
                              {ineligibleTotal > 0
                                ? <span className="flex items-center gap-1 text-red-400 font-semibold"><AlertTriangle size={12} />+${ineligibleTotal.toFixed(2)}</span>
                                : <span className="text-zinc-600">—</span>}
                            </td>
                            <td className="px-5 py-3 text-white font-bold">${netDue.toFixed(2)}</td>
                          <td className="px-5 py-3 text-zinc-300">{format(new Date(p.dueDate), "MMM d, yyyy")}</td>
                          <td className="px-5 py-3"><StatusPill status={p.status} /></td>
                          <td className="px-5 py-3">
                            {p.status !== "paid" && (
                              <button onClick={() => markPaid(p.id)} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-2 py-1 rounded-md transition-colors">
                                <Check size={12} /> Mark Paid
                              </button>
                            )}
                            {p.status === "paid" && p.paidDate && (
                              <span className="text-xs text-zinc-500">Paid {format(new Date(p.paidDate), "MMM d")}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* Artist: own payments + credit history */
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                  <h2 className="font-semibold text-white">My Booth Payments</h2>
                </div>
                {myPayments.length === 0 ? (
                  <p className="text-zinc-500 text-sm py-6 text-center">No payments on record.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Period</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Rent</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Credits</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Disputed</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Net Due</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Due Date</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Status</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {myPayments.map((p) => {
                        const creditTotal = approvedCreditsFor(p.user.id, p.period);
                          const ineligibleTotal = ineligibleCreditsFor(p.user.id, p.period);
                          const netDue = Math.max(0, p.amount - creditTotal + ineligibleTotal);
                          return (
                            <tr key={p.id} className="border-b border-zinc-800 last:border-0">
                              <td className="px-5 py-3 text-white">{p.period}</td>
                              <td className="px-5 py-3 text-white">${p.amount.toFixed(2)}</td>
                              <td className="px-5 py-3">
                                {creditTotal > 0
                                  ? <span className="text-amber-400 font-semibold">−${creditTotal.toFixed(2)}</span>
                                  : <span className="text-zinc-600">—</span>}
                              </td>
                              <td className="px-5 py-3">
                                {ineligibleTotal > 0
                                  ? <span className="flex items-center gap-1 text-red-400 font-semibold"><AlertTriangle size={12} />+${ineligibleTotal.toFixed(2)}</span>
                                  : <span className="text-zinc-600">—</span>}
                              </td>
                              <td className="px-5 py-3 text-white font-bold">${netDue.toFixed(2)}</td>
                              <td className="px-5 py-3 text-zinc-300">{format(new Date(p.dueDate), "MMM d, yyyy")}</td>
                              <td className="px-5 py-3"><StatusPill status={p.status} /></td>
                              <td className="px-5 py-3">
                                {p.status !== "paid" && creditTotal > 0 && (
                                  <button
                                    onClick={() => applyCredits(p.id)}
                                    disabled={applyingCredit === p.id}
                                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 border border-amber-800 hover:border-amber-600 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                  >
                                    <DollarSign size={12} />{applyingCredit === p.id ? "Applying…" : "Apply Credits"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Artist credit history */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h2 className="font-semibold text-white">My Receipt Credits</h2>
                  <button
                    onClick={() => setShowCreditForm(!showCreditForm)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2 py-1 rounded-md transition-colors"
                  >
                    <Upload size={12} /> Submit Credit
                  </button>
                </div>
                {myCredits.length === 0 ? (
                  <p className="text-zinc-500 text-sm py-6 text-center">No credits submitted yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Period</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Amount</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Description</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Receipt</th>
                        <th className="text-left px-5 py-3 text-zinc-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myCredits.map((c) => (
                        <tr key={c.id} className="border-b border-zinc-800 last:border-0">
                          <td className="px-5 py-3 text-white">{c.period}</td>
                          <td className="px-5 py-3 text-white font-semibold">${c.amount.toFixed(2)}</td>
                          <td className="px-5 py-3 text-zinc-300 text-xs max-w-[200px] truncate">{c.description}</td>
                          <td className="px-5 py-3">
                            {c.imagePath
                              ? <a href={c.imagePath} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"><Eye size={11} /> View</a>
                              : <span className="text-zinc-600 text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3">
                            <CreditStatusPill status={c.status} />
                            {c.reviewNote && <p className="text-zinc-500 text-xs mt-0.5 italic">{c.reviewNote}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-green-900 text-green-300",
    pending: "bg-yellow-900 text-yellow-300",
    late: "bg-red-900 text-red-300",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-zinc-800 text-zinc-400"}`}>
      {status}
    </span>
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
