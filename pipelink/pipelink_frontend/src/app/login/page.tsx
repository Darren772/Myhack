"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.push("/feed");
    });
    return () => unsub();
  }, []);

  async function handleGoogleLogin() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // Try to load existing profile from Firestore
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/user/${fbUser.uid}/profile`);
      const data = await res.json();

      if (data.exists && data.profile) {
        // Returning user — restore profile from Firestore
        const profile = { ...data.profile, uid: fbUser.uid, photo: fbUser.photoURL };
        localStorage.setItem("pl_user", JSON.stringify(profile));
        localStorage.setItem(`pl_profile_done_${fbUser.uid}`, "1");
        router.push("/feed");
      } else {
        // New user — go to setup
        localStorage.setItem("pl_user", JSON.stringify({
          uid: fbUser.uid,
          name: fbUser.displayName || "User",
          email: fbUser.email,
          photo: fbUser.photoURL,
        }));
        router.push("/setup");
      }
    } catch (err: any) {
      console.error("Login error:", err.message);
      alert("Sign-in failed: " + err.message);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 60% 0%, rgba(124,58,237,0.15) 0%, transparent 60%), #060614",
      padding: "1.5rem",
    }}>
      <div style={{ position: "fixed", top: "-10%", right: "-5%", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(124,58,237,0.08)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-10%", left: "-5%", width: "350px", height: "350px", borderRadius: "50%", background: "rgba(6,182,212,0.07)", filter: "blur(80px)", pointerEvents: "none" }} />

      <div className="animate-fadein" style={{ width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <img src="/logo.png" alt="PipeLink" style={{ width: "60px", height: "60px", borderRadius: "18px", objectFit: "cover", marginBottom: "1rem", display: "block", margin: "0 auto 1rem" }} />
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em" }}>PipeLink</h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.4rem" }}>Connect. Invest. Build.</p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.4rem" }}>Welcome</h2>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
            Sign in to discover AI-matched events and connections built for you.
          </p>

          <button
            onClick={handleGoogleLogin}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
              padding: "0.85rem 1.5rem", background: "#fff", color: "#1a1a2e",
              border: "none", borderRadius: "10px", fontSize: "0.95rem", fontWeight: 600,
              cursor: "pointer", width: "100%", fontFamily: "inherit",
              transition: "box-shadow 0.2s, transform 0.1s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)"; }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#334155", marginTop: "1.25rem" }}>
            By signing in, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
