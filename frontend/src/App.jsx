import { useState } from "react";
import Sidebar from "./components/Sidebar";
import InvestigatorPage from "./pages/InvestigatorPage";
import EvidencePage from "./pages/EvidencePage";
import AdminPage from "./pages/AdminPage";

function App() {
  const [activePage, setActivePage] = useState("investigator");

  const renderPage = () => {
    if (activePage === "investigator") return <InvestigatorPage />;
    if (activePage === "evidence") return <EvidencePage />;
    if (activePage === "admin") return <AdminPage />;
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div style={{ flex: 1, padding: "30px", background: "#0f0f1a", minHeight: "100vh", color: "white" }}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;