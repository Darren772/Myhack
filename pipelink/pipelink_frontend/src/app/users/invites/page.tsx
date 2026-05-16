"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function UserInvitesPage() {
  const [uid, setUid] = useState("");
  const [invites, setInvites] = useState<any[]>([]);
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");

  async function fetch_() {
    if (!uid.trim()) return alert("Enter UID");
    setStatus("loading");
    const { ok, data } = await apiFetch("GET", `/user/${uid}/invites`);
    setStatus(ok ? "ok" : "err");
    if (ok) setInvites(data.invitations || []);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">User Invites</h1>
      <p className="text-slate-400 text-sm mb-6"><span className="badge-get mr-2">GET</span>/user/&#123;uid&#125;/invites — Events this user was matched to</p>
      <div className="card">
        <label>User UID</label>
        <input className="input" value={uid} onChange={e => setUid(e.target.value)} placeholder="e.g. 5qohuvNg3l3c7wuzI1dc" />
        <button className="btn" onClick={fetch_} disabled={status === "loading"}>
          {status === "loading" ? "Fetching…" : "Fetch My Invites"}
        </button>
        <div className="flex items-center gap-2 mt-3">
          <div className={`status-dot ${status}`} />
          <span className="text-xs text-slate-400">{status === "ok" ? `${invites.length} invitations` : "Idle"}</span>
        </div>
      </div>

      {invites.length > 0 && (
        <div className="space-y-3">
          {invites.map((inv, i) => {
            const score = inv.compatibility_score;
            const color = score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
            return (
              <div key={i} className="inv-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-white">{inv.event_title || inv.event_id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${inv.role_matched === "investor" ? "bg-sky-900/40 text-sky-400" : "bg-emerald-900/40 text-emerald-400"}`}>
                      {inv.role_matched}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{inv.status} · {inv.created_at?.slice(0, 10)}</p>
                </div>
                <div className={`text-2xl font-bold ${color}`}>{score}%</div>
              </div>
            );
          })}
        </div>
      )}
      {status === "ok" && invites.length === 0 && (
        <p className="text-slate-500 text-sm mt-4">No invitations found for this user yet.</p>
      )}
    </div>
  );
}
