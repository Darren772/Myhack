"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function CreateEventPage() {
  const [form, setForm] = useState({
    host_uid: "", title: "MyHack 2025 — AI for Good",
    description: "A 48-hour hackathon focused on AI solutions for social impact. Looking for fintech and healthtech founders, developers with ML experience, and impact investors.",
    industry: "AI / Tech", event_date: "2025-09-01",
    needed_investors: 3, needed_participants: 10,
  });
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function create() {
    if (!form.host_uid.trim()) return alert("Enter Host UID");
    setStatus("loading");
    const { ok, data } = await apiFetch("POST", "/event/create", {
      ...form, needed_investors: Number(form.needed_investors), needed_participants: Number(form.needed_participants)
    });
    setStatus(ok ? "ok" : "err");
    setResult(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Create Event</h1>
      <p className="text-slate-400 text-sm mb-6"><span className="badge-post mr-2">POST</span>/event/create — Register a new hosted event</p>
      <div className="card">
        <label>Host UID (your Firestore user ID)</label>
        <input className="input" value={form.host_uid} onChange={e => set("host_uid", e.target.value)} placeholder="Paste your UID from Firestore" />
        <label>Event Title</label>
        <input className="input" value={form.title} onChange={e => set("title", e.target.value)} />
        <label>Description (used for AI compatibility matching)</label>
        <textarea className="textarea" value={form.description} onChange={e => set("description", e.target.value)} rows={4} />
        <div className="grid-2">
          <div>
            <label>Industry</label>
            <input className="input" value={form.industry} onChange={e => set("industry", e.target.value)} />
          </div>
          <div>
            <label>Event Date</label>
            <input className="input" type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div>
            <label>Investors to invite</label>
            <input className="input" type="number" value={form.needed_investors} onChange={e => set("needed_investors", e.target.value)} />
          </div>
          <div>
            <label>Participants to invite</label>
            <input className="input" type="number" value={form.needed_participants} onChange={e => set("needed_participants", e.target.value)} />
          </div>
        </div>
        <button className="btn" onClick={create} disabled={status === "loading"}>
          {status === "loading" ? "Creating…" : "Create Event"}
        </button>
        <div className="flex items-center gap-2 mt-3">
          <div className={`status-dot ${status}`} />
          <span className="text-xs text-slate-400">{status === "loading" ? "Creating…" : status === "ok" ? "Event created!" : status === "err" ? (result?.detail || "Error") : "Idle"}</span>
        </div>
      </div>

      {result && status === "ok" && (
        <div className="card border-emerald-500/30">
          <p className="text-emerald-400 font-semibold mb-2">Event Created Successfully!</p>
          <div className="bg-[#060610] rounded-lg p-3 font-mono text-xs text-slate-300 mb-3">
            <span className="text-slate-500">event_id: </span>
            <span className="text-violet-400 select-all">{result.event_id}</span>
          </div>
          <p className="text-xs text-slate-400">Copy the event_id above and go to <strong className="text-white">Broadcast Event</strong> to find compatible attendees.</p>
          <a href={`/events/broadcast?event_id=${result.event_id}`} className="btn mt-3 inline-block no-underline">
            Broadcast This Event →
          </a>
        </div>
      )}
    </div>
  );
}
