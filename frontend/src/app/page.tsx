"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      position: "relative",
      zIndex: 1,
    }}>

      {/* Top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        borderBottom: "1px solid var(--border)",
        background: "rgba(8, 11, 15, 0.9)",
        backdropFilter: "blur(8px)",
        padding: "0.75rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 10,
      }}>
        <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: "0.85rem", letterSpacing: "0.1em" }}>
          ◈ CORESTACK
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
          AUTH FOUNDATION v1.0
        </span>
      </div>

      <div style={{ maxWidth: 680, width: "100%", textAlign: "center", animation: "fadeInUp 0.6s ease forwards" }}>

        {/* Badge */}
        <div style={{ marginBottom: "2rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            border: "1px solid var(--border-bright)",
            padding: "0.35rem 0.9rem",
            fontSize: "0.75rem",
            color: "var(--green)",
            letterSpacing: "0.12em",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--green)",
              animation: "pulse-dot 1.5s ease-in-out infinite",
              display: "inline-block",
            }} />
            SYSTEM ONLINE
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(3rem, 8vw, 5.5rem)",
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "0.05em",
          marginBottom: "1.5rem",
        }}>
          <span style={{ color: "var(--text-primary)" }}>CORE</span>
          <span style={{ color: "var(--green)", textShadow: "0 0 20px rgba(0,255,136,0.4)" }}>STACK</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "1rem",
          lineHeight: 1.7,
          marginBottom: "3rem",
          fontFamily: "var(--font-mono)",
        }}>
          Modular SaaS backend foundation with JWT refresh token rotation,<br />
          session management, family-based revocation and reuse attack detection.
        </p>

        {/* Features grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1px",
          background: "var(--border)",
          border: "1px solid var(--border)",
          marginBottom: "3rem",
          textAlign: "left",
        }}>
          {[
            { icon: "⟳", label: "Refresh Token Rotation", desc: "Auto-rotate on every use" },
            { icon: "⊘", label: "Reuse Attack Detection", desc: "Family-wide revocation" },
            { icon: "◈", label: "Session Tracking", desc: "DB-persisted sessions" },
            { icon: "▣", label: "Audit Logging", desc: "IP + User-Agent logs" },
          ].map((f) => (
            <div key={f.label} style={{
              background: "var(--bg-card)",
              padding: "1.25rem 1.5rem",
            }}>
              <div style={{ color: "var(--green)", fontSize: "1.1rem", marginBottom: "0.4rem" }}>
                {f.icon} <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)", letterSpacing: "0.05em" }}>{f.label}</span>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" style={{
            display: "inline-block",
            background: "var(--green)",
            color: "#080b0f",
            padding: "0.85rem 2rem",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.1em",
            textDecoration: "none",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 20px rgba(0,255,136,0.4)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
          >
            INIT_SESSION →
          </Link>
          <Link href="/login" style={{
            display: "inline-block",
            border: "1px solid var(--border-bright)",
            color: "var(--text-secondary)",
            padding: "0.85rem 2rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.85rem",
            letterSpacing: "0.1em",
            textDecoration: "none",
            transition: "all 0.2s",
          }}>
            LOGIN →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        borderTop: "1px solid var(--border)",
        padding: "0.6rem 2rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(8,11,15,0.9)",
        fontSize: "0.7rem", color: "var(--text-muted)",
      }}>
        <span>Node.js · TypeScript · Express · Prisma · PostgreSQL</span>
        <span>Emerson R. Candido</span>
      </div>

    </main>
  );
}
