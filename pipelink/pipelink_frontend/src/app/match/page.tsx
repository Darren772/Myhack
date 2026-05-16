"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function MatchPage() {
  const [query, setQuery] = useState("fintech founder with Python experience in Malaysia");
  const [results, setResults] = useState<any[]>([]);
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");
  const [msg, setMsg] = useState("");

  async function match() {
    setStatus("loading"); setMsg("Finding matches…"); setResults([]);
    const { ok, data } = await apiFetch("POST", "/match", { query });
    setStatus(ok ? "ok" : "err");
    setMsg(ok ? `Found ${data.results?.length} matches` : data.detail || "Error");
    if (ok) setResults(data.results || []);
  }

  const scoreColor = (s: number) => s >= 70 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Match Founders</h1>
      <p className="text-slate-400 text-sm mb-6"><span className="badge-post mr-2">POST</span>/match — Semantic compatibility search</p>
      <div className="card">
        <label>Search Query</label>
        <input className="input" value={query} onChange={e => setQuery(e.target.value)} />
        <button className="btn" onClick={match} disabled={status === "loading"}>
          {status === "loading" ? "Matching…" : "Find Matches"}
        </button>
        <div className="flex items-center gap-2 mt-3">
          <div className={`status-dot ${status}`} />
          <span className="text-xs text-slate-400">{msg || "Idle"}</span>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className="inv-card">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">{r.name}</span>
                  <span className="text-[10px] bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded-full">{r.engagement_count} events</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {r.skills?.slice(0, 4).map((s: string) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 bg-violet-900/30 text-violet-300 rounded">{s}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{r.explanation}</p>
              </div>
              <div className="ml-4 text-right">
                <div className={`text-2xl font-bold ${scoreColor(r.match_score)}`}>{r.match_score}%</div>
                <div className="text-[10px] text-slate-500">match</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
