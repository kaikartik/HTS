"use client";

// Raise a ticket on behalf of a requester (FR-11): phone call or walk-in.

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Breadcrumb from "../../components/Breadcrumb";
import { AGENT_BASE, api, errorMessage, type Category } from "../../lib/api";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const CHANNELS = ["Phone", "Walk-in"];

export default function NewTicketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState("Phone");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<Category[]>("/categories")
      .then(setCategories)
      .catch((err) => setError(errorMessage(err, "Could not load categories.")));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !subject.trim() || !description.trim() || !categoryId) {
      setError("Please fill in the requester email, category, subject and description.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api<{ ticket_id: number }>("/tickets", {
        method: "POST",
        body: {
          requester_email: email,
          channel,
          category_id: Number(categoryId),
          priority,
          subject,
          description,
        },
      });
      router.push(`${AGENT_BASE}/tickets/${result.ticket_id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div className="max-w-3xl">
      <Breadcrumb
        items={[
          { label: "Overview", href: AGENT_BASE },
          { label: "New ticket for requester" },
        ]}
      />
      <h1 className="text-2xl font-bold text-slate-900">Raise a ticket for a requester</h1>
      <p className="mt-1 text-sm text-slate-500">
        Use this when a requester contacts you by phone or walks in. The ticket is assigned to you.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="req-email" className={labelClass}>Requester email *</label>
            <input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="channel" className={labelClass}>Contact channel *</label>
            <select id="channel" value={channel} onChange={(e) => setChannel(e.target.value)} className={fieldClass}>
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="category" className={labelClass}>Category *</label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className={labelClass}>Priority *</label>
            <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={fieldClass}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="subject" className={labelClass}>Subject *</label>
          <input id="subject" maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldClass} />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>Describe the problem *</label>
          <textarea id="description" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className={fieldClass} />
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create ticket"}
          </button>
          <button
            type="button"
            onClick={() => router.push(AGENT_BASE)}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
