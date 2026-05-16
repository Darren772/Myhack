"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { apiFetch } from "@/lib/api";

type Attendee = {
  name: string; role: string; source: string; uid?: string;
  email: string; linkedin: string; bio: string; skills: string[];
  form_data: Record<string, any> | null; joined_at: string;
};

export default function ManageEventPage() {
  const { event_id } = useParams<{ event_id: string }>();
  const router = useRouter();

  const [user, setUser]           = useState<any>(null);
  const [event, setEvent]         = useState<any>(null);
  const [participants, setParticipants] = useState<Attendee[]>([]);
  const [sponsors, setSponsors]   = useState<Attendee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [isActive, setIsActive]   = useState(true);
  const [tab, setTab]             = useState<"participants" | "sponsors">("participants");
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [toast, setToast]         = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const loadAttendees = useCallback(async (uid: string) => {
    setSyncing(true);
    const { ok, data } = await apiFetch("GET", `/event/${event_id}/attendees?uid=${uid}`);
    if (ok) {
      setParticipants(data.participants || []);
      setSponsors(data.sponsors || []);
      setIsActive(data.is_active);
    }
    setSyncing(false);
  }, [event_id]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { router.push("/login"); return; }
      const stored = localStorage.getItem("pl_user");
      const u = stored ? JSON.parse(stored) : { uid: fbUser.uid };
      setUser(u);

      // Load event detail
      const { ok, data } = await apiFetch("GET", `/events`);
      if (ok) {
        const found = data.events?.find((e: any) => e.event_id === event_id);
        if (!found || found.host_uid !== fbUser.uid) {
          router.push("/feed"); return;   // not host → redirect
        }
        setEvent(found);
      }
      await loadAttendees(fbUser.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [event_id, loadAttendees]);

  const filtered = (list: Attendee[]) =>
    search ? list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) ||
                               a.email.toLowerCase().includes(search.toLowerCase())) : list;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  const total = participants.length + sponsors.length;
  const list  = tab === "participants" ? filtered(participants) : filtered(sponsors);

  return (
    <div style={{ minHeight: "100vh", background: "#060614", color: "#f1f5f9", fontFamily: "inherit" }}>
      {/* Ambient */}
      <div style={{ position: "fixed", top: "-20%", left: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "rgba(124,58,237,0.1)", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: "#10b981", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "10px", fontWeight: 600, zIndex: 100 }}>{toast}</div>
      )}

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(16px)", background: "rgba(6,6,20,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 2rem", height: "60px", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/events/${event_id}`} style={{ color: "#64748b", fontSize: "0.875rem", whiteSpace: "nowrap" }}>← Event</Link>
        <span style={{ color: "#1e293b" }}>|</span>
        <span style={{ color: "#475569", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event?.title}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "0.68rem", padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(124,58,237,0.15)", color: "#c4b5fd", fontWeight: 700 }}>Host View</span>
      </nav>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), transparent)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "2rem 2rem 1.5rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.4rem" }}>Manage Event</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.25rem" }}>{event?.title}</p>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {[
              { label: "Total", value: total, color: "#7c3aed" },
              { label: "Participants", value: participants.length, color: "#10b981" },
              { label: "Sponsors", value: sponsors.length, color: "#06b6d4" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "0.75rem 1.25rem", minWidth: "100px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {!isActive && <span style={{ fontSize: "0.72rem", color: "#64748b", background: "rgba(100,116,139,0.1)", padding: "0.3rem 0.7rem", borderRadius: "6px" }}>Event ended — data locked</span>}
              {isActive && (
                <button onClick={() => { loadAttendees(user?.uid); showToast("Refreshed!"); }}
                  disabled={syncing}
                  style={{ padding: "0.5rem 1rem", background: syncing ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: syncing ? "#475569" : "#94a3b8", cursor: syncing ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {syncing ? "⟳ Syncing..." : "🔄 Refresh"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem 2rem 4rem", position: "relative", zIndex: 1 }}>
        {/* Tabs + Search */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
          {(["participants", "sponsors"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", border: tab === t ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.08)", background: tab === t ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)", color: tab === t ? "#c4b5fd" : "#64748b", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", textTransform: "capitalize" }}>
              {t} ({t === "participants" ? participants.length : sponsors.length})
            </button>
          ))}
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ marginLeft: "auto", padding: "0.5rem 1rem", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f1f5f9", fontFamily: "inherit", fontSize: "0.85rem", minWidth: "220px", outline: "none" }}
          />
        </div>

        {/* Attendee Cards */}
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#475569" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👥</div>
            <div>No {tab} yet{search ? " matching your search" : ""}.</div>
            {!search && isActive && <div style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: "#334155" }}>Click 🔄 Refresh after attendees submit the form.</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {list.map((a, i) => {
              const key = a.uid || a.email || String(i);
              const isOpen = expanded === key;
              return (
                <div key={key} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", transition: "border-color 0.2s" }}>
                  {/* Row header */}
                  <div onClick={() => setExpanded(isOpen ? null : key)}
                    style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    {/* Avatar */}
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `linear-gradient(135deg, ${tab === "participants" ? "#7c3aed,#06b6d4" : "#f97316,#f43f5e"})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", color: "#fff", flexShrink: 0 }}>
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f1f5f9" }}>{a.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.1rem" }}>
                        {a.email && <span>✉️ {a.email}</span>}
                        {a.linkedin && <span>🔗 LinkedIn</span>}
                        {a.source === "both" && <span style={{ color: "#10b981" }}>✓ Form synced</span>}
                        {a.source === "form" && <span style={{ color: "#06b6d4" }}>📋 Form only</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem", borderRadius: "999px", background: tab === "participants" ? "rgba(124,58,237,0.15)" : "rgba(6,182,212,0.15)", color: tab === "participants" ? "#c4b5fd" : "#67e8f9", fontWeight: 700 }}>
                        {a.role}
                      </span>
                      <span style={{ color: "#475569", fontSize: "0.8rem" }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <p style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>Contact</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {a.email ? (
                            <a href={`mailto:${a.email}`} style={{ fontSize: "0.85rem", color: "#c4b5fd" }}>✉️ {a.email}</a>
                          ) : <span style={{ fontSize: "0.82rem", color: "#334155" }}>No email</span>}
                          {a.linkedin ? (
                            <a href={a.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", color: "#67e8f9" }}>🔗 LinkedIn Profile</a>
                          ) : <span style={{ fontSize: "0.82rem", color: "#334155" }}>No LinkedIn</span>}
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>Profile</p>
                        {a.bio && <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "0.5rem" }}>{a.bio}</p>}
                        {a.skills && a.skills.length > 0 && (
                          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                            {a.skills.map((s: string) => (
                              <span key={s} style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem", borderRadius: "6px", background: "rgba(124,58,237,0.1)", color: "#c4b5fd" }}>{s}</span>
                            ))}
                          </div>
                        )}
                        {!a.bio && (!a.skills || a.skills.length === 0) && <span style={{ fontSize: "0.82rem", color: "#334155" }}>No profile data</span>}
                      </div>
                      {a.form_data && Object.keys(a.form_data).length > 0 && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <p style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>Form Submission Data</p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "0.5rem" }}>
                            {Object.entries(a.form_data).filter(([k]) => !["name","linkedin_url","bio","skills"].includes(k)).map(([k, v]) => (
                              <div key={k} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "0.5rem 0.75rem" }}>
                                <div style={{ fontSize: "0.65rem", color: "#475569", fontWeight: 600, marginBottom: "0.2rem", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</div>
                                <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{String(v) || "—"}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
