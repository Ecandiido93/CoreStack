"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success" | null; msg: string }>({ type: null, msg: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, msg: "" });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus({ type: "error", msg: data.message || data.error || "Falha na autenticação" }); return; }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      setStatus({ type: "success", msg: "AUTH OK — redirecionando..." });
      setTimeout(() => router.push("/dashboard"), 800);
    } catch {
      setStatus({ type: "error", msg: "ERR: Não foi possível conectar ao servidor" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", zIndex: 1 }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeInUp 0.4s ease forwards" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <Link href="/" style={{ color: "var(--text-muted)", fontSize: "0.75rem", textDecoration: "none", letterSpacing: "0.1em", display: "inline-block", marginBottom: "1.5rem" }}>
            ← CORESTACK
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ color: "var(--green)", fontSize: "1.2rem" }}>◈</span>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-primary)" }}>
              AUTH_LOGIN
            </h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", paddingLeft: "2rem" }}>
            $ Verificar credenciais e iniciar sessão
          </p>
        </div>

        {/* Form */}
        <div style={{ border: "1px solid var(--border)", background: "var(--bg-card)", padding: "2rem" }}>
          <div style={{ borderBottom: "1px solid var(--border)", marginBottom: "1.5rem", paddingBottom: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", display: "inline-block" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--yellow)", display: "inline-block" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", fontSize: "0.72rem", letterSpacing: "0.08em" }}>POST /auth/login</span>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.72rem", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>EMAIL_ADDRESS</label>
              <input type="email" placeholder="user@domain.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.72rem", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>PASSWORD_HASH</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {status.type && (
              <div style={{
                padding: "0.75rem 1rem",
                border: `1px solid ${status.type === "error" ? "var(--red)" : "var(--green)"}`,
                background: status.type === "error" ? "rgba(255,58,92,0.08)" : "rgba(0,255,136,0.08)",
                color: status.type === "error" ? "var(--red)" : "var(--green)",
                fontSize: "0.8rem",
              }}>
                {status.type === "error" ? "✗ " : "✓ "}{status.msg}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: "0.5rem",
              background: loading ? "transparent" : "var(--green)",
              color: loading ? "var(--green)" : "#080b0f",
              border: loading ? "1px solid var(--green)" : "none",
              padding: "0.85rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}>
              {loading ? "AUTHENTICATING..." : "AUTHENTICATE →"}
            </button>
          </form>
        </div>

        <p style={{ marginTop: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem" }}>
          Sem conta?{" "}
          <Link href="/register" style={{ color: "var(--green)", textDecoration: "none" }}>REGISTER_USER →</Link>
        </p>
      </div>
    </main>
  );
}
