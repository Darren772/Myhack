"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function SetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [mode, setMode] = useState<"url"|"text">("url");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [done, setDone] = useState(false);

const INTEREST_OPTIONS = ["AI / Tech","Fintech","EdTech","HealthTech","Climate Tech","Agri-Tech","F&B","Startups & VC","Design","Marketing"];

  useEffect(() => {
    const u = localStorage.getItem("pl_user");
    if (!u) { router.push("/login"); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
    setName(parsed.name || "");
  }, []);

  async function parseLinkedIn() {
    if (!linkedin.trim()) return;
    setParsing(true); setError("");
    if (mode === "url") {
      if (!linkedin.includes("linkedin.com/in/")) {
        setError("Please use a LinkedIn profile URL: linkedin.com/in/your-name");
        setParsing(false); return;
      }
      const { ok, data } = await apiFetch("POST", "/parse-linkedin-url", { url: linkedin });
      setParsing(false);
      if (ok) { setParsed(data); if (data.note) setError(data.note); }
      else setError("Could not process URL. Try switching to manual text.");
    } else {
      const { ok, data } = await apiFetch("POST", "/parse-linkedin", { text: linkedin });
      setParsing(false);
      if (ok) setParsed(data);
      else setError("Could not parse. Please check your input.");
    }
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    const profile = {
      uid: user.uid, name, email: user.email, photo: user.photo,
      age: Number(age), is_sponsor: false, events_sponsored: 0,
      interests,
      ...(parsed || {}),
    };
    await apiFetch("POST", "/user/profile", profile);
    localStorage.setItem("pl_user", JSON.stringify(profile));
    localStorage.setItem(`pl_profile_done_${user.uid}`, "1");
    setSaving(false);
    setDone(true);
    setTimeout(() => router.push("/feed"), 2200);
  }

  if (done) return (
    <div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem" }}>
      <div className="animate-fadein">
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.5rem" }}>Welcome to PipeLink, {name.split(" ")[0]}!</h1>
        <p style={{ color: "#64748b" }}>Taking you to the feed…</p>
        <div className="spinner" style={{ margin: "1.5rem auto 0" }} />
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 40% 0%,rgba(124,58,237,0.12) 0%,transparent 55%), #060614",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
    }}>
      <div className="animate-fadein" style={{ width: "100%", maxWidth: "520px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", marginBottom: "0.75rem", fontSize: "20px" }}>⚡</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9" }}>Set up your profile</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>Step {step} of 3 — {step === 1 ? "Basic Info" : step === 2 ? "LinkedIn" : "Interests"}</p>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "2rem" }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: "4px", borderRadius: "2px", background: s <= step ? "linear-gradient(90deg,#7c3aed,#06b6d4)" : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
          ))}
        </div>

        <div className="glass-card" style={{ padding: "2rem" }}>
          {step === 1 && (
            <div className="animate-fadein">
              <div style={{ marginBottom: "1.25rem" }}>
                <label className="field-label">Full Name</label>
                <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Izzat Fauzi" />
              </div>
              <div style={{ marginBottom: "1.75rem" }}>
                <label className="field-label">Age</label>
                <input className="field-input" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 24" min="16" max="100" />
              </div>
              {error && <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</p>}
              <button className="btn-primary" onClick={() => {
                if (name && age) { setError(""); setStep(2); }
                else setError("Please fill in your name and age.");
              }}>Continue →</button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fadein">
              <h2 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: "0.5rem" }}>LinkedIn Profile</h2>
              <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                Let our AI extract your profile, or enter manually. This helps match you with relevant events.
              </p>

              {/* Mode toggle */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "4px" }}>
                {(["url", "text"] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(""); setParsed(null); setLinkedin(""); }} style={{
                    flex: 1, padding: "0.5rem", borderRadius: "8px", border: "none", cursor: "pointer",
                    background: mode === m ? "rgba(124,58,237,0.5)" : "transparent",
                    color: mode === m ? "#f1f5f9" : "#64748b", fontSize: "0.8rem", fontWeight: 600,
                    fontFamily: "inherit", transition: "all 0.2s",
                  }}>
                    {m === "url" ? "Link LinkedIn URL" : "Enter manually"}
                  </button>
                ))}
              </div>

              {mode === "url" ? (
                <>
                  <label className="field-label">LinkedIn Profile URL</label>
                  <input className="field-input" type="url" value={linkedin}
                    onChange={e => { setLinkedin(e.target.value); setError(""); setParsed(null); }}
                    placeholder="https://www.linkedin.com/in/your-name" />
                  <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.35rem" }}>e.g. https://www.linkedin.com/in/darren-melvern-17140738b</p>
                </>
              ) : (
                <>
                  <label className="field-label">Paste your LinkedIn profile text</label>
                  <textarea className="field-textarea" value={linkedin}
                    onChange={e => { setLinkedin(e.target.value); setError(""); setParsed(null); }}
                    placeholder={"Name: John Doe\nHeadline: CEO at StartupXYZ\nSkills: Python, React\nExperience: 3 years at Grab\nEducation: BSc CS, UTP 2022"}
                    rows={5} />
                </>
              )}

              {error && (
                <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "8px", fontSize: "0.8rem", color: "#fbbf24", lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              {!parsed && (
                <button className="btn-primary" style={{ marginTop: "1rem" }} onClick={parseLinkedIn} disabled={parsing || !linkedin.trim()}>
                  {parsing ? <><div className="spinner" /> Analysing…</> : "Analyse with AI →"}
                </button>
              )}

              {parsed && (
                <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "10px" }}>
                  <p style={{ color: "#34d399", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>Profile extracted — {parsed.name}</p>
                  {parsed.headline && <p style={{ color: "#94a3b8", fontSize: "0.78rem", marginBottom: "0.5rem" }}>{parsed.headline}</p>}
                  {parsed.skills?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {parsed.skills.map((s: string) => (
                        <span key={s} style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", background: "rgba(124,58,237,0.2)", color: "#c4b5fd", borderRadius: "999px" }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setParsed(null); setLinkedin(""); setError(""); }}
                    style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: "#64748b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    Try again
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(3)} style={{ flex: 1 }}>Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fadein">
              <h2 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: "0.4rem" }}>What are you into?</h2>
              <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1.25rem" }}>Pick your interests so we can surface the right events for you.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.5rem" }}>
                {INTEREST_OPTIONS.map(opt => {
                  const sel = interests.includes(opt);
                  return (
                    <button key={opt} onClick={() => setInterests(prev => sel ? prev.filter(i => i !== opt) : [...prev, opt])} style={{
                      padding: "0.5rem 1rem", borderRadius: "999px",
                      border: `1px solid ${sel ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`,
                      background: sel ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                      color: sel ? "#c4b5fd" : "#64748b", fontSize: "0.82rem", fontWeight: sel ? 700 : 400,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                    }}>{opt}</button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn-outline" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-primary" onClick={finish} disabled={saving} style={{ flex: 1 }}>
                  {saving ? <><div className="spinner" /> Saving…</> : "Complete Setup 🎉"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
