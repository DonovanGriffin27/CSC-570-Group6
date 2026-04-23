import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import AccountRequestPage from "./pages/AccountRequestPage";
import InvestigatorPage from "./pages/InvestigatorPage";
import EvidencePage from "./pages/EvidencePage";
import AdminPage from "./pages/AdminPage";

// Inner component so it can read the auth context
function AppShell() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState("investigator");
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Reset to the correct landing page whenever a different user logs in
  useEffect(() => {
    if (user) {
      setActivePage(user.role === "admin" ? "admin" : "investigator");
    }
  }, [user?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

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
