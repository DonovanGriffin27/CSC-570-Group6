import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function LoginPage({ onRequestAccount }) {
  const { login } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Login failed."); return; }
      login(data.access_token, data.user);
    } catch {
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── Left branding panel ── */}
      <div style={{
        width: "42%", flexShrink: 0,
        background: "var(--cv-surface)",
        borderRight: "1px solid var(--cv-border)",
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 52px",
        backgroundImage: "radial-gradient(circle, rgba(59,130,246,0.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}>
        <div>
          <div style={{
            fontSize: "22px", fontWeight: "700", letterSpacing: "0.1em",
            color: "var(--cv-text)", textTransform: "uppercase",
          }}>
            CaseVault
          </div>
          <div style={{ fontSize: "12px", color: "var(--cv-text3)", marginTop: "4px", letterSpacing: "0.04em" }}>
            Case Management System
          </div>
        </div>

        <div>
          <div style={{
            fontSize: "28px", fontWeight: "700", color: "var(--cv-text)",
            lineHeight: "1.25", marginBottom: "16px",
          }}>
            Centralized case<br />management for<br />law enforcement
          </div>
          <div style={{ fontSize: "13px", color: "var(--cv-text2)", lineHeight: "1.6", maxWidth: "320px" }}>
            Secure, role-based access to case files, evidence records,
            investigation notes, and audit trails.
          </div>
        </div>

        <div style={{
          padding: "12px 16px",
          background: "rgba(248,113,113,0.07)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: "5px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#f87171",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
            Authorized Personnel Only
          </div>
          <div style={{ fontSize: "12px", color: "var(--cv-text3)", lineHeight: "1.5" }}>
            Unauthorized access is prohibited and subject to prosecution under applicable law.
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1, background: "var(--cv-base)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px",
      }}>
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: "700", color: "var(--cv-text)" }}>
              Sign In
            </h1>
            <div style={{ fontSize: "13px", color: "var(--cv-text3)" }}>
              Enter your credentials to access the system
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="cv-input"
                placeholder="name@department.gov"
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="cv-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{
                padding: "9px 12px", borderRadius: "4px",
                background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)",
                color: "#f87171", fontSize: "13px",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cv-btn cv-btn-primary"
              style={{ padding: "10px", fontSize: "14px", marginTop: "4px" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={{
            marginTop: "28px", paddingTop: "20px",
            borderTop: "1px solid var(--cv-border)",
            textAlign: "center",
          }}>
            <span style={{ color: "var(--cv-text3)", fontSize: "13px" }}>
              Need access?{" "}
            </span>
            <span
              onClick={onRequestAccount}
              style={{ color: "var(--cv-blue-l)", fontSize: "13px", cursor: "pointer" }}
            >
              Request an Account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: "600",
  color: "var(--cv-text2)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: "6px",
};

export default LoginPage;
