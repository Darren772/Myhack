"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Reg = {
  reg_id: string;
  name: string;
  email: string;
  linkedin_url?: string;
  form_type: "participant" | "sponsor";
  registered_at: string;
  sponsor_badge_assigned?: boolean;
};

function Avatar({ name }: { name: string }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.78rem", fontWeight: 700, color: "#fff",
    }}>{initials}</div>
  );
}

function InviteListContent() {
  const router = useRouter();
  const params = useSearchParams();
  const eventId = params.get("event_id") || "";

  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"all" | "participant" | "sponsor">("all");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("pl_user");
    if (!u) { router.push("/login"); return; }
    setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    if (user && eventId) fetchData();
  }, [user, eventId]);

  async function fetchData(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true);
    const [evRes, regRes] = await Promise.all([
      apiFetch("GET", "/events"),
      apiFetch("GET", `/event/${eventId}/registrations`),
    ]);
    if (evRes.ok) {
      const found = (evRes.data.events || []).find((e: any) => e.event_id === eventId);
      setEvent(found || null);
    }
    if (regRes.ok) setRegs(regRes.data.registrations || []);
    isRefresh ? setRefreshing(false) : setLoading(false);
  }

  async function assignBadge(reg: Reg) {
    if (!user) return;
    setAssigningId(reg.reg_id);
    const { ok, data } = await apiFetch("POST", `/event/${eventId}/assign-sponsor`, {
      host_uid: user.uid,
      reg_id: reg.reg_id,
      email: reg.email,
      name: reg.name,
    });
    setAssigningId(null);
    if (ok) {
      setToast(data.message || "Badge assigned!");
      setRegs(prev => prev.map(r => r.reg_id === reg.reg_id ? { ...r, sponsor_badge_assigned: true } : r));
      setTimeout(() => setToast(""), 4000);
    }
  }

  const filtered = tab === "all" ? regs : regs.filter(r => r.form_type === tab);
  const sponsorCount = regs.filter(r => r.form_type === "sponsor").length;
  const participantCount = regs.filter(r => r.form_type === "participant").length;
  const badgesAssigned = regs.filter(r => r.sponsor_badge_assigned).length;
  const isHost = event?.host_uid === user?.uid;

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#060614" }}>
      {toast && (
        <div style={{
          position: "fixed", top: "80px", right: "2rem", zIndex: 100,
          background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)",
          borderRadius: "12px", padding: "0.75rem 1.25rem",
          color: "#fbbf24", fontWeight: 700, fontSize: "0.875rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
        }}>★ {toast}</div>
      )}

      <nav style={{
        position: "sticky", top: 0, zIndex: 50, background: "rgba(6,6,20,0.85)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 2rem", height: "64px", display: "flex", alignItems: "center", gap: "1rem",
      }}>
        <Link href="/feed" style={{ color: "#64748b", fontSize: "0.875rem" }}>← Feed</Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#f1f5f9" }}>PipeLink</span>
        </div>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2.5rem 2rem 5rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "5rem", color: "#475569" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            <p>Loading registrations…</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Registration List</div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.4rem" }}>{event?.title || "Event"}</h1>
                <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Registrations sync automatically when people submit your Google Forms. Click Refresh to see the latest.
                </p>
              </div>
              <button onClick={() => fetchData(true)} disabled={refreshing} style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.6rem 1.25rem", borderRadius: "9px",
                background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
                color: "#c4b5fd", fontSize: "0.875rem", fontWeight: 700,
                cursor: refreshing ? "default" : "pointer", fontFamily: "inherit",
              }}>
                {refreshing ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Total Registered", val: regs.length, color: "#c4b5fd" },
                { label: "Participants", val: participantCount, color: "#38bdf8" },
                { label: "Sponsor Registrants", val: sponsorCount, color: "#fbbf24" },
                { label: "Badges Assigned", val: badgesAssigned, color: "#34d399" },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.2rem" }}>{label}</div>
                </div>
              ))}
            </div>

            {event && (event.participant_form_url || event.investor_form_url) && (
              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                {event.participant_form_url && (
                  <a href={event.participant_form_url} target="_blank" rel="noopener noreferrer" style={{ padding: "0.45rem 1rem", borderRadius: "8px", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", color: "#38bdf8", fontSize: "0.78rem", fontWeight: 600 }}>
                    ↗ Open Participant Form
                  </a>
                )}
                {event.investor_form_url && (
                  <a href={event.investor_form_url} target="_blank" rel="noopener noreferrer" style={{ padding: "0.45rem 1rem", borderRadius: "8px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24", fontSize: "0.78rem", fontWeight: 700 }}>
                    ↗ Open Sponsor Form
                  </a>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "0", marginBottom: "1.25rem", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "4px" }}>
              {([["all", `All (${regs.length})`], ["participant", `Participants (${participantCount})`], ["sponsor", `★ Sponsors (${sponsorCount})`]] as [string, string][]).map(([t, label]) => (
                <button key={t} onClick={() => setTab(t as any)} style={{
                  flex: 1, padding: "0.55rem", borderRadius: "7px", border: "none", cursor: "pointer",
                  background: tab === t ? (t === "sponsor" ? "rgba(251,191,36,0.2)" : "rgba(124,58,237,0.3)") : "transparent",
                  color: tab === t ? (t === "sponsor" ? "#fbbf24" : "#c4b5fd") : "#64748b",
                  fontSize: "0.8rem", fontWeight: 700, fontFamily: "inherit", transition: "all 0.2s",
                }}>{label}</button>
              ))}
            </div>

            {tab === "sponsor" && isHost && sponsorCount > 0 && (
              <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: "8px", fontSize: "0.8rem", color: "#a16207" }}>
                As the event host, click <strong style={{ color: "#fbbf24" }}>★ Assign Badge</strong> to grant the Sponsor badge to people who registered via the Sponsor Form.
              </div>
            )}

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#475569" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{tab === "sponsor" ? "★" : "👥"}</div>
                <p style={{ color: "#94a3b8", marginBottom: "0.5rem" }}>No {tab === "all" ? "" : tab} registrations yet</p>
                <p style={{ fontSize: "0.8rem" }}>Registrations appear here automatically when people fill in your Google Forms.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {filtered.map(reg => (
                  <div key={reg.reg_id} style={{
                    display: "flex", alignItems: "center", gap: "1rem", padding: "0.9rem 1.1rem",
                    borderRadius: "10px", background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${reg.sponsor_badge_assigned ? "rgba(251,191,36,0.3)" : reg.form_type === "sponsor" ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                    <Avatar name={reg.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.9rem" }}>{reg.name || "—"}</span>
                        <span style={{ fontSize: "0.62rem", padding: "0.1rem 0.45rem", borderRadius: "999px", fontWeight: 700, background: reg.form_type === "sponsor" ? "rgba(251,191,36,0.12)" : "rgba(56,189,248,0.1)", color: reg.form_type === "sponsor" ? "#fbbf24" : "#38bdf8" }}>
                          {reg.form_type === "sponsor" ? "★ Sponsor Form" : "Participant Form"}
                        </span>
                        {reg.sponsor_badge_assigned && <span style={{ fontSize: "0.62rem", padding: "0.1rem 0.45rem", borderRadius: "999px", background: "rgba(52,211,153,0.1)", color: "#34d399", fontWeight: 700 }}>✓ Badge Assigned</span>}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>{reg.email}</div>
                      {reg.linkedin_url && (
                        <a href={reg.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "#7c3aed", marginTop: "0.1rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {reg.linkedin_url}
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.65rem", color: "#475569" }}>
                        {new Date(reg.registered_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {reg.form_type === "sponsor" && isHost && !reg.sponsor_badge_assigned && (
                        <button onClick={() => assignBadge(reg)} disabled={assigningId === reg.reg_id} style={{
                          padding: "0.3rem 0.8rem", borderRadius: "7px",
                          border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.1)",
                          color: "#fbbf24", fontSize: "0.72rem", fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit",
                        }}>
                          {assigningId === reg.reg_id ? "Assigning…" : "★ Assign Badge"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function InviteListPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>}>
      <InviteListContent />
    </Suspense>
  );
}
