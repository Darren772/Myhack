"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

const INDUSTRY_COLORS: Record<string, string> = {
  "AI / Tech": "#7c3aed", "Fintech": "#0891b2", "EdTech": "#059669",
  "HealthTech": "#dc2626", "F&B": "#d97706", "Climate Tech": "#16a34a",
  "Agri-Tech": "#65a30d", default: "#6b7280",
};

function SponsorBadge({ small = false }: { small?: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.25rem",
      padding: small ? "0.15rem 0.5rem" : "0.25rem 0.65rem", borderRadius: "999px",
      background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(245,158,11,0.15))",
      border: "1px solid rgba(251,191,36,0.4)",
      color: "#fbbf24", fontSize: small ? "0.65rem" : "0.72rem", fontWeight: 700,
    }}>★ Sponsor</span>
  );
}

/* ── Join Modal ───────────────────────────────────────── */
function JoinModal({
  event,
  currentUid,
  onClose,
  onJoined,
}: {
  event: any;
  currentUid: string;
  onClose: () => void;
  onJoined: (eventId: string, role: "participant" | "sponsor") => void;
}) {
  const [loading, setLoading] = useState<"participant" | "sponsor" | null>(null);

  async function join(role: "participant" | "sponsor") {
    setLoading(role);
    await apiFetch("POST", `/event/${event.event_id}/join`, { uid: currentUid, role });
    setLoading(null);
    onJoined(event.event_id, role);
    const url = role === "sponsor"
      ? (event.investor_form_url || event.sponsor_form_url)
      : event.participant_form_url;
    if (url) window.open(url, "_blank");
    onClose();
  }

  const hasParticipant = !!event.participant_form_url;
  const hasSponsor = !!(event.investor_form_url || event.sponsor_form_url);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)", zIndex: 200,
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)", zIndex: 201,
        background: "#0f0f23", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "20px", padding: "2rem", width: "min(440px, 90vw)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>Join Event</p>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f1f5f9", lineHeight: 1.3 }}>{event.title}</h2>
        </div>

        <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
          How would you like to participate?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {hasParticipant && (
            <button onClick={() => join("participant")} disabled={loading !== null} style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "1rem 1.25rem", borderRadius: "12px",
              background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)",
              cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              transition: "all 0.2s", width: "100%",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(124,58,237,0.08)")}
            >
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>👥</div>
              <div>
                <div style={{ fontWeight: 700, color: "#c4b5fd", fontSize: "0.9rem" }}>
                  {loading === "participant" ? "Registering…" : "Join as Participant"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>
                  Attend the event · opens registration form
                </div>
              </div>
            </button>
          )}

          {hasSponsor && (
            <button onClick={() => join("sponsor")} disabled={loading !== null} style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "1rem 1.25rem", borderRadius: "12px",
              background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)",
              cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              transition: "all 0.2s", width: "100%",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(251,191,36,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(251,191,36,0.06)")}
            >
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(251,191,36,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>★</div>
              <div>
                <div style={{ fontWeight: 700, color: "#fbbf24", fontSize: "0.9rem" }}>
                  {loading === "sponsor" ? "Registering…" : "Become a Sponsor"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>
                  Support the event · host will review & assign badge
                </div>
              </div>
            </button>
          )}
        </div>

        <button onClick={onClose} style={{
          marginTop: "1.25rem", width: "100%", padding: "0.6rem",
          background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px", color: "#475569", fontSize: "0.8rem",
          cursor: "pointer", fontFamily: "inherit",
        }}>Cancel</button>
      </div>
    </>
  );
}

/* ── Event Card ───────────────────────────────────────── */
function EventCard({
  event, currentUid, joinedEventIds, joinCounts, onJoinClick,
}: {
  event: any; currentUid: string;
  joinedEventIds: Set<string>; joinCounts: Record<string, number>;
  onJoinClick: (event: any) => void;
}) {
  const color = INDUSTRY_COLORS[event.industry] || INDUSTRY_COLORS.default;
  const date = event.event_date
    ? new Date(event.event_date).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
    : "TBA";
  const isOwn = event.host_uid === currentUid;
  const alreadyJoined = joinedEventIds.has(event.event_id);
  const joinCount = joinCounts[event.event_id] || 0;
  const hasForm = event.participant_form_url || event.investor_form_url || event.sponsor_form_url;
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/events/${event.event_id}`)}
      style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px", padding: "1.5rem", transition: "border-color 0.2s, transform 0.2s",
        display: "flex", flexDirection: "column", cursor: "pointer",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.4)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.4rem" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.7rem", borderRadius: "999px", background: `${color}22`, color }}>
          {event.industry || "General"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isOwn && <span style={{ fontSize: "0.65rem", color: "#7c3aed", fontWeight: 600, background: "rgba(124,58,237,0.12)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>Your Event</span>}
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{date}</span>
        </div>
      </div>

      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.5rem", lineHeight: 1.3 }}>{event.title}</h3>
      <p style={{ fontSize: "0.825rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "1rem", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
        {event.description}
      </p>

      {joinCount > 0 && (
        <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: "0.75rem" }}>
          👥 {joinCount} {joinCount === 1 ? "person" : "people"} joined
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
        <div style={{ flex: 1 }}>
          {event.status === "launched"
            ? <span style={{ fontSize: "0.7rem", color: "#34d399", fontWeight: 600 }}>● Live</span>
            : <span style={{ fontSize: "0.7rem", color: "#64748b" }}>● Draft</span>}
        </div>

        {/* View details hint */}
        <span style={{ fontSize: "0.72rem", color: "#475569" }}>View details →</span>

        {isOwn ? (
          <Link href={`/events/${event.event_id}/manage`}
            onClick={e => e.stopPropagation()}
            style={{
              padding: "0.45rem 1rem", borderRadius: "8px",
              background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
              color: "#c4b5fd", fontSize: "0.78rem", fontWeight: 600,
            }}>Manage →</Link>
        ) : alreadyJoined ? (
          <span style={{ padding: "0.45rem 1rem", borderRadius: "8px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", fontSize: "0.78rem", fontWeight: 700 }}>✓ Joined</span>
        ) : hasForm ? (
          <button onClick={e => { e.stopPropagation(); onJoinClick(event); }} style={{
            padding: "0.45rem 1.1rem", borderRadius: "8px",
            background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(109,40,217,0.3))",
            border: "1px solid rgba(124,58,237,0.4)",
            color: "#c4b5fd", fontSize: "0.78rem", fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
          }}>Join →</button>
        ) : null}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────── */
export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(new Set());
  const [joinCounts, setJoinCounts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");
  const [joinModal, setJoinModal] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");

  const INDUSTRIES = ["AI / Tech","Fintech","EdTech","HealthTech","F&B","Climate Tech","Agri-Tech"];

  const filteredEvents = events.filter(ev => {
    const q = search.toLowerCase();
    const matchSearch = !q || ev.title?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q);
    const matchIndustry = !filterIndustry || ev.industry === filterIndustry;
    return matchSearch && matchIndustry;
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.push("/login"); return; }
      const stored = localStorage.getItem("pl_user");
      const u = stored ? JSON.parse(stored) : {
        uid: firebaseUser.uid, name: firebaseUser.displayName || "User",
        email: firebaseUser.email,
      };
      try {
        const { ok, data } = await apiFetch("GET", `/user/${firebaseUser.uid}/sponsor-status`);
        if (ok) u.is_sponsor = data.is_sponsor;
      } catch (_) {}
      setUser(u);
      loadAll(firebaseUser.uid);
    });
    return () => unsub();
  }, []);

  async function loadAll(uid: string) {
    setLoading(true);
    const [evRes, histRes, countRes] = await Promise.all([
      apiFetch("GET", "/events"),
      apiFetch("GET", `/user/${uid}/history`),
      apiFetch("GET", "/events/counts"),
    ]);
    if (evRes.ok) setEvents(evRes.data.events || []);
    if (histRes.ok) {
      const all = [...(histRes.data.upcoming || []), ...(histRes.data.past || [])];
      setJoinedEventIds(new Set(all.map((j: any) => j.event_id)));
    }
    if (countRes.ok) setJoinCounts(countRes.data.counts || {});
    setLoading(false);
  }

  function handleJoined(eventId: string, role: "participant" | "sponsor") {
    setJoinedEventIds(prev => new Set([...prev, eventId]));
    setJoinCounts(prev => ({ ...prev, [eventId]: (prev[eventId] || 0) + 1 }));
    const msg = role === "sponsor"
      ? "★ Sponsor form opened! The host will review and assign your badge."
      : "✓ Registered! Participant form opened in a new tab.";
    setToast(msg);
    setTimeout(() => setToast(""), 5000);
  }

  async function logout() {
    await signOut(auth);
    localStorage.removeItem("pl_user");
    router.push("/login");
  }

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  const initials = user.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div style={{ minHeight: "100vh", background: "#060614" }}>
      {/* Join Modal */}
      {joinModal && (
        <JoinModal
          event={joinModal}
          currentUid={user.uid}
          onClose={() => setJoinModal(null)}
          onJoined={handleJoined}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "80px", right: "2rem", zIndex: 150,
          background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)",
          borderRadius: "12px", padding: "0.75rem 1.25rem",
          color: "#34d399", fontWeight: 700, fontSize: "0.875rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)", backdropFilter: "blur(12px)",
          maxWidth: "340px", lineHeight: 1.4,
        }}>{toast}</div>
      )}

      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,6,20,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 2rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <img src="/logo.png" alt="PipeLink" style={{ width: "32px", height: "32px", borderRadius: "9px", objectFit: "cover" }} />
          <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#f1f5f9" }}>PipeLink</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/history" style={{ padding: "0.45rem 0.9rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>📋 History</Link>
          <Link href="/my-events" style={{ padding: "0.45rem 0.9rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>🗂 My Events</Link>
          <Link href="/presets" style={{ padding: "0.45rem 0.9rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>⚡ Presets</Link>
          <Link href="/events/new" style={{ padding: "0.5rem 1.25rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600 }}>+ Post Event</Link>
          <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#fff" }}>{initials}</div>
              {user.is_sponsor && <div style={{ position: "absolute", bottom: "-2px", right: "-4px", background: "#fbbf24", borderRadius: "50%", width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", border: "2px solid #060614" }}>★</div>}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.82rem", color: "#f1f5f9", fontWeight: 600 }}>{user.name?.split(" ")[0]}</div>
              {user.is_sponsor && <SponsorBadge small />}
            </div>
            <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: "0.25rem" }}>Logout</span>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "3.5rem 2rem 2rem", background: "radial-gradient(ellipse at 50% 0%,rgba(124,58,237,0.12) 0%,transparent 65%)" }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em", marginBottom: "0.6rem" }}>
          Events happening now 👋
        </h1>
        <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "480px", margin: "0 auto" }}>
          Browse events, join as a participant, or become a sponsor to earn your badge.
        </p>
      </div>

      {/* Search + Filter */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem 1.25rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: "0.9rem", pointerEvents: "none" }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search events…"
              style={{ width: "100%", paddingLeft: "2.25rem", paddingRight: "0.85rem", paddingTop: "0.6rem", paddingBottom: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#f1f5f9", fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <button onClick={() => setFilterIndustry("")} style={{ padding: "0.45rem 0.85rem", borderRadius: "999px", border: `1px solid ${!filterIndustry ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`, background: !filterIndustry ? "rgba(124,58,237,0.2)" : "transparent", color: !filterIndustry ? "#c4b5fd" : "#64748b", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", fontWeight: !filterIndustry ? 700 : 400 }}>All</button>
            {INDUSTRIES.map(ind => (
              <button key={ind} onClick={() => setFilterIndustry(filterIndustry === ind ? "" : ind)} style={{ padding: "0.45rem 0.85rem", borderRadius: "999px", border: `1px solid ${filterIndustry === ind ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`, background: filterIndustry === ind ? "rgba(124,58,237,0.2)" : "transparent", color: filterIndustry === ind ? "#c4b5fd" : "#64748b", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", fontWeight: filterIndustry === ind ? 700 : 400 }}>{ind}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#475569" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            <p>Loading events…</p>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem", color: "#475569" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎪</div>
            <h3 style={{ color: "#94a3b8", marginBottom: "0.5rem" }}>No events yet</h3>
            <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}>Be the first to post one!</p>
            <Link href="/events/new" style={{ padding: "0.7rem 1.5rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: "10px", fontSize: "0.9rem", fontWeight: 600 }}>Post an Event</Link>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#475569" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
            <p style={{ color: "#94a3b8" }}>No events match your search.</p>
            <button onClick={() => { setSearch(""); setFilterIndustry(""); }} style={{ marginTop: "0.75rem", background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit" }}>Clear filters</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1.25rem" }}>
            {filteredEvents.map((ev, i) => (
              <EventCard
                key={ev.event_id || i}
                event={ev}
                currentUid={user.uid}
                joinedEventIds={joinedEventIds}
                joinCounts={joinCounts}
                onJoinClick={setJoinModal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
