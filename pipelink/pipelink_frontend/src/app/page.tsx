"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

const FEATURES = [
  { icon: "🤖", title: "AI-Powered Matching", desc: "Our AI reads your LinkedIn profile and matches you with events and people that actually align with your goals." },
  { icon: "⚡", title: "Join in One Click", desc: "Browse events, pick your role — participant or sponsor — and register in seconds. No friction." },
  { icon: "★", title: "Sponsor Badges", desc: "Host events and assign Sponsor badges to standout registrants. Build real credibility on your profile." },
  { icon: "📋", title: "Event History", desc: "Every event you join is recorded. Build a track record that tells your story to future collaborators." },
];

const STEPS = [
  { n: "01", title: "Create your profile", desc: "Sign in with Google, add your LinkedIn, and let AI build your professional fingerprint." },
  { n: "02", title: "Discover events", desc: "Browse a live feed of tech, fintech, and startup events happening right now." },
  { n: "03", title: "Join or host", desc: "Join events for free, or upgrade to host — AI will match and invite the right people for you." },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const move = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 20;
      const y = (clientY / innerHeight - 0.5) * 20;
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#060614", color: "#f1f5f9", fontFamily: "inherit", overflowX: "hidden" }}>
      {/* Ambient blobs */}
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "rgba(124,58,237,0.12)", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-20%", left: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "rgba(6,182,212,0.08)", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(16px)", background: "rgba(6,6,20,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 2rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <img src="/logo.png" alt="PipeLink" style={{ width: "34px", height: "34px", borderRadius: "10px", objectFit: "cover" }} />
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#f1f5f9" }}>PipeLink</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/login" style={{ padding: "0.45rem 1rem", color: "#94a3b8", fontSize: "0.875rem", fontWeight: 500 }}>Log in</Link>
          <Link href="/login" style={{ padding: "0.5rem 1.25rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 700 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "6rem 2rem 5rem" }}>
        <div ref={heroRef} style={{ transition: "transform 0.1s ease-out", display: "inline-block", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 1rem", borderRadius: "999px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            AI-Powered Event Networking
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.04em", marginBottom: "1.5rem", maxWidth: "800px", margin: "0 auto 1.5rem" }}>
          Connect with the{" "}
          <span style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>right people</span>
          {" "}at the right events.
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#64748b", maxWidth: "520px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
          PipeLink uses AI to match founders, sponsors, and participants based on their LinkedIn profiles — so every connection actually matters.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 2rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: "12px", fontSize: "1rem", fontWeight: 700, boxShadow: "0 0 40px rgba(124,58,237,0.3)" }}>
            Get Started Free →
          </Link>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 2rem", background: "rgba(255,255,255,0.05)", color: "#94a3b8", borderRadius: "12px", fontSize: "1rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)" }}>
            Browse Events
          </Link>
        </div>
        {/* Floating stat pills */}
        <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", marginTop: "3rem", flexWrap: "wrap" }}>
          {[["AI Matching", "Gemini Powered"], ["Event History", "Auto-tracked"], ["Sponsor Badges", "Host Assigned"]].map(([a, b]) => (
            <div key={a} style={{ padding: "0.6rem 1.1rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f1f5f9" }}>{a}</span>
              <span style={{ fontSize: "0.65rem", color: "#475569" }}>{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: "1000px", margin: "0 auto", padding: "4rem 2rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, textAlign: "center", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>How it works</h2>
        <p style={{ textAlign: "center", color: "#64748b", marginBottom: "3rem", fontSize: "0.95rem" }}>Three steps to your next meaningful connection</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} style={{ padding: "1.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: "3.5rem", fontWeight: 900, color: "rgba(124,58,237,0.12)", position: "absolute", top: "-0.5rem", right: "1rem", lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.5rem" }}>{title}</div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: "1000px", margin: "0 auto", padding: "2rem 2rem 5rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, textAlign: "center", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>Everything in one place</h2>
        <p style={{ textAlign: "center", color: "#64748b", marginBottom: "3rem", fontSize: "0.95rem" }}>Built for the next generation of founders and organizers</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} style={{ padding: "1.5rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", transition: "border-color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
            >
              <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>{icon}</div>
              <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: "0.4rem", fontSize: "0.95rem" }}>{title}</div>
              <div style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "4rem 2rem 6rem" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", padding: "3rem 2rem", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "24px" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>Ready to get started?</h2>
          <p style={{ color: "#64748b", marginBottom: "2rem", fontSize: "0.95rem" }}>Join for free. No credit card required.</p>
          <Link href="/login" style={{ display: "inline-flex", padding: "0.9rem 2.5rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: "12px", fontSize: "1rem", fontWeight: 700, boxShadow: "0 0 40px rgba(124,58,237,0.3)" }}>
            Create your free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#475569" }}>PipeLink</span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#334155" }}>© 2025 PipeLink. All rights reserved.</span>
      </footer>
    </div>
  );
}
