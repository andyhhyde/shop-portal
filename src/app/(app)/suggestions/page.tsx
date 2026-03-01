"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Send, Trash2, MessageSquare } from "lucide-react";

type SuggestionUser = { id: string; name: string; role: string };
type Suggestion = {
  id: string;
  body: string;
  createdAt: string;
  user: SuggestionUser;
};

export default function SuggestionsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const isOwner = (session?.user as { role?: string })?.role === "owner";

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    const res = await fetch("/api/suggestions");
    setSuggestions(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBody("");
    setSubmitting(false);
    load();
    textareaRef.current?.focus();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch("/api/suggestions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    load();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Suggestion Box</h1>
        <p className="text-zinc-400 text-sm mt-1">Share ideas, feedback, or anything on your mind — visible to everyone.</p>
      </div>

      {/* Compose */}
      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Drop an idea or leave some feedback…"
          rows={3}
          maxLength={500}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-zinc-600 text-xs">{body.length}/500 · Ctrl+Enter to submit</p>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Send size={14} />
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      {/* Feed */}
      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading…</div>
      ) : suggestions.length === 0 ? (
        <div className="py-16 text-center">
          <MessageSquare size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No suggestions yet. Be the first to post!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => {
            const isOwnerPost = s.user.role === "owner";
            const canDelete = s.user.id === userId || isOwner;
            return (
              <div
                key={s.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-white text-sm font-semibold">{s.user.name}</span>
                      {isOwnerPost && (
                        <span className="bg-red-900 text-red-300 text-xs px-2 py-0.5 rounded-full font-medium">Owner</span>
                      )}
                      <span className="text-zinc-600 text-xs">
                        {format(new Date(s.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-zinc-200 text-sm whitespace-pre-wrap break-words">{s.body}</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all disabled:opacity-30 shrink-0 mt-0.5"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
