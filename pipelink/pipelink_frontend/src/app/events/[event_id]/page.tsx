"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { apiFetch } from "@/lib/api";

const INDUSTRY_COLORS: Record<string, string> = {
  "AI / Tech": "#7c3aed", "Fintech": "#0ea5e9", "EdTech": "#10b981",
  "HealthTech": "#f43f5e", "Climate Tech": "#22c55e", "Agri-Tech": "#84cc16",
  "F&B": "#f97316", "Startups & VC": "#a855f7", "default": "#64748b",
};

export default function EventDetailPage() {
  const { event_id } = useParams<{ event_id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [joinCount, setJoinCount] = useState(0);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joiningRole, setJoiningRole] = useState<"participant" | "sponsor" | null>(null);
  const [toast, setToast] = useState("");
  const [toastColor, setToastColor] = useState("#10b981");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attendees, setAttendees] = useState<{ participants: any[]; sponsors: any[] } | null>(null);

  const showToast = (msg: string, color = "#10b981") => {
    setToast(msg);
    setToastColor(color);
    setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { router.push("/login"); return; }
      const stored = localStorage.getItem("pl_user");
      const u = stored ? JSON.parse(stored) : { uid: fbUser.uid };
      setUser(u);

      // Load event from list
      const { ok, data } = await apiFetch("GET", `/events`);
      if (ok) {
        const found = data.events?.find((e: any) => e.event_id === event_id);
        setEvent(found || null);
      }

      // Load join count + history
      const [countRes, histRes] = await Promise.all([
        apiFetch("GET", `/events/counts`),
        apiFetch("GET", `/user/${fbUser.uid}/history`),
      ]);
      if (countRes.ok) setJoinCount(countRes.data.counts?.[event_id] || 0);
      let joined = false;
      if (histRes.ok) {
        const all = [...(histRes.data.upcoming || []), ...(histRes.data.past || [])];
        joined = all.some((e: any) => e.event_id === event_id);
        setAlreadyJoined(joined);
      }
      // Load attendee names (for joined users — names only, no contact info)
      if (joined) {
        const attRes = await apiFetch("GET", `/event/${event_id}/attendees?uid=${fbUser.uid}`);
        if (attRes.ok) setAttendees({ participants: attRes.data.participants || [], sponsors: attRes.data.sponsors || [] });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [event_id]);

  async function handleJoin(role: "participant" | "sponsor") {
    if (!user || !event) return;
    setJoiningRole(role);
    const formUrl = role === "sponsor"
      ? (event.investor_form_url || event.sponsor_form_url)
      : event.participant_form_url;
    await apiFetch("POST", `/event/${event.event_id}/join`, { uid: user.uid, role });
    setAlreadyJoined(true);
    setJoinCount(c => c + 1);
    setShowJoinModal(false);
    setJoiningRole(null);
    showToast(`Joined as ${role}!`);
    if (formUrl) setTimeout(() => window.open(formUrl, "_blank"), 600);
  }

  async function handleDelete() {
    if (!user || !event) return;
    setDeleting(true);
    const { ok, data } = await apiFetch("DELETE", `/event/${event.event_id}?uid=${user.uid}`);
    if (ok) {
      showToast("Event deleted successfully");
      setTimeout(() => router.push("/feed"), 1500);
    } else {
      showToast(data?.detail || "Failed to delete event", "#ef4444");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  if (!event) return (
    <div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem" }}>
      <div>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
        <h2 style={{ color: "#f1f5f9", marginBottom: "0.5rem" }}>Event not found</h2>
        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>This event may have been removed.</p>
        <Link href="/feed" style={{ padding: "0.65rem 1.5rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: "10px", fontWeight: 600 }}>Back to Feed</Link>
      </div>
    </div>
  );

  const color = INDUSTRY_COLORS[event.industry] || INDUSTRY_COLORS.default;
  const date = event.event_date
    ? new Date(event.event_date).toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "TBA";
  const isOwn = event.host_uid === user?.uid;
  const isPast = event.event_date && new Date(event.event_date) < new Date();
  const hasParticipantForm = !!event.participant_form_url;
  const hasSponsorForm = !!(event.investor_form_url || event.sponsor_form_url);

  return (
    <div style={{ minHeight: "100vh", background: "#060614", color: "#f1f5f9", fontFamily: "inherit" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: `${color}18`, filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: toastColor, color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "10px", fontWeight: 600, zIndex: 100, fontSize: "0.9rem", boxShadow: `0 4px 20px ${toastColor}44` }}>
          {toast}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "20px", padding: "2rem", maxWidth: "400px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🗑️</div>
            <h2 style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: "0.5rem", color: "#f1f5f9" }}>Delete this event?</h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "0.5rem" }}>This will permanently delete</p>
            <p style={{ color: "#c4b5fd", fontWeight: 700, fontSize: "0.9rem", marginBottom: "1.5rem" }}>{event?.title}</p>
            <p style={{ color: "#475569", fontSize: "0.78rem", marginBottom: "1.75rem" }}>All join records and invitations will also be removed. This cannot be undone.</p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                style={{ flex: 1, padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#94a3b8", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: "0.75rem", background: deleting ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.85)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Role Modal */}
      {showJoinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="animate-fadein" style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "2rem", maxWidth: "420px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🎟️</div>
            <h2 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.4rem" }}>How do you want to join?</h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
              Choose your role at <strong style={{ color: "#c4b5fd" }}>{event.title}</strong>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: hasParticipantForm && hasSponsorForm ? "1fr 1fr" : "1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {hasParticipantForm && (
                <button onClick={() => handleJoin("participant")} disabled={!!joiningRole}
                  style={{ padding: "1.1rem", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: "12px", color: "#c4b5fd", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem", transition: "all 0.2s" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>👤</div>
                  Participant
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.25rem", fontWeight: 400 }}>Register for the event</div>
                </button>
              )}
              {hasSponsorForm && (
                <button onClick={() => handleJoin("sponsor")} disabled={!!joiningRole}
                  style={{ padding: "1.1rem", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: "12px", color: "#67e8f9", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem", transition: "all 0.2s" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>💼</div>
                  Sponsor
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.25rem", fontWeight: 400 }}>Support this event</div>
                </button>
              )}
            </div>
            <button onClick={() => setShowJoinModal(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(16px)", background: "rgba(6,6,20,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 2rem", height: "60px", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/feed" style={{ color: "#64748b", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>← Feed</Link>
        <span style={{ color: "#1e293b" }}>|</span>
        <span style={{ color: "#475569", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</span>
      </nav>

      {/* Hero Banner */}
      <div style={{ background: `linear-gradient(135deg, ${color}20, transparent)`, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "3rem 2rem 2rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px", background: `${color}25`, color }}>{event.industry || "General"}</span>
            {isOwn && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px", background: "rgba(124,58,237,0.15)", color: "#c4b5fd" }}>Your Event</span>}
            {isPast && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px", background: "rgba(100,116,139,0.15)", color: "#64748b" }}>Past Event</span>}
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.5rem)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: "1rem", maxWidth: "700px" }}>{event.title}</h1>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", color: "#64748b", fontSize: "0.85rem" }}>
            <span>📅 {date}</span>
            <span>👥 {joinCount} {joinCount === 1 ? "person" : "people"} joined</span>
            {event.needed_participants && <span>🎯 {event.needed_participants} spots</span>}
            {event.host_name && <span>🏢 {event.host_name}</span>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 2rem 4rem", display: "grid", gridTemplateColumns: "1fr 280px", gap: "2rem", alignItems: "start", position: "relative", zIndex: 1 }}>

        {/* Left — Description */}
        <div>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>About this event</p>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.75rem", marginBottom: "1.5rem" }}>
            <p style={{ color: "#cbd5e1", lineHeight: 1.85, fontSize: "0.95rem", whiteSpace: "pre-wrap", margin: 0 }}>{event.description}</p>
          </div>

          {/* Meta tags */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {event.industry && (
              <span style={{ padding: "0.4rem 1rem", borderRadius: "999px", background: `${color}20`, color, fontWeight: 700, fontSize: "0.8rem", border: `1px solid ${color}40` }}>{event.industry}</span>
            )}
            {hasParticipantForm && (
              <span style={{ padding: "0.4rem 0.9rem", borderRadius: "8px", background: "rgba(124,58,237,0.1)", color: "#c4b5fd", fontSize: "0.78rem", border: "1px solid rgba(124,58,237,0.2)" }}>👤 Participant registration open</span>
            )}
            {hasSponsorForm && (
              <span style={{ padding: "0.4rem 0.9rem", borderRadius: "8px", background: "rgba(6,182,212,0.1)", color: "#67e8f9", fontSize: "0.78rem", border: "1px solid rgba(6,182,212,0.2)" }}>💼 Sponsor slots available</span>
            )}
          </div>

          {/* Attendees section — visible to joined users */}
          {attendees && (
            <div style={{ marginTop: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                  Who&apos;s coming ({(attendees.participants.length + attendees.sponsors.length)})
                </p>
                {isOwn && (
                  <Link href={`/events/${event.event_id}/manage`} style={{ fontSize: "0.78rem", color: "#c4b5fd", fontWeight: 700 }}>
                    Manage Event →
                  </Link>
                )}
              </div>

              {attendees.participants.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600, marginBottom: "0.5rem" }}>Participants</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {attendees.participants.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.75rem", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: "999px" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "#fff" }}>
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#c4b5fd", fontWeight: 600 }}>{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {attendees.sponsors.length > 0 && (
                <div>
                  <p style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600, marginBottom: "0.5rem" }}>Sponsors</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {attendees.sponsors.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.75rem", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: "999px" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg,#06b6d4,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "#fff" }}>
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#67e8f9", fontWeight: 600 }}>{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isOwn && (
                <p style={{ fontSize: "0.72rem", color: "#334155", marginTop: "0.75rem" }}>Contact details are visible to the event host only.</p>
              )}
            </div>
          )}
        </div>

        {/* Right — Sticky Sidebar */}
        <div style={{ position: "sticky", top: "72px" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "1.5rem" }}>
            <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "#475569", marginBottom: "0.3rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#e2e8f0" }}>{date}</div>
            </div>
            <div style={{ marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "#475569", marginBottom: "0.3rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Attendees</div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#e2e8f0" }}>
                👥 {joinCount} joined{event.needed_participants ? ` / ${event.needed_participants} spots` : ""}
              </div>
            </div>

            {isOwn ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {/* Manage button — primary CTA for host */}
                <Link href={`/events/${event.event_id}/manage`}
                  style={{ display: "block", textAlign: "center", padding: "0.9rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", borderRadius: "10px", color: "#fff", fontWeight: 700, fontSize: "0.95rem", boxShadow: "0 0 30px rgba(124,58,237,0.25)" }}>
                  📋 Manage Attendees →
                </Link>
                <Link href="/events/new"
                  style={{ display: "block", textAlign: "center", padding: "0.75rem", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "10px", color: "#c4b5fd", fontWeight: 600, fontSize: "0.85rem" }}>
                  + Post another event
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ width: "100%", padding: "0.65rem", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", color: "#f87171", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: "0.82rem", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.13)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
                >
                  🗑️ Delete Event
                </button>
              </div>
            ) : !isPast && (hasParticipantForm || hasSponsorForm) ? (
              alreadyJoined ? (
                <div style={{ padding: "0.85rem", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px", textAlign: "center", color: "#34d399", fontWeight: 700 }}>
                  ✓ You&apos;ve joined!
                </div>
              ) : (
                <button onClick={() => setShowJoinModal(true)}
                  style={{ width: "100%", padding: "0.9rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", fontFamily: "inherit", boxShadow: "0 0 30px rgba(124,58,237,0.25)", transition: "opacity 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  Join This Event →
                </button>
              )
            ) : isPast ? (
              <div style={{ padding: "0.75rem", background: "rgba(100,116,139,0.08)", borderRadius: "10px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                This event has ended
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
