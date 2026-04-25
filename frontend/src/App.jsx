// Authored by James Williams in collaboration with Claude
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import AccountRequestPage from "./pages/AccountRequestPage";
import InvestigatorPage from "./pages/InvestigatorPage";
import EvidencePage from "./pages/EvidencePage";
import AdminPage from "./pages/AdminPage";



// cd frontend
// npm run dev
// Inner component so it can read the auth context
function AppShell() {
  const { user, timedOut, clearTimedOut } = useAuth();
  const [activePage, setActivePage] = useState("investigator");
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Reset to the correct landing page whenever a different user logs in
  useEffect(() => {
    if (user) {
      setActivePage(user.role === "admin" ? "admin" : "investigator");
    }
  }, [user?.user_id]);

  // ── Session expired ────────────────────────────────────────────────────
  if (!user && timedOut) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--cv-base)", flexDirection: "column", gap: "0",
      }}>
        <div style={{
          background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
          borderRadius: "10px", padding: "48px 52px", textAlign: "center",
          maxWidth: "400px", width: "90%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}>
          <img
            src="/logo.png?v=2"
            alt=""
            style={{ width: "64px", height: "64px", objectFit: "contain", marginBottom: "20px", opacity: 0.85 }}
          />
          <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--cv-text)", marginBottom: "10px" }}>
            Session Expired
          </div>
          <div style={{ fontSize: "13px", color: "var(--cv-text2)", lineHeight: "1.6", marginBottom: "28px" }}>
            You were automatically signed out after 30 minutes of inactivity.
            Your work is safe — please sign in again to continue.
          </div>
          <button
            className="cv-btn cv-btn-primary"
            style={{ width: "100%", padding: "10px", fontSize: "14px", fontWeight: "600" }}
            onClick={clearTimedOut}
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Not logged in ──────────────────────────────────────────────────────
  if (!user) {
    if (showRequestForm) {
      return <AccountRequestPage onBack={() => setShowRequestForm(false)} />;
    }
    return <LoginPage onRequestAccount={() => setShowRequestForm(true)} />;
  }

  // ── Logged in ──────────────────────────────────────────────────────────
  const renderPage = () => {
    if (activePage === "investigator") return <InvestigatorPage />;
    if (activePage === "evidence")     return <EvidencePage />;
    if (activePage === "admin")        return <AdminPage />;
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div style={{ flex: 1, background: "var(--cv-base)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {renderPage()}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
