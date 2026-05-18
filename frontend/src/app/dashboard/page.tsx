"use client";

import { useEffect, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL;
const TENANT = process.env.NEXT_PUBLIC_TENANT_ID || "default";

const headers = (token?: string) => ({
  "Content-Type": "application/json",
  "X-Tenant-ID": TENANT,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

type TokenStatus = "ACTIVE" | "USED" | "REVOKED" | "EXPIRED";

interface ActiveSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

interface RotationEvent {
  id: number;
  timestamp: string;
  accessTokenSnippet: string;
  familyId: string;
  status: "OK" | "REUSE_DETECTED" | "ERROR";
}

interface SessionInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  lastLoginAt: string | null;
  accessToken: string | null;
  accessExp: Date | null;
  refreshHash: string | null;
  refreshExp: Date | null;
  familyId: string | null;
  tokenStatus: TokenStatus;
}

function mask(token: string | null, start = 12, end = 6) {
  if (!token) return "N/A";
  return `${token.slice(0, start)}...${token.slice(-end)}`;
}

function timeLeft(exp: Date | null): string {
  if (!exp) return "—";
  const diff = exp.getTime() - Date.now();
  if (diff <= 0) return "EXPIRED";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (m > 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatusDot({ status }: { status: TokenStatus }) {
  const colors: Record<TokenStatus, string> = {
    ACTIVE: "var(--green)", USED: "var(--yellow)",
    REVOKED: "var(--red)", EXPIRED: "var(--text-muted)",
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem" }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", display: "inline-block",
        background: colors[status],
        boxShadow: status === "ACTIVE" ? `0 0 6px ${colors[status]}` : "none",
        animation: status === "ACTIVE" ? "pulse-dot 1.5s ease-in-out infinite" : "none",
      }} />
      <span style={{ color: colors[status] }}>{status}</span>
    </span>
  );
}

function Card({ title, icon, children, accent = "green" }: {
  title: string; icon: string; children: React.ReactNode; accent?: "green" | "cyan" | "orange" | "red";
}) {
  const c = { green: "var(--green)", cyan: "var(--cyan)", orange: "var(--orange)", red: "var(--red)" }[accent];
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${c}, transparent)`, opacity: 0.5 }} />
      <div style={{ borderBottom: "1px solid var(--border)", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{ color: c, fontSize: "0.9rem" }}>{icon}</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.08em", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{title}</span>
      </div>
      <div style={{ padding: "1.25rem" }}>{children}</div>
    </div>
  );
}

function DataRow({ label, value, mono = true, highlight = false }: {
  label: string; value: React.ReactNode; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", letterSpacing: "0.08em", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: mono ? "var(--font-mono)" : undefined, fontSize: "0.8rem", color: highlight ? "var(--green)" : "var(--text-primary)", textAlign: "right", marginLeft: "1rem", maxWidth: "60%", wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [rotations, setRotations] = useState<RotationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [timer, setTimer] = useState("");

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) { router.push("/login"); return; }
    try {
      const decoded: any = jwtDecode(token);

      // Carrega perfil e sessões em paralelo
      const [meRes, sessionsRes] = await Promise.all([
        fetch(`${API}/auth/me`, { headers: headers(token) }),
        fetch(`${API}/users/me/sessions`, { headers: headers(token), credentials: "include" }),
      ]);

      if (!meRes.ok) { router.push("/login"); return; }

      const me = await meRes.json();
      const sessionsData = sessionsRes.ok ? await sessionsRes.json() : [];

      const exp = decoded.exp ? new Date(decoded.exp * 1000) : null;
      const tokenStatus: TokenStatus = exp && exp < new Date() ? "EXPIRED" : "ACTIVE";

      setSession({
        id: me.id, name: me.name, email: me.email,
        role: me.role || "USER",
        lastLoginAt: me.lastLoginAt || null,
        accessToken: token, accessExp: exp,
        refreshHash: me.refreshTokenHash || null,
        refreshExp: me.refreshTokenExpires ? new Date(me.refreshTokenExpires) : null,
        familyId: me.familyId || null,
        tokenStatus,
      });

      setActiveSessions(sessionsData);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadSession(); }, [loadSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (session?.accessExp) setTimer(timeLeft(session.accessExp));
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.accessExp]);

  async function handleRefresh() {
    setRefreshing(true);
    const eventId = Date.now();
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setRotations(prev => [{
          id: eventId, timestamp: new Date().toISOString(),
          accessTokenSnippet: "—", familyId: "—",
          status: "REUSE_DETECTED",
        }, ...prev.slice(0, 9)]);
        return;
      }

      localStorage.setItem("accessToken", data.accessToken);
      const decoded: any = jwtDecode(data.accessToken);

      setRotations(prev => [{
        id: eventId, timestamp: new Date().toISOString(),
        accessTokenSnippet: mask(data.accessToken, 10, 6),
        familyId: data.familyId || mask(data.refreshTokenHash, 8, 4),
        status: "OK",
      }, ...prev.slice(0, 9)]);

      setSession(prev => prev ? {
        ...prev,
        accessToken: data.accessToken,
        accessExp: decoded.exp ? new Date(decoded.exp * 1000) : null,
        refreshHash: data.refreshTokenHash || null,
        refreshExp: data.refreshTokenExpires ? new Date(data.refreshTokenExpires) : null,
        familyId: data.familyId || prev.familyId,
        tokenStatus: "ACTIVE",
      } : null);
    } catch {
      setRotations(prev => [{
        id: eventId, timestamp: new Date().toISOString(),
        accessTokenSnippet: "—", familyId: "—", status: "ERROR",
      }, ...prev.slice(0, 9)]);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API}/users/me/sessions/${sessionId}`, {
        method: "DELETE",
        headers: headers(token || undefined),
        credentials: "include",
      });
      if (res.ok) {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } finally {
      setRevokingId(null);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: headers(),
      });
    } finally {
      localStorage.removeItem("accessToken");
      router.push("/login");
    }
  }

  if (loading) return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, position: "relative" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "var(--green)", fontSize: "1.5rem", marginBottom: "1rem" }}>◈</div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", letterSpacing: "0.1em" }}>
          LOADING SESSION<span className="blink">_</span>
        </div>
      </div>
    </main>
  );

  const accessExpired = session?.accessExp && session.accessExp < new Date();

  return (
    <main style={{ minHeight: "100vh", position: "relative", zIndex: 1, paddingBottom: "3rem" }}>

      {/* Topbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(8,11,15,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border)",
        padding: "0.75rem 1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: "0.85rem", letterSpacing: "0.1em" }}>◈ CORESTACK</span>
          <span style={{ color: "var(--border-bright)", fontSize: "0.7rem" }}>/</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>AUTH_MONITOR</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {session && (
            <>
              <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
                {session.role === "ADMIN" ? <span style={{ color: "var(--orange)" }}>⬡ ADMIN</span> : "⬡ USER"}
              </span>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{session.email}</span>
            </>
          )}
          <StatusDot status={session?.tokenStatus || "EXPIRED"} />
          <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "0.35rem 0.85rem", fontSize: "0.72rem", letterSpacing: "0.08em" }}>
            LOGOUT
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Title */}
        <div style={{ marginBottom: "2rem", animation: "fadeInUp 0.3s ease forwards" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.3rem" }}>
            SESSION MONITOR
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
            Real-time JWT token state · Active sessions · Rotation history · Multi-tenant
          </p>
        </div>

        {/* Grid principal */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1px", background: "var(--border)" }}>

          {/* User Identity */}
          <div style={{ animation: "fadeInUp 0.3s ease 0.05s both" }}>
            <Card title="USER_IDENTITY" icon="◇" accent="cyan">
              <DataRow label="USER_ID" value={`#${session?.id}`} highlight />
              <DataRow label="NAME" value={session?.name} />
              <DataRow label="EMAIL" value={session?.email} />
              <DataRow label="ROLE" value={
                <span style={{ color: session?.role === "ADMIN" ? "var(--orange)" : "var(--green)" }}>
                  {session?.role || "USER"}
                </span>
              } mono={false} />
              <DataRow label="TENANT" value={TENANT} />
              <DataRow label="LAST_LOGIN" value={
                session?.lastLoginAt
                  ? new Date(session.lastLoginAt).toLocaleString()
                  : "—"
              } />
              <DataRow label="SESSION_STATUS" value={<StatusDot status={session?.tokenStatus || "EXPIRED"} />} mono={false} />
            </Card>
          </div>

          {/* Access Token */}
          <div style={{ animation: "fadeInUp 0.3s ease 0.1s both" }}>
            <Card title="ACCESS_TOKEN" icon="⟳" accent="green">
              <DataRow label="TOKEN" value={mask(session?.accessToken ?? null)} />
              <DataRow label="EXPIRES_IN" value={
                <span style={{ color: accessExpired ? "var(--red)" : "var(--green)" }}>
                  {timer || timeLeft(session?.accessExp ?? null)}
                </span>
              } mono={false} />
              <DataRow label="EXPIRES_AT" value={session?.accessExp?.toLocaleTimeString() || "—"} />
              <DataRow label="ALGORITHM" value="HS256 / JWT" />
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>PAYLOAD_PREVIEW</div>
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", padding: "0.75rem", fontSize: "0.72rem", color: "var(--cyan)", wordBreak: "break-all" }}>
                  {session?.accessToken ? (() => {
                    try {
                      const d: any = jwtDecode(session.accessToken);
                      return JSON.stringify({
                        userId: d.userId,
                        sessionId: d.sessionId ? d.sessionId.slice(0, 8) + "..." : undefined,
                        tenantId: d.tenantId ? d.tenantId.slice(0, 8) + "..." : undefined,
                        exp: d.exp,
                      }, null, 0);
                    } catch { return "—"; }
                  })() : "—"}
                </div>
              </div>
            </Card>
          </div>

          {/* Refresh Token */}
          <div style={{ animation: "fadeInUp 0.3s ease 0.15s both" }}>
            <Card title="REFRESH_TOKEN" icon="▣" accent="orange">
              <DataRow label="TOKEN_HASH (SHA-256)" value={mask(session?.refreshHash ?? null, 14, 6)} />
              <DataRow label="FAMILY_ID" value={mask(session?.familyId ?? null, 10, 6)} />
              <DataRow label="SESSION_EXPIRES" value={session?.refreshExp?.toLocaleDateString() || "—"} />
              <DataRow label="STORAGE" value="HttpOnly Cookie" />
              <DataRow label="ROTATION_POLICY" value="USED → new on each call" />
              <DataRow label="REUSE_DETECTION" value={<span style={{ color: "var(--green)" }}>✓ ENABLED</span>} mono={false} />
              <div style={{ marginTop: "1rem" }}>
                <button onClick={handleRefresh} disabled={refreshing} style={{
                  width: "100%", background: refreshing ? "transparent" : "rgba(0,255,136,0.1)",
                  border: "1px solid var(--green-dim)", color: "var(--green)",
                  padding: "0.65rem", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em",
                }}>
                  {refreshing ? "ROTATING..." : "⟳ ROTATE_TOKEN"}
                </button>
              </div>
            </Card>
          </div>

          {/* Session Details */}
          <div style={{ animation: "fadeInUp 0.3s ease 0.2s both" }}>
            <Card title="SESSION_DETAILS" icon="◈" accent="cyan">
              <DataRow label="FAMILY_ID_FULL" value={
                <span style={{ fontSize: "0.7rem", color: "var(--cyan)", wordBreak: "break-all" }}>
                  {session?.familyId || "Load via ROTATE_TOKEN"}
                </span>
              } mono={false} />
              <DataRow label="REFRESH_HASH_FULL" value={
                <span style={{ fontSize: "0.7rem", color: "var(--orange)", wordBreak: "break-all" }}>
                  {session?.refreshHash || "Load via ROTATE_TOKEN"}
                </span>
              } mono={false} />
              <DataRow label="REVOCATION_SCOPE" value="Family-wide" />
              <DataRow label="HASH_ALGO" value="SHA-256 (token)" />
              <DataRow label="PWD_HASH" value="bcrypt (salt=10)" />
              <DataRow label="FINGERPRINT" value={<span style={{ color: "var(--green)" }}>✓ IP + UA + Lang + TZ</span>} mono={false} />
            </Card>
          </div>

        </div>

        {/* Active Sessions */}
        <div style={{ marginTop: "1px", background: "var(--border)", animation: "fadeInUp 0.3s ease 0.25s both" }}>
          <Card title="ACTIVE_SESSIONS" icon="◎" accent="cyan">
            {activeSessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                Nenhuma sessão ativa encontrada.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "var(--border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 80px", gap: "1rem", padding: "0.5rem 0.75rem", background: "var(--bg-surface)", fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                  <span>IP_ADDRESS</span>
                  <span>USER_AGENT</span>
                  <span>CREATED</span>
                  <span>LAST_SEEN</span>
                  <span>ACTION</span>
                </div>
                {activeSessions.map(s => (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px 80px", gap: "1rem", padding: "0.65rem 0.75rem", background: "var(--bg-card)", fontSize: "0.76rem", alignItems: "center", animation: "slideIn 0.3s ease forwards" }}>
                    <span style={{ color: "var(--cyan)", fontSize: "0.72rem" }}>{s.ipAddress || "—"}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.userAgent || ""}>
                      {s.userAgent ? s.userAgent.slice(0, 30) + "..." : "—"}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>{new Date(s.lastSeenAt).toLocaleTimeString()}</span>
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      disabled={revokingId === s.id}
                      style={{ background: "transparent", border: "1px solid var(--red)", color: "var(--red)", padding: "0.25rem 0.5rem", fontSize: "0.68rem", letterSpacing: "0.05em", cursor: "pointer" }}
                    >
                      {revokingId === s.id ? "..." : "REVOKE"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Rotation History */}
        <div style={{ marginTop: "1px", background: "var(--border)", animation: "fadeInUp 0.3s ease 0.3s both" }}>
          <Card title="ROTATION_HISTORY" icon="◎" accent="green">
            {rotations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem", opacity: 0.3 }}>◎</div>
                Nenhuma rotação nesta sessão.<br />
                <span style={{ fontSize: "0.72rem" }}>Clique em ROTATE_TOKEN para iniciar.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "var(--border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 80px", gap: "1rem", padding: "0.5rem 0.75rem", background: "var(--bg-surface)", fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                  <span>TIMESTAMP</span>
                  <span>ACCESS_TOKEN</span>
                  <span>FAMILY_ID</span>
                  <span>STATUS</span>
                </div>
                {rotations.map(r => (
                  <div key={r.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 80px", gap: "1rem", padding: "0.65rem 0.75rem", background: "var(--bg-card)", fontSize: "0.76rem", animation: "slideIn 0.3s ease forwards", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{new Date(r.timestamp).toLocaleTimeString()}</span>
                    <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>{r.accessTokenSnippet}</span>
                    <span style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)", fontSize: "0.68rem" }}>{r.familyId}</span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: r.status === "OK" ? "var(--green)" : r.status === "REUSE_DETECTED" ? "var(--red)" : "var(--orange)" }}>
                      {r.status === "OK" ? "✓ OK" : r.status === "REUSE_DETECTED" ? "✗ REUSE" : "✗ ERR"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Security notice */}
        <div style={{ marginTop: "1px", background: "var(--border)" }}>
          <div style={{ background: "var(--bg-card)", padding: "1rem 1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            <span style={{ color: "var(--green)", fontSize: "0.85rem", flexShrink: 0 }}>✓</span>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--green)", letterSpacing: "0.05em" }}>SECURE MODE</strong> — refreshToken em{" "}
              <span style={{ color: "var(--cyan)" }}>HttpOnly cookie</span> com{" "}
              <span style={{ color: "var(--cyan)" }}>Secure + SameSite=Strict</span>.{" "}
              Fingerprint intermediário ativo: IP + User-Agent + Accept-Language + Timezone.{" "}
              Multi-tenant via <span style={{ color: "var(--cyan)" }}>X-Tenant-ID header</span>.
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
