"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

function BroadcastForm() {
  const params = useSearchParams();
  const [eventId, setEventId] = useState(params.get("event_id") || "");
  const [topInvestors, setTopInvestors] = useState(3);
  const [topParticipants, setTopParticipants] = useState(10);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");

  async function broadcast() {
    if (!eventId.trim()) return alert("Enter Event ID");
    setStatus("loading"); setResult(null);
    const { ok, data } = await apiFetch("POST", "/event/broadcast", {
      event_id: eventId, top_investors: topInvestors, top_participants: topParticipants
    });
    setStatus(ok ? "ok" : "err");
    setResult(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Broadcast Event</h1>
      <p className="text-slate-400 text-sm mb-6"><span className="badge-post mr-2">POST</span>/event/broadcast — AI-match and invite users</p>
      <div className="card">
        <label>Event ID</label>
        <input className="input" value={eventId} onChange={e => setEventId(e.target.value)} placeholder="Paste event_id from Create Event" />
        <div className="grid-2">
          <div><label>Max Investors</label><input className="input" type="number" value={topInvestors} onChange={e => setTopInvestors(Number(e.target.value))} /></div>
          <div><label>Max Participants</label><input className="input" type="number" value={topParticipants} onChange={e => setTopParticipants(Number(e.target.value))} /></div>
        </div>
        <p className="text-xs text-slate-500 mt-3">The AI will embed the event description and compare it against all user profiles. Top-matching investors and participants will receive invitations.</p>
        <button className="btn" onClick={broadcast} disabled={status === "loading"}>
          {status === "loading" ? "Broadcasting — please wait…" : "Broadcast Now"}
        </button>
        <div className="flex items-center gap-2 mt-3">
          <div className={`status-dot ${status}`} />
          <span className="text-xs text-slate-400">
            {status === "loading" ? "Embedding event and finding matches…" :
             status === "ok" ? `Done! ${result?.total_invited} users invited` :
             status === "err" ? (result?.detail || "Error") : "Idle"}
          </span>
        </div>
      </div>

      {result && status === "ok" && (
        <div className="card border-cyan-500/30">
          <h2 className="text-cyan-400 font-semibold mb-4">Broadcast Complete</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-[#0d0d20] rounded-xl p-4">
              <div className="text-3xl font-bold text-sky-400">{result.investors_invited}</div>
              <div className="text-xs text-slate-500 mt-1">Investors Invited</div>
            </div>
            <div className="bg-[#0d0d20] rounded-xl p-4">
              <div className="text-3xl font-bold text-emerald-400">{result.participants_invited}</div>
              <div className="text-xs text-slate-500 mt-1">Participants Invited</div>
            </div>
            <div className="bg-[#0d0d20] rounded-xl p-4">
              <div className="text-3xl font-bold text-violet-400">{result.total_invited}</div>
              <div className="text-xs text-slate-500 mt-1">Total Invites</div>
            </div>
          </div>
          <a href={`/events/invites?event_id=${eventId}`} className="btn-cyan mt-4 inline-block no-underline text-sm">
            View Invite List →
          </a>
        </div>
      )}
    </div>
  );
}

export default function BroadcastPage() {
  return <Suspense><BroadcastForm /></Suspense>;
}
