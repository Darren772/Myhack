"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { section: "System", items: [{ href: "/", label: "Dashboard" }] },
  {
    section: "Core AI", items: [
      { href: "/parse", label: "Parse LinkedIn" },
      { href: "/match", label: "Match Founders" },
      { href: "/embed", label: "Embed Profile" },
      { href: "/journey", label: "Journey Summary" },
    ]
  },
  {
    section: "Events", items: [
      { href: "/events/create", label: "Create Event" },
      { href: "/events/broadcast", label: "Broadcast Event" },
      { href: "/events/invites", label: "Event Invites" },
    ]
  },
  {
    section: "Users", items: [
      { href: "/users/invites", label: "User Invites" },
      { href: "/formsync", label: "Form Sync" },
    ]
  },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, bottom: 0, width: "240px",
      background: "#0d0d1f", borderRight: "1px solid #1e1e36",
      display: "flex", flexDirection: "column", overflowY: "auto", zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "1.5rem 1.25rem", borderBottom: "1px solid #1e1e36" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <img src="/logo.png" alt="PipeLink" style={{ width: "28px", height: "28px", borderRadius: "8px", objectFit: "cover" }} />
          <span style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.95rem" }}>PipeLink</span>
        </div>
        <p style={{ fontSize: "0.65rem", color: "#475569" }}>Event Intelligence Platform</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: "0.5rem" }}>
        {links.map(({ section, items }) => (
          <div key={section} style={{ marginBottom: "0.5rem" }}>
            <p style={{ padding: "0.5rem 1.25rem 0.25rem", fontSize: "0.6rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
              {section}
            </p>
            {items.map(({ href, label }) => {
              const active = path === href;
              return (
                <Link key={href} href={href} style={{
                  display: "block", padding: "0.5rem 1.25rem",
                  fontSize: "0.85rem", textDecoration: "none",
                  borderLeft: `3px solid ${active ? "#7c3aed" : "transparent"}`,
                  color: active ? "#f1f5f9" : "#94a3b8",
                  background: active ? "rgba(124,58,237,0.1)" : "transparent",
                  transition: "all 0.15s",
                }}>
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #1e1e36" }}>
        <p style={{ fontSize: "0.65rem", color: "#334155" }}>Backend: localhost:8000</p>
      </div>
    </aside>
  );
}
