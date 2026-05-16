"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function EmbedPage() {
  const [uid, setUid] = useState("");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");

  async function embed() {
    if (!uid.trim()) return alert("Enter a UID");
    setStatus("loading");
    const { ok, data } = await apiFetch("POST", "/embed-profile", { uid });
    setStatus(ok ? "ok" : "err");
    setResult(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Embed Profile</h1>
      <p className="text-slate-400 text-sm mb-6"><span className="badge-post mr-2">POST</span>/embed-profile — Generate semantic vector for a user</p>
      <div className="card">
        <label>User UID (from Firestore)</label>
        <input className="input" value={uid} onChange={e => setUid(e.target.value)} placeholder="e.g. 5qohuvNg3l3c7wuzI1dc" />
        <button className="btn" onClick={embed} disabled={status === "loading"}>
          {status === "loading" ? "Embedding…" : "Generate Embedding"}
        </button>
        <div className="flex items-center gap-2 mt-3">
          <div className={`status-dot ${status}`} />
          <span className="text-xs text-slate-400">
            {result && status === "ok" ? `Vector generated — ${result.embedding_length} dimensions` : status === "err" ? result?.detail : "Idle"}
          </span>
        </div>
      </div>
      {result && <div className={`json-box ${status === "err" ? "err" : ""}`}>{JSON.stringify(result, null, 2)}</div>}
    </div>
  );
}
