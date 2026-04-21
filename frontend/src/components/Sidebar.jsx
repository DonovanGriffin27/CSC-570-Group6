import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function Sidebar({ activePage, onNavigate }) {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const links = [
    { label: "Investigator", page: "investigator" },
    { label: "Evidence",     page: "evidence" },
    ...(user?.role === "admin" ? [{ label: "Admin", page: "admin" }] : []),
  ];

  return (
    <div style={{ width: "200px", background: "#1a1a2e", height: "100vh", padding: "20px",
      display: "flex", flexDirection: "column", position: "sticky", top: 0,
      boxSizing: "border-box" }}>

      <h2 style={{ color: "white", marginBottom: "30px", marginTop: 0 }}>CaseVault</h2>

      <nav style={{ flex: 1 }}>
        {links.map((link) => (
          <div
            key={link.page}
            onClick={() => onNavigate(link.page)}
            style={{
              color: activePage === link.page ? "#00d4ff" : "#aaa",
              cursor: "pointer",
              marginBottom: "15px",
              fontWeight: activePage === link.page ? "bold" : "normal",
            }}
          >
            {link.label}
          </div>
        ))}
      </nav>

      {/* ── Profile button at the bottom ── */}
      <div style={{ position: "relative" }}>
        <div
          onClick={() => setShowProfile((p) => !p)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #333",
            background: showProfile ? "#2a2a40" : "transparent",
          }}
        >
          {/* Avatar circle */}
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "#00d4ff",
            color: "#0f0f1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "13px",
            flexShrink: 0,
          }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ color: "white", fontSize: "12px", fontWeight: "bold",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{ color: "#555", fontSize: "10px", textTransform: "capitalize" }}>
              {user?.role}
            </div>
          </div>
        </div>

        {/* Dropdown */}
        {showProfile && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#1a1a2e",
            border: "1px solid #333",
            borderRadius: "6px",
            overflow: "hidden",
          }}>
            <div style={{ padding: "12px", borderBottom: "1px solid #2a2a3e" }}>
              <div style={{ color: "white", fontSize: "13px", fontWeight: "bold" }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>{user?.email}</div>
              <div style={{ color: "#00d4ff", fontSize: "11px", textTransform: "capitalize",
                marginTop: "2px" }}>
                {user?.role}
              </div>
            </div>
            <div
              onClick={() => { logout(); setShowProfile(false); }}
              style={{
                padding: "10px 12px",
                color: "#ff4d4d",
                fontSize: "13px",
                cursor: "pointer",
              }}
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