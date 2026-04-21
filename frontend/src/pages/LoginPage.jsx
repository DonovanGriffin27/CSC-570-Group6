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

      if (!res.ok) {
        setError(data.detail || "Login failed.");
        return;
      }

      login(data.access_token, data.user);
    } catch {
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "#1a1a2e",
        border: "1px solid #333",
        borderRadius: "8px",
        padding: "40px",
        width: "100%",
        maxWidth: "400px",
      }}>
        {/* Logo / title */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "white" }}>CaseVault</div>
          <div style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
            Digital Crime Investigation System
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "#666", textTransform: "uppercase",
              letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", color: "#666", textTransform: "uppercase",
              letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ color: "#ff4d4d", fontSize: "13px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "6px",
              padding: "10px",
              background: "#00d4ff",
              color: "#0f0f1a",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "14px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid #2a2a3e", paddingTop: "20px" }}>
          <span style={{ color: "#666", fontSize: "13px" }}>Don&apos;t have an account? </span>
          <span
            onClick={onRequestAccount}
            style={{ color: "#00d4ff", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
          >
            Request Access
          </span>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: "4px",
  border: "1px solid #444",
  background: "#0f0f1a",
  color: "white",
  fontSize: "14px",
  boxSizing: "border-box",
};

export default LoginPage;
