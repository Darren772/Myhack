"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Preset = {
  preset_id: string; name: string; description: string; industry: string;
  needed_participants: number; participant_form_url: string;
  investor_form_url: string; participant_email_subject: string;
  participant_email_body: string; investor_email_subject: string;
  investor_email_body: string; use_count: number; is_default: boolean;
  created_at: string; last_used_at?: string;
};

const INDUSTRIES = ["AI / Tech","Fintech","EdTech","HealthTech","F&B","Climate Tech","Agri-Tech","Other"];

export default function PresetsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Preset | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("pl_user");
    if (!u) { router.push("/login"); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
    loadPresets(parsed.uid);
  }, []);

  async function loadPresets(uid: string) {
    setLoading(true);
    const { ok, data } = await apiFetch("GET", `/user/${uid}/presets`);
    if (ok) setPresets(data.presets || []);
    setLoading(false);
  }

  async function saveEdit() {
    if (!editing || !user) return;
    setSaving(true);
    await apiFetch("PUT", `/user/${user.uid}/presets/${editing.preset_id}`, editing);
    setSaving(false);
    setPresets(prev => prev.map(p => p.preset_id === editing.preset_id ? editing : p));
    setEditing(null);
    showToast("✓ Preset saved!");
  }

  async function setDefault(preset_id: string) {
    if (!user) return;
    await apiFetch("PUT", `/user/${user.uid}/presets/${preset_id}`, { is_default: true });
    setPresets(prev => prev.map(p => ({ ...p, is_default: p.preset_id === preset_id })));
    showToast("★ Set as default preset");
  }

  async function deletePreset(preset_id: string) {
    if (!user) return;
    setDeleting(preset_id);
    await apiFetch("DELETE", `/user/${user.uid}/presets/${preset_id}`);
    setPresets(prev => prev.filter(p => p.preset_id !== preset_id));
    setDeleting(null);
    showToast("Preset deleted");
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const setField = (k: keyof Preset, v: any) => setEditing(e => e ? { ...e, [k]: v } : e);

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#060614" }}>
      {toast && (
        <div style={{ position: "fixed", top: "80px", right: "2rem", zIndex: 100, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "10px", padding: "0.7rem 1.1rem", color: "#34d399", fontWeight: 700, fontSize: "0.85rem", backdropFilter: "blur(12px)" }}>{toast}</div>
      )}

      {/* Edit Modal */}
      {editing && (
        <>
          <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 201, background: "#0f0f23", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", padding: "2rem", width: "min(560px,95vw)", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <h2 style={{ fontWeight: 800, color: "#f1f5f9", fontSize: "1.1rem", marginBottom: "1.5rem" }}>Edit Preset</h2>
            {[
              { label: "Preset Name *", key: "name", type: "text" },
              { label: "Event Description", key: "description", type: "text" },
              { label: "Participant Form URL", key: "participant_form_url", type: "url" },
              { label: "★ Sponsor Form URL", key: "investor_form_url", type: "url" },
              { label: "Participant Email Subject", key: "participant_email_subject", type: "text" },
              { label: "Sponsor Email Subject", key: "investor_email_subject", type: "text" },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>{label}</label>
                {key === "description" ? (
                  <textarea rows={3} value={(editing as any)[key] || ""} onChange={e => setField(key as keyof Preset, e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9", fontSize: "0.85rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                ) : (
                  <input type={type} value={(editing as any)[key] || ""} onChange={e => setField(key as keyof Preset, e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box" }} />
                )}
              </div>
            ))}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Industry</label>
              <select value={editing.industry} onChange={e => setField("industry", e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9", fontSize: "0.85rem", fontFamily: "inherit" }}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Max Participants</label>
              <input type="number" value={editing.needed_participants} onChange={e => setField("needed_participants", Number(e.target.value))}
                style={{ width: "100%", padding: "0.6rem 0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Participant Email Body</label>
              <textarea rows={5} value={editing.participant_email_body} onChange={e => setField("participant_email_body", e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9", fontSize: "0.8rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Sponsor Email Body</label>
              <textarea rows={5} value={editing.investor_email_body} onChange={e => setField("investor_email_body", e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9", fontSize: "0.8rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: "0.65rem", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ flex: 2, padding: "0.65rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,6,20,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 2rem", height: "64px", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/feed" style={{ color: "#64748b", fontSize: "0.875rem" }}>← Feed</Link>
        <div style={{ flex: 1 }} />
        <Link href="/events/new" style={{ padding: "0.45rem 1rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600 }}>+ New Event</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <img src="/logo.png" alt="PipeLink" style={{ width: "32px", height: "32px", borderRadius: "9px", objectFit: "cover" }} />
          <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#f1f5f9" }}>PipeLink</span>
        </div>
      </nav>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 2rem 5rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your Templates</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.4rem" }}>Event Presets</h1>
          <p style={{ fontSize: "0.85rem", color: "#64748b" }}>Reusable setups for your events — form links, email templates, and more. Apply in one click when creating a new event.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "5rem", color: "#475569" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
        ) : presets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem", color: "#475569" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚡</div>
            <h3 style={{ color: "#94a3b8", marginBottom: "0.5rem" }}>No presets yet</h3>
            <p style={{ fontSize: "0.85rem", marginBottom: "1.5rem" }}>Create your first event — after launching you'll be prompted to save it as a preset.</p>
            <Link href="/events/new" style={{ padding: "0.7rem 1.5rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: "10px", fontSize: "0.9rem", fontWeight: 600 }}>Create an Event</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {presets.map(p => (
              <div key={p.preset_id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${p.is_default ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: "14px", padding: "1.25rem 1.5rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                      <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "1rem" }}>{p.name}</span>
                      {p.is_default && <span style={{ fontSize: "0.62rem", padding: "0.15rem 0.45rem", borderRadius: "999px", background: "rgba(124,58,237,0.2)", color: "#a78bfa", fontWeight: 700 }}>★ Default</span>}
                    </div>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      {p.industry && <span style={{ fontSize: "0.72rem", color: "#7c3aed" }}>{p.industry}</span>}
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>👥 {p.needed_participants} participants</span>
                      <span style={{ fontSize: "0.72rem", color: "#475569" }}>Used {p.use_count || 0}×</span>
                      {p.last_used_at && <span style={{ fontSize: "0.72rem", color: "#475569" }}>Last used {new Date(p.last_used_at).toLocaleDateString()}</span>}
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      {p.participant_form_url && <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "5px", background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>✓ Participant Form</span>}
                      {p.investor_form_url && <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "5px", background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>✓ Sponsor Form</span>}
                      {p.participant_email_body && <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "5px", background: "rgba(52,211,153,0.08)", color: "#34d399" }}>✓ Email Templates</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
                    <button onClick={() => setEditing(p)} style={{ padding: "0.4rem 0.9rem", borderRadius: "7px", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#c4b5fd", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✏ Edit</button>
                    {!p.is_default && (
                      <button onClick={() => setDefault(p.preset_id)} style={{ padding: "0.4rem 0.9rem", borderRadius: "7px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit" }}>★ Set Default</button>
                    )}
                    <button onClick={() => deletePreset(p.preset_id)} disabled={deleting === p.preset_id} style={{ padding: "0.4rem 0.9rem", borderRadius: "7px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit" }}>
                      {deleting === p.preset_id ? "…" : "🗑 Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
