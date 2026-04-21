import { useState, useEffect } from "react";

const priorityColor = (p) =>
  p === "High" ? "#ff4d4d" : p === "Medium" ? "#ffaa00" : "#00cc66";

const statusColor = (s) =>
  s === "Closed" ? "#aaa" : s === "In Progress" ? "#00d4ff" : "#00cc66";

function Section({ title, children, placeholder }) {
  return (
    <div style={{
      background: "#1a1a2e", border: "1px solid #333",
      borderRadius: "6px", padding: "20px", marginBottom: "16px"
    }}>
      <h3 style={{ margin: "0 0 14px 0", color: "#00d4ff", fontSize: "13px",
        textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </h3>
      {placeholder
        ? <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>{placeholder}</p>
        : children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px",
        textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function CaseDetailPage({ caseId, onBack }) {
  const [caseData, setCaseData]     = useState(null);
  const [reports, setReports]       = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [title, setTitle]           = useState("");
  const [priority, setPriority]     = useState("");
  const [status, setStatus]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState("");

  useEffect(() => { fetchAll(); }, [caseId]);

  const fetchAll = async () => {
    const caseRes = await fetch(`http://127.0.0.1:8000/cases/${caseId}`);
    const caseJson = await caseRes.json();
    setCaseData(caseJson);
    setTitle(caseJson.title || "");
    setPriority(caseJson.priority);
    setStatus(caseJson.status);

    const reportRes = await fetch(`http://127.0.0.1:8000/crime-reports/${caseId}`);
    if (reportRes.ok) setReports(await reportRes.json());

    const assignRes = await fetch(`http://127.0.0.1:8000/assignments/case/${caseId}`);
    if (assignRes.ok) setAssignments(await assignRes.json());
  };

  const saveChanges = async () => {
    setSaving(true);
    const res = await fetch(`http://127.0.0.1:8000/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority, status }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Changes saved.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (!caseData) return <div style={{ color: "#aaa" }}>Loading...</div>;

  const inputStyle = {
    width: "100%", padding: "8px", borderRadius: "4px",
    border: "1px solid #444", background: "#0f0f1a",
    color: "white", fontSize: "13px", boxSizing: "border-box",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px",
        marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "14px" }}>
        <button
          onClick={onBack}
          style={{ padding: "6px 14px", background: "transparent", color: "#aaa",
            border: "1px solid #444", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
        >
          ← Back
        </button>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "bold" }}>{caseData.case_number}</div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
            Opened {new Date(caseData.date_opened).toLocaleDateString()}
            {caseData.date_closed && ` · Closed ${new Date(caseData.date_closed).toLocaleDateString()}`}
          </div>
        </div>
        <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: "bold",
          color: statusColor(caseData.status) }}>
          {caseData.status}
        </span>
      </div>

      {/* Two column layout for top sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Case Overview */}
        <Section title="🗂 Case Overview">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              style={inputStyle}
            />
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              <option>Open</option>
              <option value="In Progress">In Progress</option>
              <option>Closed</option>
            </select>
          </Field>

          {message && (
            <div style={{ color: "#00cc66", fontSize: "13px", marginBottom: "10px" }}>{message}</div>
          )}
          <button
            onClick={saveChanges}
            disabled={saving}
            style={{ padding: "8px 18px", background: "#00d4ff", color: "#0f0f1a",
              border: "none", borderRadius: "4px", cursor: "pointer",
              fontWeight: "bold", fontSize: "13px", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </Section>

        {/* Crime Report */}
        <Section title="📄 Crime Report">
          {reports.length === 0
            ? <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>No reports filed for this case.</p>
            : reports.map((r) => (
              <div key={r.report_id} style={{ marginBottom: "14px" }}>
                <Field label="Type">
                  <div style={{ color: "white", fontSize: "13px" }}>{r.report_type}</div>
                </Field>
                <Field label="Filed">
                  <div style={{ color: "#aaa", fontSize: "13px" }}>
                    {new Date(r.report_date).toLocaleString()}
                  </div>
                </Field>
                <Field label="Summary">
                  <div style={{ color: "#aaa", fontSize: "13px", lineHeight: "1.5" }}>
                    {r.description}
                  </div>
                </Field>
              </div>
            ))
          }
        </Section>
      </div>

      {/* Assigned Investigators */}
      <Section title="👤 Assigned Investigators">
        {assignments.length === 0
          ? <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>No investigators assigned.</p>
          : <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {assignments.map((a) => (
                <div key={a.assignment_id} style={{
                  background: "#0f0f1a", border: "1px solid #333",
                  borderRadius: "4px", padding: "8px 14px", fontSize: "13px"
                }}>
                  <span style={{ color: "white" }}>{a.first_name} {a.last_name}</span>
                  <span style={{ color: "#555", marginLeft: "8px" }}>{a.status}</span>
                </div>
              ))}
            </div>
        }
      </Section>

      {/* Placeholder sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Section title="👥 People Involved"
          placeholder="Suspects, victims, and witnesses — requires people tables in database." />
        <Section title="📎 Evidence"
          placeholder="Evidence intake and chain of custody — requires evidence queries and MongoDB." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Section title="📝 Investigation Notes"
          placeholder="Investigator notes — requires MongoDB integration." />
        <Section title="📅 Court / Legal Info"
          placeholder="Court dates and charges — requires court tables in database." />
      </div>
      <Section title="🔄 Timeline / Activity Feed"
        placeholder="Case event history — requires MongoDB integration." />
      <Section title="🔐 Audit Log"
        placeholder="Access and change log — requires MongoDB integration (append-only)." />
    </div>
  );
}

export default CaseDetailPage;
