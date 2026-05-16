"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const INDUSTRY_COLORS: Record<string, string> = {
  "AI / Tech": "#7c3aed", "Fintech": "#0891b2", "EdTech": "#059669",
  "HealthTech": "#dc2626", "F&B": "#d97706", "Climate Tech": "#16a34a",
  "Agri-Tech": "#65a30d", default: "#6b7280",
};

type JoinRecord = {
  join_id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_industry: string;
  role: "participant" | "sponsor";
  joined_at: string;
  is_past: boolean;
};

function HistoryCard({ rec }: { rec: JoinRecord }) {
  const color = INDUSTRY_COLORS[rec.event_industry] || INDUSTRY_COLORS.default;
  const eventDate = rec.event_date
    ? new Date(rec.event_date).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })
    : "Date TBA";
  const joinedDate = new Date(rec.joined_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "1.25rem",
      padding: "1.1rem 1.25rem",
      background: rec.is_past ? "rgba(255,255,255,0.02)" : "rgba(124,58,237,0.04)",
      border: `1px solid ${rec.is_past ? "rgba(255,255,255,0.06)" : "rgba(124,58,237,0.2)"}`,
      borderRadius: "12px", transition: "border-color 0.2s",
    }}>
      {/* Status dot */}
      <div style={{
        width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
        background: rec.is_past ? "#475569" : "#34d399",
        boxShadow: rec.is_past ? "none" : "0 0 8px rgba(52,211,153,0.5)",
      }} />

      {/* Event info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
          <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "0.95rem" }}>{rec.event_title}</span>
          {rec.role === "sponsor" && (
            <span style={{ fontSize: "0.62rem", padding: "0.1rem 0.45rem", borderRadius: "999px", background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontWeight: 700 }}>★ Sponsor</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", padding: "0.1rem 0.5rem", borderRadius: "6px", background: `${color}22`, color, fontWeight: 600 }}>
            {rec.event_industry || "General"}
          </span>
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>📅 {eventDate}</span>
          <span style={{ fontSize: "0.72rem", color: "#475569" }}>Joined {joinedDate}</span>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem", flexShrink: 0 }}>
        <span style={{
          fontSize: "0.65rem", padding: "0.2rem 0.6rem", borderRadius: "999px", fontWeight: 700,
          background: rec.is_past ? "rgba(71,85,105,0.2)" : "rgba(52,211,153,0.1)",
          color: rec.is_past ? "#64748b" : "#34d399",
        }}>
          {rec.is_past ? "Past" : "Upcoming"}
        </span>
        <Link href={`/events/${rec.event_id}/manage`} style={{ fontSize: "0.7rem", color: "#7c3aed" }}>
          View →
        </Link>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [upcoming, setUpcoming] = useState<JoinRecord[]>([]);
  const [past, setPast] = useState<JoinRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.push("/login"); return; }
      const stored = localStorage.getItem("pl_user");
      setUser(stored ? JSON.parse(stored) : { uid: firebaseUser.uid, name: firebaseUser.displayName });
      loadHistory(firebaseUser.uid);
    });
    return () => unsub();
  }, []);

  async function loadHistory(uid: string) {
    setLoading(true);
    const { ok, data } = await apiFetch("GET", `/user/${uid}/history`);
    if (ok) {
      setUpcoming(data.upcoming || []);
      setPast(data.past || []);
    }
    setLoading(false);
  }

  const displayed = tab === "upcoming" ? upcoming : tab === "past" ? past : [...upcoming, ...past];

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#060614", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#060614" }}>
      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50, background: "rgba(6,6,20,0.85)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 2rem", height: "64px", display: "flex", alignItems: "center", gap: "1rem",
      }}>
        <Link href="/feed" style={{ color: "#64748b", fontSize: "0.875rem" }}>← Feed</Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <img src="/logo.png" alt="PipeLink" style={{ width: "32px", height: "32px", borderRadius: "9px", objectFit: "cover" }} />
          <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#f1f5f9" }}>PipeLink</span>
        </div>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 2rem 5rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your Activity</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "0.4rem" }}>Event History</h1>
          <p style={{ fontSize: "0.85rem", color: "#64748b" }}>All events you've joined on PipeLink.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "5rem", color: "#475569" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            <p>Loading your history…</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Total Joined", val: upcoming.length + past.length, color: "#c4b5fd" },
                { label: "Upcoming", val: upcoming.length, color: "#34d399" },
                { label: "Past Events", val: past.length, color: "#64748b" },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.2rem" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0", marginBottom: "1.25rem", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "4px" }}>
              {([
                ["upcoming", `🟢 Upcoming (${upcoming.length})`],
                ["past", `⚫ Past (${past.length})`],
                ["all", `All (${upcoming.length + past.length})`],
              ] as const).map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: "0.55rem", borderRadius: "7px", border: "none", cursor: "pointer",
                  background: tab === t ? "rgba(124,58,237,0.3)" : "transparent",
                  color: tab === t ? "#c4b5fd" : "#64748b",
                  fontSize: "0.8rem", fontWeight: 700, fontFamily: "inherit", transition: "all 0.2s",
                }}>{label}</button>
              ))}
            </div>

            {/* List */}
            {displayed.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#475569" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎪</div>
                <p style={{ color: "#94a3b8", marginBottom: "0.5rem" }}>No {tab === "all" ? "" : tab} events yet</p>
                <p style={{ fontSize: "0.8rem", marginBottom: "1.5rem" }}>
                  {tab !== "past" ? "Browse the feed and join events that interest you!" : "Events you've attended will appear here."}
                </p>
                <Link href="/feed" style={{
                  padding: "0.6rem 1.5rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                  color: "#fff", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 600,
                }}>Browse Events</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {displayed.map(rec => <HistoryCard key={rec.join_id} rec={rec} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
