"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { apiFetch } from "@/lib/api";

const INDUSTRY_COLORS: Record<string, string> = {
  "AI / Tech": "#7c3aed", "Fintech": "#0ea5e9", "EdTech": "#10b981",
  "HealthTech": "#f43f5e", "Climate Tech": "#22c55e", "Agri-Tech": "#84cc16",
  "F&B": "#f97316", "Startups & VC": "#a855f7", "default": "#64748b",
};

type EventSummary = {
  event_id: string; title: string; industry: string;
  event_date: string; is_active: boolean;
  participants: number; sponsors: number;
  form_submissions: number; total_attendees: number;
  needed_participants: number;
};

type JoinedEvent = {
  event_id: string; title: string; industry: string;
  event_date: string; role: string; joined_at: string;
  display_name?: string;
};

// Reusable hosted event card
function HostedCard({ ev }: { ev: EventSummary }) {
  const color = INDUSTRY_COLORS[ev.industry] || INDUSTRY_COLORS.default;
  const dateStr = ev.event_date
    ? new Date(ev.event_date).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
    : "TBA";
  const fillPct = ev.needed_participants
    ? Math.min(100, Math.round((ev.total_attendees / ev.needed_participants) * 100))
    : null;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${ev.is_active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`, borderRadius: "16px", padding: "1.5rem", position: "relative", overflow: "hidden", opacity: ev.is_active ? 1 : 0.7 }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: color, borderRadius: "16px 0 0 16px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start", paddingLeft: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "999px", background: `${color}25`, color }}>{ev.industry || "General"}</span>
            <span style={{ fontSize: "0.68rem", padding: "0.2rem 0.6rem", borderRadius: "6px", background: ev.is_active ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)", color: ev.is_active ? "#34d399" : "#64748b", fontWeight: 700 }}>
              {ev.is_active ? "🟢 Active" : "⏹ Ended"}
            </span>
          </div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.3rem", letterSpacing: "-0.02em" }}>{ev.title}</h3>
          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>📅 {dateStr}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
          <Link href={`/events/${ev.event_id}/manage`} style={{ padding: "0.45rem 0.85rem", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "8px", color: "#c4b5fd", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>
            📋 Manage
          </Link>
          <Link href={`/events/${ev.event_id}`} style={{ padding: "0.45rem 0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
            View
          </Link>
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingLeft: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#06b6d4" }}>{ev.participants}</div>
          <div style={{ fontSize: "0.62rem", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Participants</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f97316" }}>{ev.sponsors}</div>
          <div style={{ fontSize: "0.62rem", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Sponsors</div>
        </div>
        {ev.form_submissions > 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#10b981" }}>{ev.form_submissions}</div>
            <div style={{ fontSize: "0.62rem", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Form Synced</div>
          </div>
        )}
        {fillPct !== null && (
          <div style={{ flex: 1, minWidth: "120px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#64748b", marginBottom: "0.3rem" }}>
              <span>Capacity</span><span>{ev.total_attendees}/{ev.needed_participants} ({fillPct}%)</span>
            </div>
            <div style={{ height: "5px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${fillPct}%`, background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: "999px" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable joined event card
function JoinedCard({ ev }: { ev: JoinedEvent }) {
  const color = INDUSTRY_COLORS[ev.industry] || INDUSTRY_COLORS.default;
  const dateStr = ev.event_date
    ? new Date(ev.event_date).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
    : "TBA";
  const isPast = ev.event_date ? new Date(ev.event_date) < new Date() : false;
  const roleColor = ev.role === "sponsor" || ev.role === "investor" ? "#f97316" : "#7c3aed";
  const roleBg   = ev.role === "sponsor" || ev.role === "investor" ? "rgba(249,115,22,0.12)" : "rgba(124,58,237,0.12)";
  const roleIcon = ev.role === "sponsor" || ev.role === "investor" ? "💼" : "👤";

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.25rem 1.5rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "center", opacity: isPast ? 0.7 : 1 }}>
      <div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap" }}>
          {ev.industry && <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.18rem 0.5rem", borderRadius: "999px", background: `${color}22`, color }}>{ev.industry}</span>}
          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.18rem 0.55rem", borderRadius: "6px", background: roleBg, color: roleColor, textTransform: "capitalize" }}>
            {roleIcon} {ev.role}
          </span>
          <span style={{ fontSize: "0.65rem", padding: "0.18rem 0.5rem", borderRadius: "6px", background: isPast ? "rgba(100,116,139,0.12)" : "rgba(16,185,129,0.12)", color: isPast ? "#64748b" : "#34d399", fontWeight: 700 }}>
            {isPast ? "⏹ Past" : "🟢 Upcoming"}
          </span>
        </div>
        <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.2rem", letterSpacing: "-0.02em" }}>{ev.title}</h3>
        <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <span>📅 {dateStr}</span>
          {ev.display_name && <span>🏷️ Joined as {ev.display_name}</span>}
        </div>
      </div>
      <Link href={`/events/${ev.event_id}`} style={{ padding: "0.45rem 0.85rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
        View Event
      </Link>
    </div>
  );
}

export default function MyEventsPage() {
  const router = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [hosted, setHosted]       = useState<EventSummary[]>([]);
  const [joined, setJoined]       = useState<JoinedEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [hostFilter, setHostFilter] = useState<"all" | "active" | "past">("all");
  const [activeTab, setActiveTab] = useState<"hosting" | "joined">("hosting");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { router.push("/login"); return; }
      const stored = localStorage.getItem("pl_user");
      setUser(stored ? JSON.parse(stored) : { uid: fbUser.uid });

      const [hostRes, histRes] = await Promise.all([
        apiFetch("GET", `/user/${fbUser.uid}/events-summary`),
        apiFetch("GET", `/user/${fbUser.uid}/history`),
      ]);

      if (hostRes.ok) setHosted(hostRes.data.events || []);

      if (histRes.ok) {
        // Merge upcoming + past, exclude events the user hosts
        const hostIds = new Set((hostRes.ok ? hostRes.data.events || [] : []).map((e: any) => e.event_id));
        const normalize = (e: any) => ({
          event_id:   e.event_id,
          title:      e.event_title || e.title || "Untitled",
          industry:   e.event_industry || e.industry || "",
          event_date: e.event_date || "",
          role:       e.role || "participant",
          joined_at:  e.joined_at || "",
          display_name: e.display_name || "",
        });
        const all = [
          ...(histRes.data.upcoming || []).map(normalize),
          ...(histRes.data.past     || []).map(normalize),
        ].filter(e => !hostIds.has(e.event_id));
        setJoined(all);
      }

      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredHosted = hosted.filter(e =>
    hostFilter === "all" ? true : hostFilter === "active" ? e.is_active : !e.is_active
  );
  const activeCount = hosted.filter(e => e.is_active).length;
  const totalP = hosted.reduce((s, e) => s + e.participants, 0);
  const totalS = hosted.reduce((s, e) => s + e.sponsors, 0);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#060614", color: "#f1f5f9", fontFamily: "inherit" }}>
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "rgba(124,58,237,0.1)", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-20%", left: "-10%", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(6,182,212,0.07)", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(16px)", background: "rgba(6,6,20,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 2rem", height: "60px", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/feed" style={{ color: "#64748b", fontSize: "0.875rem" }}>← Feed</Link>
        <span style={{ color: "#1e293b" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f1f5f9" }}>My Events</span>
        <div style={{ flex: 1 }} />
        <Link href="/events/new" style={{ padding: "0.45rem 1rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
          + New Event
        </Link>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 2rem 4rem", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.3rem" }}>My Events</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Events you host and events you&apos;ve joined — all in one place.</p>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "0.85rem", marginBottom: "2rem" }}>
          {[
            { label: "Hosting",       value: hosted.length,  color: "#7c3aed", icon: "🎤" },
            { label: "Active Events", value: activeCount,    color: "#10b981", icon: "🟢" },
            { label: "Joined",        value: joined.length,  color: "#06b6d4", icon: "🎟️" },
            { label: "Participants",  value: totalP,         color: "#a78bfa", icon: "👤" },
            { label: "Sponsors",      value: totalS,         color: "#f97316", icon: "💼" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1rem" }}>
              <div style={{ fontSize: "1rem", marginBottom: "0.3rem" }}>{s.icon}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.62rem", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "0.25rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main tabs: Hosting / Joined */}
        <div style={{ display: "flex", gap: "0", marginBottom: "1.5rem", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
          {([["hosting", `🎤 Hosting (${hosted.length})`], ["joined", `🎟️ Joined (${joined.length})`]] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "7px", border: "none", background: activeTab === tab ? "rgba(124,58,237,0.25)" : "transparent", color: activeTab === tab ? "#c4b5fd" : "#64748b", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* HOSTING SECTION */}
        {activeTab === "hosting" && (
          <div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              {(["all", "active", "past"] as const).map(f => (
                <button key={f} onClick={() => setHostFilter(f)}
                  style={{ padding: "0.35rem 0.85rem", borderRadius: "7px", border: hostFilter === f ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.07)", background: hostFilter === f ? "rgba(124,58,237,0.12)" : "transparent", color: hostFilter === f ? "#c4b5fd" : "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: "0.78rem", textTransform: "capitalize" }}>
                  {f} ({f === "all" ? hosted.length : f === "active" ? activeCount : hosted.length - activeCount})
                </button>
              ))}
            </div>
            {filteredHosted.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3.5rem", color: "#475569" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
                <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>No {hostFilter !== "all" ? hostFilter : ""} hosted events</div>
                <Link href="/events/new" style={{ color: "#c4b5fd", fontSize: "0.875rem" }}>Create your first event →</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {filteredHosted.map(ev => <HostedCard key={ev.event_id} ev={ev} />)}
              </div>
            )}
          </div>
        )}

        {/* JOINED SECTION */}
        {activeTab === "joined" && (
          <div>
            {joined.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3.5rem", color: "#475569" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎟️</div>
                <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>You haven&apos;t joined any events yet</div>
                <Link href="/feed" style={{ color: "#c4b5fd", fontSize: "0.875rem" }}>Browse events in the feed →</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Upcoming */}
                {joined.filter(e => !e.event_date || new Date(e.event_date) >= new Date()).length > 0 && (
                  <>
                    <p style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>Upcoming</p>
                    {joined.filter(e => !e.event_date || new Date(e.event_date) >= new Date()).map(ev => (
                      <JoinedCard key={ev.event_id} ev={ev} />
                    ))}
                  </>
                )}
                {/* Past */}
                {joined.filter(e => e.event_date && new Date(e.event_date) < new Date()).length > 0 && (
                  <>
                    <p style={{ fontSize: "0.68rem", color: "#334155", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "1rem", marginBottom: "0.25rem" }}>Past</p>
                    {joined.filter(e => e.event_date && new Date(e.event_date) < new Date()).map(ev => (
                      <JoinedCard key={ev.event_id} ev={ev} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
