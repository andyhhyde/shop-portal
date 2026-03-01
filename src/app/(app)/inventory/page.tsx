"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, AlertTriangle, Pencil, Check, X, ExternalLink } from "lucide-react";

function fmtQty(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

const CATEGORIES = ["all", "ink", "needles", "aftercare", "equipment", "merch", "cleaning", "drinks", "general"];

type Item = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderAt: number;
  supplier: string | null;
  orderUrl: string | null;
  notes: string | null;
};

export default function InventoryPage() {
  const { data: session } = useSession();
  const isOwner = (session?.user as { role?: string })?.role === "owner";

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "general",
    quantity: "",
    unit: "units",
    reorderAt: "5",
    supplier: "",
    orderUrl: "",
    notes: "",
  });
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editItemForm, setEditItemForm] = useState({ name: "", category: "general", quantity: "", unit: "units", reorderAt: "5", supplier: "", orderUrl: "", notes: "" });
  const [editItemSaving, setEditItemSaving] = useState(false);

  async function loadItems() {
    const res = await fetch("/api/inventory");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadItems(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", category: "general", quantity: "", unit: "units", reorderAt: "5", supplier: "", orderUrl: "", notes: "" });
    setShowForm(false);
    setSaving(false);
    loadItems();
  }

  async function handleUpdateQty(itemId: string) {
    await fetch(`/api/inventory/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: editQty }),
    });
    setEditingId(null);
    loadItems();
  }

  async function handleUpdateUrl(itemId: string) {
    await fetch(`/api/inventory/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderUrl: editUrl }),
    });
    setEditingUrlId(null);
    loadItems();
  }

  async function handleDelete(itemId: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/inventory/${itemId}`, { method: "DELETE" });
    loadItems();
  }

  function openItemEdit(item: Item) {
    setEditingItem(item);
    setEditItemForm({
      name: item.name,
      category: item.category,
      quantity: fmtQty(item.quantity),
      unit: item.unit,
      reorderAt: fmtQty(item.reorderAt),
      supplier: item.supplier ?? "",
      orderUrl: item.orderUrl ?? "",
      notes: item.notes ?? "",
    });
  }

  async function handleEditItemSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setEditItemSaving(true);
    await fetch(`/api/inventory/${editingItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editItemForm),
    });
    setEditingItem(null);
    setEditItemSaving(false);
    loadItems();
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);
  const lowStockCount = items.filter((i) => i.quantity <= i.reorderAt).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {editingItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditingItem(null); }}>
          <form onSubmit={handleEditItemSave} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Edit Item</h2>
              <button type="button" onClick={() => setEditingItem(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Item Name *</label>
                <input value={editItemForm.name} onChange={(e) => setEditItemForm({ ...editItemForm, name: e.target.value })} required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Category</label>
                <select value={editItemForm.category} onChange={(e) => setEditItemForm({ ...editItemForm, category: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  {CATEGORIES.filter((c) => c !== "all").map((c) => (
                    <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Supplier</label>
                <input value={editItemForm.supplier} onChange={(e) => setEditItemForm({ ...editItemForm, supplier: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Order URL</label>
                <input type="url" value={editItemForm.orderUrl} onChange={(e) => setEditItemForm({ ...editItemForm, orderUrl: e.target.value })} placeholder="https://supplier.com/product…" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Quantity</label>
                <input type="number" value={editItemForm.quantity} onChange={(e) => setEditItemForm({ ...editItemForm, quantity: e.target.value })} min="0" step="0.5" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Unit <span className="text-zinc-600">(boxes, bottles…)</span></label>
                <input value={editItemForm.unit} onChange={(e) => setEditItemForm({ ...editItemForm, unit: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Reorder Alert At <span className="text-zinc-600">(0.5 = half a box)</span></label>
                <input type="number" value={editItemForm.reorderAt} onChange={(e) => setEditItemForm({ ...editItemForm, reorderAt: e.target.value })} min="0" step="0.5" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes</label>
                <input value={editItemForm.notes} onChange={(e) => setEditItemForm({ ...editItemForm, notes: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={editItemSaving} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">{editItemSaving ? "Saving…" : "Save Changes"}</button>
              <button type="button" onClick={() => setEditingItem(null)} className="text-zinc-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {items.length} items
            {lowStockCount > 0 && (
              <span className="ml-2 text-amber-400">· {lowStockCount} low stock</span>
            )}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Add Item
          </button>
        )}
      </div>

      {/* Add Item Form */}
      {showForm && isOwner && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Add Inventory Item</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Item Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Dynamic black ink" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                {CATEGORIES.filter((c) => c !== "all").map((c) => (
                  <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Supplier</label>
              <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Order URL <span className="text-zinc-600">(link to reorder page)</span></label>
              <input type="url" value={form.orderUrl} onChange={(e) => setForm({ ...form, orderUrl: e.target.value })} placeholder="https://supplier.com/product…" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Quantity *</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required min="0" step="0.5" placeholder="1" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Unit</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="bottles / boxes / units" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Reorder Alert At <span className="text-zinc-600">(0.5 = half a box)</span></label>
              <input type="number" value={form.reorderAt} onChange={(e) => setForm({ ...form, reorderAt: e.target.value })} min="0" step="0.5" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional…" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {saving ? "Saving…" : "Add Item"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${filter === c ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">No items in this category.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Item</th>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Category</th>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Quantity</th>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Supplier / Order</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isLow = item.quantity <= item.reorderAt;
                  return (
                    <tr key={item.id} className={`border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 ${isLow ? "bg-amber-950/20" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle size={14} className="text-amber-400 shrink-0" />}
                          <div>
                            <p className="text-white font-medium">{item.name}</p>
                            {item.notes && <p className="text-zinc-500 text-xs">{item.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full capitalize">{item.category}</span>
                      </td>
                      <td className="px-5 py-3">
                        {editingId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editQty}
                              onChange={(e) => setEditQty(parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.5"
                              className="w-16 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            <button onClick={() => handleUpdateQty(item.id)} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                            <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-zinc-300"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isLow ? "text-amber-400" : "text-white"}`}>{fmtQty(item.quantity)}</span>
                            <span className="text-zinc-500 text-xs">{item.unit}</span>
                            <button
                              onClick={() => { setEditingId(item.id); setEditQty(item.quantity); }}
                              className="text-zinc-600 hover:text-zinc-300 transition-colors"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {editingUrlId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              placeholder="https://…"
                              className="w-40 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            <button onClick={() => handleUpdateUrl(item.id)} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                            <button onClick={() => setEditingUrlId(null)} className="text-zinc-500 hover:text-zinc-300"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-zinc-400 text-xs">{item.supplier ?? "—"}</span>
                            {item.orderUrl && (
                              <a
                                href={item.orderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs border border-blue-900 hover:border-blue-700 px-1.5 py-0.5 rounded transition-colors"
                              >
                                <ExternalLink size={10} /> Order
                              </a>
                            )}
                            {isOwner && (
                              <button
                                onClick={() => { setEditingUrlId(item.id); setEditUrl(item.orderUrl ?? ""); }}
                                className="text-zinc-600 hover:text-zinc-400 transition-colors"
                                title="Edit order URL"
                              >
                                <Pencil size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isOwner && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => openItemEdit(item)} className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Edit item"><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-400 transition-colors" title="Delete item"><X size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
