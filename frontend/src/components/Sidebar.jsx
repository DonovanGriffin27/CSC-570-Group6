import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

function Sidebar({ activePage, onNavigate }) {
  const { user, token, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!showProfile) return;
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfile]);

  const links = [
    { label: "Cases", page: "investigator" },
    { label: "Evidence", page: "evidence" },
    ...(user?.role === "admin" ? [{ label: "Admin Portal", page: "admin" }] : []),
  ];

  return (
    <div style={{
      width: "220px", flexShrink: 0, height: "100vh",
      background: "var(--cv-surface)", borderRight: "1px solid var(--cv-border)",
      display: "flex", flexDirection: "column", boxSizing: "border-box",
    }}>

      {/* ── Brand header ── */}
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid var(--cv-border)" }}>
        <div style={{
          fontSize: "14px", fontWeight: "700", letterSpacing: "0.1em",
          color: "var(--cv-text)", textTransform: "uppercase",
        }}>
          CaseVault
        </div>
        <div style={{ fontSize: "10px", color: "var(--cv-text3)", marginTop: "3px", letterSpacing: "0.04em" }}>
          Case Management System
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: "14px 10px 10px" }}>
        <div style={{
          fontSize: "10px", color: "var(--cv-text3)", textTransform: "uppercase",
          letterSpacing: "0.1em", paddingLeft: "4px", marginBottom: "6px",
        }}>
          Navigation
        </div>
        {links.map((link) => (
          <div
            key={link.page}
            onClick={() => onNavigate(link.page)}
            className={`cv-nav-item${activePage === link.page ? " active" : ""}`}
          >
            {link.label}
          </div>
        ))}
      </nav>

      {/* ── Profile footer ── */}
      <div ref={profileRef} style={{ padding: "10px", borderTop: "1px solid var(--cv-border)", position: "relative" }}>
        <div
          onClick={() => setShowProfile((p) => !p)}
          style={{
            display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
            padding: "8px 10px", borderRadius: "5px",
            background: showProfile ? "var(--cv-raised)" : "transparent",
            border: `1px solid ${showProfile ? "var(--cv-border2)" : "transparent"}`,
            transition: "background 0.12s",
          }}
        >
          <div style={{
            width: "30px", height: "30px", borderRadius: "50%",
            background: "var(--cv-blue-bg)", border: "1px solid var(--cv-border2)",
            color: "var(--cv-blue-l)", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: "700", fontSize: "11px", flexShrink: 0,
          }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{
              color: "var(--cv-text)", fontSize: "12px", fontWeight: "600",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{ fontSize: "10px", color: "var(--cv-text3)", textTransform: "capitalize" }}>
              {user?.role}{user?.admin_level ? ` · ${user.admin_level}` : ""}
            </div>
          </div>
        </div>

        {showProfile && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 4px)", left: "10px", right: "10px",
            background: "var(--cv-raised)", border: "1px solid var(--cv-border2)",
            borderRadius: "6px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--cv-border)" }}>
              <div style={{ color: "var(--cv-text)", fontSize: "13px", fontWeight: "600" }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ color: "var(--cv-text2)", fontSize: "11px", marginTop: "2px" }}>
                {user?.email}
              </div>
              {user?.admin_level && (
                <div style={{ marginTop: "6px" }}>
                  <span style={{
                    fontSize: "10px", padding: "2px 7px", borderRadius: "3px",
                    background: "var(--cv-blue-bg)", color: "var(--cv-blue-l)", fontWeight: "600",
                    letterSpacing: "0.04em",
                  }}>
                    {user.admin_level}
                  </span>
                </div>
              )}
            </div>
            <div
              onClick={async () => {
                try {
                  await fetch("http://127.0.0.1:8000/auth/logout", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                } catch {}
                logout();
                setShowProfile(false);
              }}
              style={{
                padding: "10px 14px", color: "var(--cv-red)", fontSize: "13px", cursor: "pointer",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(248,113,113,0.06)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              Sign Out
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
