"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function JourneyPage() {
  const [uid, setUid] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function generate() {
    if (!uid.trim()) return alert("Enter a UID");
    setStatus("loading"); setSummary("");
    const { ok, data } = await apiFetch("POST", "/journey", { uid });
    setStatus(ok ? "ok" : "err");
    if (ok) setSummary(data.summary);
    else setErrMsg(data.detail || "Error");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Journey Summary</h1>
      <p className="text-slate-400 text-sm mb-6"><span className="badge-post mr-2">POST</span>/journey — AI narrative of a user's ecosystem journey</p>
      <div className="card">
        <label>User UID</label>
        <input className="input" value={uid} onChange={e => setUid(e.target.value)} placeholder="e.g. 5qohuvNg3l3c7wuzI1dc" />
        <button className="btn" onClick={generate} disabled={status === "loading"}>
          {status === "loading" ? "Generating…" : "Generate Journey"}
        </button>
        <div className="flex items-center gap-2 mt-3">
          <div className={`status-dot ${status}`} />
          <span className="text-xs text-slate-400">{status === "loading" ? "Generating narrative…" : status === "err" ? errMsg : "Idle"}</span>
        </div>
      </div>
      {summary && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">AI Journey Summary</h2>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{summary}</p>
        </div>
      )}
    </div>
  );
}
