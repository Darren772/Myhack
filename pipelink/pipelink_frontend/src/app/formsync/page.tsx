"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function FormSyncPage() {
  const [email, setEmail] = useState("demo_0@pipelink.dev");
  const [eventName, setEventName] = useState("MyHack 2025");
  const [formId, setFormId] = useState("myhack-2025");
  const [secret, setSecret] = useState("pipelink-webhook-secret");
  const [fields, setFields] = useState(`{\n  "Full Name": "Aisha Razak",\n  "What are your skills?": "Python, Django, Fintech",\n  "Role": "speaker"\n}`);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");

  async function sync() {
    let parsed;
    try { parsed = JSON.parse(fields); } catch { return alert("Invalid JSON in fields"); }
    setStatus("loading");
    const { ok, data } = await apiFetch("POST", "/form-sync",
      { user_email: email, event_name: eventName, form_id: formId, fields: parsed },
      { "x-webhook-secret": secret }
    );
    setStatus(ok ? "ok" : "err");
    setResult(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Form Sync</h1>
      <p className="text-slate-400 text-sm mb-6"><span className="badge-post mr-2">POST</span>/form-sync — Sync a form submission to Firestore</p>
      <div className="card">
        <div className="grid-2">
          <div><label>User Email</label><input className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label>Event Name</label><input className="input" value={eventName} onChange={e => setEventName(e.target.value)} /></div>
        </div>
        <div className="grid-2">
          <div><label>Form ID</label><input className="input" value={formId} onChange={e => setFormId(e.target.value)} /></div>
          <div><label>Webhook Secret</label><input className="input" value={secret} onChange={e => setSecret(e.target.value)} /></div>
        </div>
        <label>Form Fields (JSON)</label>
        <textarea className="textarea" value={fields} onChange={e => setFields(e.target.value)} rows={5} />
        <button className="btn" onClick={sync} disabled={status === "loading"}>
          {status === "loading" ? "Syncing…" : "Sync Form"}
        </button>
        <div className="flex items-center gap-2 mt-3">
          <div className={`status-dot ${status}`} />
          <span className="text-xs text-slate-400">{status === "ok" ? "Synced successfully" : status === "err" ? (result?.detail || "Error") : "Idle"}</span>
        </div>
      </div>
      {result && <div className={`json-box ${status === "err" ? "err" : ""}`}>{JSON.stringify(result, null, 2)}</div>}
    </div>
  );
}
