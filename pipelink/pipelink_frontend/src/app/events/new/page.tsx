"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

const INDUSTRIES = ["AI / Tech", "Fintech", "EdTech", "HealthTech", "F&B", "Climate Tech", "Agri-Tech", "Other"];

const DEFAULT_PARTICIPANT_EMAIL = `Hi {{name}},

We came across your profile and believe you'd be a great fit for {{event_title}}.

{{event_title}} is an upcoming event focused on {{event_description_short}}. We think your background aligns perfectly with what we're looking for.

We'd love to have you join us as a participant. Please register using the link below:
{{participant_form_url}}

Event Date: {{event_date}}

Looking forward to connecting with you!

Best regards,
{{host_name}}`;

const DEFAULT_INVESTOR_EMAIL = `Dear {{name}},

We are reaching out regarding an exciting sponsorship opportunity at {{event_title}}.

{{event_title}} is {{event_description_short}} — and we are actively seeking sponsors and strategic partners who align with our vision.

We believe your profile is an excellent match for this opportunity. Please register as a sponsor using the link below:
{{investor_form_url}}

Event Date: {{event_date}}

We look forward to connecting with you.

Best regards,
{{host_name}}`;

type Step = 1 | 2 | 3;

export default function CreateEventPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [savedEventId, setSavedEventId] = useState("");
  const [launchResult, setLaunchResult] = useState<any>(null);
  const [error, setError] = useState("");
  // Preset state
  const [presets, setPresets] = useState<any[]>([]);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [appliedPresetId, setAppliedPresetId] = useState("");
  const [isHost, setIsHost] = useState<boolean | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    industry: "",
    event_date: "",
    needed_participants: 50,
    participant_form_url: "",
    investor_form_url: "",
    participant_email_subject: "You're invited to {{event_title}}",
    participant_email_body: DEFAULT_PARTICIPANT_EMAIL,
    investor_email_subject: "Sponsorship Opportunity — {{event_title}}",
    investor_email_body: DEFAULT_INVESTOR_EMAIL,
  });

  useEffect(() => {
    const u = localStorage.getItem("pl_user");
    if (!u) { router.push("/login"); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
    // Check host status
    apiFetch("GET", `/user/${parsed.uid}/sponsor-status`).then(({ ok, data }) => {
      const host = ok ? data.is_host : false;
      setIsHost(host);
      if (host) {
        apiFetch("GET", `/user/${parsed.uid}/presets`).then(({ ok: ok2, data: d2 }) => {
          if (ok2 && d2.presets?.length > 0) {
            setPresets(d2.presets);
            const def = d2.presets.find((p: any) => p.is_default);
            if (def) applyPreset(def);
            else setShowPresetPicker(true);
          }
        });
      }
    });
  }, []);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  function applyPreset(p: any) {
    setForm(f => ({
      ...f,
      description: p.description ?? f.description,
      industry: p.industry ?? f.industry,
      needed_participants: p.needed_participants ?? f.needed_participants,
      participant_form_url: p.participant_form_url || f.participant_form_url,
      investor_form_url: p.investor_form_url || f.investor_form_url,
      participant_email_subject: p.participant_email_subject || f.participant_email_subject,
      participant_email_body: p.participant_email_body || f.participant_email_body,
      investor_email_subject: p.investor_email_subject || f.investor_email_subject,
      investor_email_body: p.investor_email_body || f.investor_email_body,
    }));
    setAppliedPresetId(p.preset_id);
    setShowPresetPicker(false);
    if (p.preset_id) apiFetch("POST", `/user/${p.host_uid}/presets/${p.preset_id}/use`);
  }

  async function doSavePreset() {
    if (!presetName.trim() || !user) return;
    setSavingPreset(true);
    const { ok, data } = await apiFetch("POST", `/user/${user.uid}/presets`, {
      name: presetName.trim(),
      ...form,
      needed_participants: Number(form.needed_participants),
    });
    if (ok) {
      setPresets(prev => [...prev, {
        preset_id: data.preset_id,
        host_uid: user.uid,
        name: presetName.trim(),
        description: form.description,
        industry: form.industry,
        needed_participants: Number(form.needed_participants),
      }]);
    }
    setSavingPreset(false);
    setShowSaveModal(false);
    setPresetName("");
  }

  async function savePreset() {
    if (!form.title || !form.description) { setError("Title and description are required."); return; }
    setLoading(true); setError("");
    const { ok, data } = await apiFetch("POST", "/event/create", {
      host_uid: user?.uid || "anonymous",
      ...form,
      needed_investors: 0,
      needed_participants: Number(form.needed_participants),
    });
    if (!ok) {
      const errMsg = Array.isArray(data.detail)
        ? data.detail.map((e: any) => e.msg).join(" | ")
        : (data.detail || "Failed to save event.");
      setError(errMsg); setLoading(false); return;
    }
    setSavedEventId(data.event_id);
    setLoading(false);
    setStep(3);
  }


  async function launch() {
    if (!savedEventId) return;
    setLaunching(true);
    const { ok, data } = await apiFetch("POST", `/event/${savedEventId}/launch`, {
      top_investors: 5,
      top_participants: Number(form.needed_participants) || 20,
    });
    setLaunching(false);
    if (ok) { setLaunchResult(data); setShowSaveModal(true); }
    else {
      const errMsg = Array.isArray(data.detail)
        ? data.detail.map((e: any) => e.msg).join(" | ")
        : (data.detail || "Launch failed.");
      setError(errMsg);
    }
  }

  const steps = [
    { n: 1, label: "Event Details" },
    { n: 2, label: "Forms & Emails" },
    { n: 3, label: "Launch" },
  ];

  if (!user || isHost === null) return (
    <div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  if (!isHost) return (
    <div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "rgba(124,58,237,0.1)", filter: "blur(100px)", pointerEvents: "none" }} />
      <div className="animate-fadein" style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.5rem" }}>Host an Event</h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "2rem", lineHeight: 1.6 }}>
          Posting events on PipeLink requires a <strong style={{ color: "#c4b5fd" }}>Host account</strong>.
          Unlock AI-powered attendee matching, sponsor badge management, and more.
        </p>

        <div style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
          <div style={{ fontSize: "0.75rem", color: "#7c3aed", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Host Tier — Free during beta</div>
          {[
            "Post unlimited events",
            "AI-powered attendee matching",
            "Sponsor badge assignment",
            "Event preset templates",
            "Registration management dashboard",
          ].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <span style={{ color: "#34d399", fontSize: "0.9rem" }}>✓</span>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{f}</span>
            </div>
          ))}
        </div>

        <button
          disabled={upgrading}
          onClick={async () => {
            setUpgrading(true);
            const { ok } = await apiFetch("POST", `/user/${user.uid}/upgrade`, {});
            if (ok) {
              const stored = localStorage.getItem("pl_user");
              if (stored) {
                const u = JSON.parse(stored);
                u.is_host = true;
                localStorage.setItem("pl_user", JSON.stringify(u));
              }
              setIsHost(true);
            }
            setUpgrading(false);
          }}
          style={{
            width: "100%", padding: "0.9rem", borderRadius: "12px",
            background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none",
            color: "#fff", fontSize: "1rem", fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", boxShadow: "0 0 40px rgba(124,58,237,0.3)",
            transition: "opacity 0.2s", opacity: upgrading ? 0.7 : 1,
          }}
        >
          {upgrading ? "Activating…" : "Activate Host Account — Free →"}
        </button>

        <Link href="/feed" style={{ display: "block", marginTop: "1rem", fontSize: "0.82rem", color: "#475569" }}>
          ← Back to Feed
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#060614" }}>
      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50, background: "rgba(6,6,20,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 2rem", height: "64px",
        display: "flex", alignItems: "center", gap: "1rem",
      }}>
        <Link href="/feed" style={{ color: "#64748b", fontSize: "0.875rem" }}>← Back to Feed</Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <img src="/logo.png" alt="PipeLink" style={{ width: "32px", height: "32px", borderRadius: "9px", objectFit: "cover" }} />
          <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#f1f5f9" }}>PipeLink</span>
        </div>
      </nav>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2.5rem 2rem 5rem" }}>
        <div className="animate-fadein">
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.4rem" }}>Post an Event</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "2rem" }}>
            Set up your event preset — AI will find and invite the most compatible people.
          </p>

          {/* Step indicators */}
          <div style={{ display: "flex", gap: "0", marginBottom: "2.5rem", position: "relative" }}>
            {steps.map(({ n, label }, i) => (
              <div key={n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {i < steps.length - 1 && (
                  <div style={{ position: "absolute", top: "14px", left: "50%", right: "-50%", height: "2px", background: step > n ? "linear-gradient(90deg,#7c3aed,#7c3aed)" : "rgba(255,255,255,0.08)", zIndex: 0 }} />
                )}
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700, zIndex: 1, position: "relative",
                  background: step >= n ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "rgba(255,255,255,0.08)",
                  color: step >= n ? "#fff" : "#475569", border: "2px solid",
                  borderColor: step >= n ? "#7c3aed" : "rgba(255,255,255,0.1)",
                }}>{step > n ? "✓" : n}</div>
                <span style={{ fontSize: "0.7rem", color: step >= n ? "#c4b5fd" : "#475569", marginTop: "0.4rem", textAlign: "center" }}>{label}</span>
              </div>
            ))}
          </div>
          {/* ── PRESET PICKER ────────────────────────────── */}
          {showPresetPicker && presets.length > 0 && (
            <div style={{ marginBottom: "2rem", padding: "1.25rem", background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <p style={{ fontWeight: 700, color: "#c4b5fd", fontSize: "0.9rem", marginBottom: "0.2rem" }}>⚡ Use a saved preset?</p>
                  <p style={{ fontSize: "0.75rem", color: "#64748b" }}>Auto-fill your forms and email templates from a previous setup</p>
                </div>
                <button onClick={() => setShowPresetPicker(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "0.6rem" }}>
                {presets.map(p => (
                  <button key={p.preset_id} onClick={() => applyPreset(p)} style={{
                    padding: "0.85rem", borderRadius: "10px", textAlign: "left",
                    background: appliedPresetId === p.preset_id ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${appliedPresetId === p.preset_id ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  }}>
                    <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "0.82rem", marginBottom: "0.25rem" }}>{p.name}</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>{p.industry || "No industry"}</div>
                    <div style={{ fontSize: "0.65rem", color: "#475569", marginTop: "0.2rem" }}>Used {p.use_count || 0}×</div>
                    {p.is_default && <div style={{ fontSize: "0.6rem", color: "#7c3aed", marginTop: "0.2rem", fontWeight: 700 }}>★ Default</div>}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                {appliedPresetId && <span style={{ fontSize: "0.75rem", color: "#34d399" }}>✓ Preset applied — form auto-filled below</span>}
                <button onClick={() => { setShowPresetPicker(false); setAppliedPresetId(""); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#64748b", fontSize: "0.75rem", cursor: "pointer" }}>Start fresh instead</button>
              </div>
            </div>
          )}
          {!showPresetPicker && presets.length > 0 && !appliedPresetId && (
            <button onClick={() => setShowPresetPicker(true)} style={{
              width: "100%", marginBottom: "1.25rem", padding: "0.7rem",
              background: "rgba(124,58,237,0.06)", border: "1px dashed rgba(124,58,237,0.3)",
              borderRadius: "10px", color: "#7c3aed", fontSize: "0.8rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>⚡ Use a saved preset ({presets.length} available)</button>
          )}
          {appliedPresetId && (
            <div style={{ marginBottom: "1rem", padding: "0.5rem 0.9rem", background: "rgba(124,58,237,0.08)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#c4b5fd" }}>⚡ Preset applied — <strong>{presets.find(p => p.preset_id === appliedPresetId)?.name}</strong></span>
              <button onClick={() => { setAppliedPresetId(""); setShowPresetPicker(true); }} style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.72rem", cursor: "pointer" }}>Change</button>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fadein">
              <Section title="📋 Event Details" subtitle="Tell us about your event">
                <div style={{ marginBottom: "1.25rem" }}>
                  <label className="field-label">Event Title *</label>
                  <input className="field-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. MyHack 2025 — AI for Good" />
                </div>
                <div style={{ marginBottom: "1.25rem" }}>
                  <label className="field-label">About this Event * <span style={{ color: "#475569" }}>(used by AI for matching)</span></label>
                  <textarea className="field-textarea" value={form.description} onChange={e => set("description", e.target.value)} rows={5}
                    placeholder="Describe your event — the theme, what attendees will experience, what kind of investors and participants you're looking for, and the expected impact." />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.25rem" }}>
                  <div>
                    <label className="field-label">Industry</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem" }}>
                      {INDUSTRIES.map(i => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => set("industry", form.industry === i ? "" : i)}
                          style={{
                            padding: "0.4rem 0.85rem",
                            borderRadius: "999px",
                            border: form.industry === i ? "1px solid rgba(124,58,237,0.7)" : "1px solid rgba(255,255,255,0.1)",
                            background: form.industry === i ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
                            color: form.industry === i ? "#c4b5fd" : "#64748b",
                            fontSize: "0.78rem",
                            fontWeight: form.industry === i ? 700 : 500,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { if (form.industry !== i) e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"; }}
                          onMouseLeave={e => { if (form.industry !== i) e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Event Date</label>
                    <input className="field-input" type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label className="field-label">Max Participants to invite</label>
                  <input className="field-input" type="number" value={form.needed_participants} onChange={e => set("needed_participants", e.target.value)} min="1" max="1000" />
                  <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.3rem" }}>AI will find and invite the most compatible people from the database</p>
                </div>

              </Section>

              {error && <ErrorBox msg={error} />}
              <button className="btn-primary" style={{ marginTop: "0.5rem" }} onClick={() => {
                if (!form.title || !form.description) { setError("Title and description are required."); return; }
                setError(""); setStep(2);
              }}>Continue to Forms & Emails →</button>
            </div>
          )}

          {/* ── STEP 2: FORMS & EMAILS ──────────────────────────────── */}
          {step === 2 && (
            <div className="animate-fadein">
              <Section title="🔗 Registration Forms" subtitle="Google Form links for each group">
                <div style={{ marginBottom: "1.25rem" }}>
                  <label className="field-label">Participant Registration Form (Google Form URL)</label>
                  <input className="field-input" type="url" value={form.participant_form_url}
                    onChange={e => set("participant_form_url", e.target.value)}
                    placeholder="https://forms.gle/your-participant-form" />
                  <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.3rem" }}>Participants click this to register for the event</p>
                </div>
                <div>
                  <label className="field-label" style={{ color: "#fbbf24" }}>★ Sponsor Registration Form (Google Form URL)</label>
                  <input className="field-input" type="url" value={form.investor_form_url}
                    onChange={e => set("investor_form_url", e.target.value)}
                    placeholder="https://forms.gle/your-sponsor-form" />
                  <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.3rem" }}>Sponsors fill this form — you can then assign their Sponsor badge from the Manage page</p>
                </div>
              </Section>

              <Section title="✉️ Outreach Email — Participants" subtitle="Customize the email sent to matched participants">
                <div style={{ marginBottom: "1.25rem" }}>
                  <label className="field-label">Email Subject</label>
                  <input className="field-input" value={form.participant_email_subject}
                    onChange={e => set("participant_email_subject", e.target.value)} />
                </div>
                <label className="field-label">Email Body</label>
                <textarea className="field-textarea" rows={10} value={form.participant_email_body}
                  onChange={e => set("participant_email_body", e.target.value)} />
                <VariableHint />
              </Section>

              <Section title="✉️ Outreach Email — Investors / Companies" subtitle="Customize the email sent to matched investors">
                <div style={{ marginBottom: "1.25rem" }}>
                  <label className="field-label">Email Subject</label>
                  <input className="field-input" value={form.investor_email_subject}
                    onChange={e => set("investor_email_subject", e.target.value)} />
                </div>
                <label className="field-label">Email Body</label>
                <textarea className="field-textarea" rows={10} value={form.investor_email_body}
                  onChange={e => set("investor_email_body", e.target.value)} />
                <VariableHint />
              </Section>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={savePreset} disabled={loading}>
                  {loading ? <><div className="spinner" /> Saving preset…</> : "Save Preset & Continue →"}
                </button>
              </div>
              {error && <ErrorBox msg={error} />}
            </div>
          )}

          {/* ── SAVE AS PRESET MODAL ─────────────────── */}
          {showSaveModal && launchResult && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: "#0f0f23", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "18px", padding: "2rem", width: "min(400px,90vw)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
                <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.4rem" }}>💾 Save as a Preset?</p>
                <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1.25rem" }}>Save your form links and email templates so you can reuse them next time in one click.</p>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Preset Name *</label>
                <input
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  placeholder="e.g. MyHack Standard Setup"
                  style={{ width: "100%", padding: "0.65rem 0.9rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9", fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "1rem" }}
                />
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button onClick={() => setShowSaveModal(false)} style={{ flex: 1, padding: "0.65rem", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>No thanks</button>
                  <button onClick={doSavePreset} disabled={!presetName.trim() || savingPreset} style={{ flex: 1, padding: "0.65rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {savingPreset ? "Saving…" : "Save Preset"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="animate-fadein">
              <Section title="🚀 Launch Event" subtitle="AI will now find the best-matched attendees from the database">
                <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "10px", padding: "1rem", marginBottom: "1.5rem" }}>
                  <p style={{ fontSize: "0.8rem", color: "#a78bfa", fontWeight: 600, marginBottom: "0.5rem" }}>✓ Preset saved — Event ID</p>
                  <code style={{ fontSize: "0.75rem", color: "#c4b5fd", wordBreak: "break-all" }}>{savedEventId}</code>
                </div>

                <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
                  When you click <strong style={{ color: "#f1f5f9" }}>Find Matches</strong>, our AI will:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
                  {[
                    ["🔍", "Embed your event description using Gemini AI"],
                    ["🧠", "Compare it against every user's profile in the database"],
                    ["📊", `Rank and select top ${form.needed_investors} investors + ${form.needed_participants} participants by compatibility`],
                    ["💾", "Save the outreach plan with personalized emails as a preset"],
                  ].map(([icon, text]) => (
                    <div key={String(text)} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1rem" }}>{icon}</span>
                      <span style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>

                {!launchResult ? (
                  <button className="btn-primary" onClick={launch} disabled={launching}>
                    {launching ? <><div className="spinner" /> Finding matches…</> : "Find Matches & Launch →"}
                  </button>
                ) : (
                  <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "1.25rem" }}>
                    <p style={{ color: "#34d399", fontWeight: 700, fontSize: "1rem", marginBottom: "1rem" }}>🎉 Event Launched!</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                      <StatBox val={launchResult.investors_invited} label="Investors" color="#38bdf8" />
                      <StatBox val={launchResult.participants_invited} label="Participants" color="#34d399" />
                      <StatBox val={launchResult.total_invited} label="Total Invited" color="#a78bfa" />
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1rem" }}>
                      All matched users have been saved with their personalized email content. You can view the full invite list below.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <Link href="/feed" style={{ flex: 1, textAlign: "center", padding: "0.65rem", background: "rgba(255,255,255,0.06)", borderRadius: "8px", color: "#94a3b8", fontSize: "0.875rem" }}>
                        Back to Feed
                      </Link>
                      <Link href={`/events/invites?event_id=${savedEventId}`} style={{ flex: 1, textAlign: "center", padding: "0.65rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", borderRadius: "8px", color: "#fff", fontSize: "0.875rem", fontWeight: 600 }}>
                        View Invite List →
                      </Link>
                    </div>
                  </div>
                )}
                {error && <ErrorBox msg={error} />}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helper sub-components ─────────────────────────────── */

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.2rem" }}>{title}</h2>
      <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "1.25rem" }}>{subtitle}</p>
      {children}
    </div>
  );
}

function VariableHint() {
  const vars = ["{{name}}", "{{event_title}}", "{{event_date}}", "{{participant_form_url}}", "{{investor_form_url}}", "{{host_name}}"];
  return (
    <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "rgba(124,58,237,0.06)", borderRadius: "8px" }}>
      <p style={{ fontSize: "0.7rem", color: "#7c3aed", fontWeight: 600, marginBottom: "0.4rem" }}>Available variables:</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
        {vars.map(v => <code key={v} style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", background: "rgba(124,58,237,0.15)", color: "#c4b5fd", borderRadius: "4px" }}>{v}</code>)}
      </div>
    </div>
  );
}

function StatBox({ val, label, color }: { val: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "0.75rem" }}>
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color }}>{val}</div>
      <div style={{ fontSize: "0.68rem", color: "#475569", marginTop: "0.2rem" }}>{label}</div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: any }) {
  const text = Array.isArray(msg)
    ? msg.map((e: any) => e.msg || JSON.stringify(e)).join(" | ")
    : String(msg || "");
  return (
    <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", fontSize: "0.825rem", color: "#f87171" }}>
      {text}
    </div>
  );
}
