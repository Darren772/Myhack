"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ParsePage() {
  const [text, setText] = useState("Izzat Fauzi. Founder at HireAI, Kuala Lumpur. Former Software Engineer at Grab. Skills: Python, Next.js, Gemini API, Firebase. Education: BSc CS, UTP 2022.");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");
  const [msg, setMsg] = useState("");

  async function parse() {
    setStatus("loading"); setMsg("Parsing with Gemini AI…");
    const { ok, data } = await apiFetch("POST", "/parse-linkedin", { text });
    setStatus(ok ? "ok" : "err");
    setMsg(ok ? "Parsed successfully" : data.detail || "Error");
    setResult(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Parse LinkedIn</h1>
      <p className="text-slate-400 text-sm mb-6"><span className="badge-post mr-2">POST</span>/parse-linkedin — Extract structured profile data from raw text</p>
      <div className="card">
        <label>LinkedIn Profile Text</label>
        <textarea className="textarea" value={text} onChange={e => setText(e.target.value)} rows={5} />
        <button className="btn" onClick={parse} disabled={status === "loading"}>
          {status === "loading" ? "Parsing…" : "Parse Profile"}
        </button>
        <div className="flex items-center gap-2 mt-3">
          <div className={`status-dot ${status}`} />
          <span className="text-xs text-slate-400">{msg || "Idle"}</span>
        </div>
      </div>

      {result && status === "ok" && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">{result.name}</h2>
          <p className="text-sm text-slate-300 mb-4">{result.bio}</p>
          <div className="grid-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {result.skills?.map((s: string) => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-violet-900/40 text-violet-300 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Education</p>
              {result.education?.map((e: string) => <p key={e} className="text-xs text-slate-300">{e}</p>)}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Experience</p>
            {result.experience?.map((e: string) => (
              <p key={e} className="text-xs text-slate-300 border-l-2 border-violet-600 pl-3 mb-1">{e}</p>
            ))}
          </div>
        </div>
      )}

      {result && status === "err" && (
        <div className="json-box err">{JSON.stringify(result, null, 2)}</div>
      )}
    </div>
  );
}
