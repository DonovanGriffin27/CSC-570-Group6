// Authored by James Williams in collaboration with Claude
import { useState, useEffect } from "react";
import CaseDetailPage from "./CaseDetailPage";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";

const priorityColor = (p) =>
  p === "High" ? "#f87171" : p === "Medium" ? "#f59e0b" : "#34d399";

const REPORT_TYPES = [
  "Violent Crime", "Property Crime", "Drug Offense",
  "Fraud / Financial Crime", "Cybercrime",
  "Public Order Offense", "Traffic Offense", "Other",
];

function InvestigatorPage() {
  const { user, token } = useAuth();
  const [cases, setCases]               = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [search, setSearch]             = useState("");
  const [caseView, setCaseView]         = useState("active");

  const [showReportForm, setShowReportForm] = useState(false);
  const [caseTitle, setCaseTitle]       = useState("");
  const [reportType, setReportType]     = useState("Violent Crime");
  const [description, setDescription]  = useState("");
  const [message, setMessage]           = useState("");
  const [submitting, setSubmitting]     = useState(false);

  const INVESTIGATOR_ID = user?.user_id;
  const authH = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchCases(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showReportForm) setMessage("");
  }, [showReportForm]);

  const fetchCases = async () => {
    const res = await fetch(`${API}/assignments/investigator/${INVESTIGATOR_ID}`, {
      headers: authH,
    });
    if (res.ok) setCases(await res.json());
  };

  const fileCrimeReport = async () => {
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch(`${API}/crime-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ title: caseTitle, report_type: reportType, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${data.detail || "Failed to file report."}`);
        return;
      }
      setMessage(`Report filed. Case ${data.case_number} created.`);
      fetchCases();
      setTimeout(() => {
        setShowReportForm(false);
        setCaseTitle("");
        setDescription("");
        setReportType("Violent Crime");
      }, 2000);
    } catch {
      setMessage("Error: Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const viewedCases = cases.filter((c) =>
    caseView === "active" ? c.status !== "Closed" : c.status === "Closed"
  );

  const filteredCases = viewedCases.filter((c) => {
    const term = search.toLowerCase();
    return (
      (c.case_number && c.case_number.toLowerCase().includes(term)) ||
      (c.title && c.title.toLowerCase().includes(term))
    );
  });

  const activeCases = cases.filter((c) => c.status !== "Closed").length;
  const closedCases = cases.filter((c) => c.status === "Closed").length;
  const highPriority = cases.filter((c) => c.priority === "High" && c.status !== "Closed").length;

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>

      {/* ── Left panel: case list ── */}
      <div style={{
        width: "380px", flexShrink: 0, display: "flex", flexDirection: "column",
        background: "var(--cv-surface)", borderRight: "1px solid var(--cv-border)",
      }}>

        {/* Panel header */}
        <div style={{ padding: "16px", borderBottom: "1px solid var(--cv-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{
              fontSize: "11px", fontWeight: "600", color: "var(--cv-text2)",
              textTransform: "uppercase", letterSpacing: "0.09em",
            }}>
              My Cases
            </span>
            <button
              className="cv-btn cv-btn-primary"
              onClick={() => setShowReportForm(true)}
              style={{ padding: "4px 10px", fontSize: "12px" }}
            >
              + File Report
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
            <StatChip label="Active" value={activeCases} color="var(--cv-blue-l)" />
            <StatChip label="Closed" value={closedCases} color="#8b9ab4" />
            <StatChip label="High Pri" value={highPriority} color="#f87171" />
          </div>

          {/* Active / Closed toggle */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "10px" }}>
            {["active", "closed"].map((v) => (
              <button
                key={v}
                onClick={() => { setCaseView(v); setSelectedCaseId(null); setSearch(""); }}
                style={{
                  flex: 1, padding: "5px", fontSize: "11px", fontWeight: "600",
                  borderRadius: "4px", cursor: "pointer", border: "1px solid",
                  textTransform: "capitalize", letterSpacing: "0.04em",
                  background: caseView === v ? "var(--cv-blue-bg)" : "transparent",
                  borderColor: caseView === v ? "var(--cv-border2)" : "var(--cv-border)",
                  color: caseView === v ? "var(--cv-blue-l)" : "var(--cv-text3)",
                }}
              >
                {v === "active" ? "Active" : "Closed"}
              </button>
            ))}
          </div>

          <input
            className="cv-input"
            placeholder={`Search ${caseView} cases...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Case list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredCases.length === 0 ? (
            <div style={{ padding: "20px 16px", color: "var(--cv-text3)", fontSize: "13px" }}>
              {search
                ? "No cases match your search."
                : caseView === "active" ? "No active cases assigned." : "No closed cases."}
            </div>
          ) : (
            filteredCases.map((c) => (
              <div
                key={c.case_id}
                onClick={() => setSelectedCaseId(c.case_id)}
                className={`cv-row${selectedCaseId === c.case_id ? " cv-row-selected" : ""}`}
                style={{
                  padding: "11px 16px",
                  borderLeft: `3px solid ${c.status === "Closed" ? "#8b9ab4" : priorityColor(c.priority)}`,
                  borderBottom: "1px solid var(--cv-border)",
                  background: selectedCaseId === c.case_id ? "var(--cv-blue-bg)" : "transparent",
                  opacity: c.status === "Closed" ? 0.75 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--cv-text)" }}>
                      {c.case_number}
                    </div>
                    <div style={{
                      fontSize: "12px", color: "var(--cv-text2)", marginTop: "2px",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      maxWidth: "240px",
                    }}>
                      {c.title || "Untitled"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: priorityColor(c.priority) }}>
                      {c.priority}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginTop: "2px" }}>
                      {new Date(c.date_opened).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: case detail or placeholder ── */}
      <div style={{ flex: 1, overflow: "hidden", background: "var(--cv-base)", display: "flex", flexDirection: "column" }}>
        {selectedCaseId ? (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <CaseDetailPage
              key={selectedCaseId}
              caseId={selectedCaseId}
              onBack={() => setSelectedCaseId(null)}
              onCaseUpdated={fetchCases}
            />
          </div>
        ) : (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "10px",
          }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", color: "var(--cv-text3)",
            }}>
              ▣
            </div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--cv-text2)" }}>
              No case selected
            </div>
            <div style={{ fontSize: "13px", color: "var(--cv-text3)" }}>
              Select a case from the list to view details
            </div>
          </div>
        )}
      </div>

      {/* ── File Report Modal ── */}
      {showReportForm && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowReportForm(false); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          }}
        >
          <div style={{
            background: "var(--cv-surface)", border: "1px solid var(--cv-border2)",
            borderRadius: "8px", padding: "28px", width: "480px", maxWidth: "90vw",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--cv-text)" }}>
                  File Crime Report
                </h2>
                <div style={{ fontSize: "12px", color: "var(--cv-text3)", marginTop: "3px" }}>
                  A new case will be created from this report
                </div>
              </div>
              <button
                onClick={() => setShowReportForm(false)}
                className="cv-btn cv-btn-secondary"
                style={{ padding: "4px 10px", fontSize: "13px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormField label="Case Title *">
                <input
                  placeholder="e.g. Warehouse Break-In on 5th Ave"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  className="cv-input"
                  autoFocus
                />
              </FormField>

              <FormField label="Report Type">
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="cv-input">
                  {REPORT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </FormField>

              <FormField label="Incident Description">
                <textarea
                  placeholder="Describe the incident in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="cv-input"
                  style={{ resize: "vertical" }}
                />
              </FormField>

              {message && (
                <div style={{
                  padding: "8px 12px", borderRadius: "4px", fontSize: "13px",
                  background: message.startsWith("Error") ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)",
                  border: message.startsWith("Error") ? "1px solid rgba(248,113,113,0.3)" : "1px solid rgba(52,211,153,0.3)",
                  color: message.startsWith("Error") ? "#f87171" : "#34d399",
                }}>
                  {message}
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  onClick={fileCrimeReport}
                  disabled={!caseTitle.trim() || submitting}
                  className="cv-btn cv-btn-primary"
                  style={{ padding: "8px 20px", flex: 1 }}
                >
                  {submitting ? "Submitting..." : "Submit Report"}
                </button>
                <button
                  onClick={() => setShowReportForm(false)}
                  className="cv-btn cv-btn-secondary"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: "var(--cv-raised)", border: "1px solid var(--cv-border)",
      borderRadius: "4px", padding: "6px 10px", textAlign: "center",
    }}>
      <div style={{ fontSize: "16px", fontWeight: "700", color: color || "var(--cv-text)" }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", color: "var(--cv-text3)", textTransform: "uppercase",
        letterSpacing: "0.06em", marginTop: "1px" }}>
        {label}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: "11px", fontWeight: "600",
        color: "var(--cv-text2)", textTransform: "uppercase",
        letterSpacing: "0.07em", marginBottom: "6px",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default InvestigatorPage;
