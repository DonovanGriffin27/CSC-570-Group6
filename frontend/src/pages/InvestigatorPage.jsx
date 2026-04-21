import { useState, useEffect } from "react";
import CaseDetailPage from "./CaseDetailPage";
import { useAuth } from "../context/AuthContext";

const priorityColor = (p) =>
  p === "High" ? "#ff4d4d" : p === "Medium" ? "#ffaa00" : "#00cc66";

function InvestigatorPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [search, setSearch] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState("Violent Crime");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

  const INVESTIGATOR_ID = user?.user_id;

  const REPORT_TYPES = [
    "Violent Crime", "Property Crime", "Drug Offense",
    "Fraud / Financial Crime", "Cybercrime",
    "Public Order Offense", "Traffic Offense", "Other"
  ];

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    const res = await fetch(`http://127.0.0.1:8000/assignments/investigator/${INVESTIGATOR_ID}`);
    const data = await res.json();
    setCases(data);
  };

  const fileCrimeReport = async () => {
    const res = await fetch("http://127.0.0.1:8000/crime-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_type: reportType, description }),
    });
    const data = await res.json();
    setMessage(`Report filed. Case ${data.case_number} created.`);
    setShowReportForm(false);
    setDescription("");
  };

  const filteredCases = cases.filter((c) => {
    const term = search.toLowerCase();
    return (
      (c.case_number && c.case_number.toLowerCase().includes(term)) ||
      (c.title && c.title.toLowerCase().includes(term))
    );
  });

  if (selectedCaseId)
    return <CaseDetailPage caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />;

  return (
    <div>
      <h1 style={{ marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "10px" }}>
        Investigator Portal
      </h1>

      <button
        onClick={() => setShowReportForm(!showReportForm)}
        style={{ padding: "10px 20px", background: "#00d4ff", color: "#0f0f1a", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginBottom: "20px" }}
      >
        {showReportForm ? "Cancel" : "File Crime Report"}
      </button>

      {message && (
        <div style={{ marginBottom: "15px", color: "#00cc66" }}>{message}</div>
      )}

      {showReportForm && (
        <div style={{ background: "#1a1a2e", padding: "20px", borderRadius: "6px", border: "1px solid #333", marginBottom: "20px" }}>
          <h3 style={{ marginBottom: "15px" }}>New Crime Report</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #444", background: "#0f0f1a", color: "white" }}
            >
              {REPORT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <textarea
              placeholder="Describe the incident..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #444", background: "#0f0f1a", color: "white", resize: "vertical" }}
            />
            <button
              onClick={fileCrimeReport}
              style={{ padding: "8px 16px", background: "#00d4ff", color: "#0f0f1a", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", alignSelf: "flex-start" }}
            >
              Submit Report
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h2>My Active Cases</h2>
        <input
          placeholder="Search cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px", borderRadius: "4px", border: "1px solid #444", background: "#1a1a2e", color: "white", width: "220px" }}
        />
      </div>

      <div style={{ height: "420px", overflowY: "auto", border: "1px solid #333", borderRadius: "6px", padding: "15px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
          {filteredCases.length === 0 ? (
            <p style={{ color: "#aaa" }}>No active cases found.</p>
          ) : (
            filteredCases.map((c) => (
              <div
                key={c.case_id}
                onClick={() => setSelectedCaseId(c.case_id)}
                style={{ background: "#1a1a2e", padding: "15px", borderRadius: "6px", border: `1px solid ${priorityColor(c.priority)}`, cursor: "pointer" }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "6px" }}>{c.case_number}</div>
                <div style={{ color: "#aaa", fontSize: "13px", marginBottom: "6px" }}>
                  {c.title || "Untitled"}
                </div>
                <div style={{ fontSize: "12px", color: priorityColor(c.priority) }}>{c.priority}</div>
                <div style={{ fontSize: "11px", color: "#666", marginTop: "6px" }}>
                  {new Date(c.date_opened).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default InvestigatorPage;