import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const priorityColor = (p) =>
  p === "High" ? "#ff4d4d" : p === "Medium" ? "#ffaa00" : "#00cc66";

const statusColor = (s) =>
  s === "Closed" ? "#aaa" : s === "In Progress" ? "#00d4ff" : "#00cc66";

const eventTypeColor = (t) =>
  t === "STATUS_CHANGE" ? "#ffaa00"
  : t === "NOTE_ADDED" ? "#00d4ff"
  : t === "EVIDENCE_ADDED" ? "#cc66ff"
  : "#aaa";

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
  const { user, token } = useAuth();
  const isAdmin = user?.role === "admin";

  const [caseData, setCaseData]     = useState(null);
  const [reports, setReports]       = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes]           = useState([]);
  const [timeline, setTimeline]     = useState([]);
  const [auditLog, setAuditLog]     = useState([]);

  const [editing, setEditing]       = useState(false);
  const [title, setTitle]           = useState("");
  const [priority, setPriority]     = useState("");
  const [status, setStatus]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [newNote, setNewNote]       = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => { fetchAll(); }, [caseId]);

  const fetchAll = async () => {
    const [caseRes, reportRes, assignRes] = await Promise.all([
      fetch(`http://127.0.0.1:8000/cases/${caseId}`, { headers: authHeaders }),
      fetch(`http://127.0.0.1:8000/crime-reports/${caseId}`, { headers: authHeaders }),
      fetch(`http://127.0.0.1:8000/assignments/case/${caseId}`, { headers: authHeaders }),
    ]);

    const caseJson = await caseRes.json();
    setCaseData(caseJson);
    setTitle(caseJson.title || "");
    setPriority(caseJson.priority);
    setStatus(caseJson.status);

    if (reportRes.ok) setReports(await reportRes.json());
    if (assignRes.ok) setAssignments(await assignRes.json());

    await fetchMongo();
  };

  const fetchMongo = async () => {
    const [notesRes, timelineRes, auditRes] = await Promise.all([
      fetch(`http://127.0.0.1:8000/notes/${caseId}`, { headers: authHeaders }),
      fetch(`http://127.0.0.1:8000/timeline/${caseId}`, { headers: authHeaders }),
      fetch(`http://127.0.0.1:8000/audit/case/${caseId}`, { headers: authHeaders }),
    ]);
    if (notesRes.ok) setNotes(await notesRes.json());
    if (timelineRes.ok) setTimeline(await timelineRes.json());
    if (auditRes.ok) setAuditLog(await auditRes.json());
  };

  const cancelEdit = () => {
    setTitle(caseData.title || "");
    setPriority(caseData.priority);
    setStatus(caseData.status);
    setEditing(false);
  };

  const saveChanges = async () => {
    setSaving(true);
    const res = await fetch(`http://127.0.0.1:8000/cases/${caseId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ title, priority, status }),
    });
    setSaving(false);
    if (res.ok) {
      setCaseData((prev) => ({ ...prev, title, priority, status }));
      setEditing(false);
      setSaveMessage("Changes saved.");
      setTimeout(() => setSaveMessage(""), 3000);
      fetchMongo();
    }
  };

  const submitNote = async () => {
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    const res = await fetch(`http://127.0.0.1:8000/notes/${caseId}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ note_text: newNote }),
    });
    setSubmittingNote(false);
    if (res.ok) {
      setNewNote("");
      setNoteMessage("Note saved.");
      setTimeout(() => setNoteMessage(""), 3000);
      fetchMongo();
    } else {
      const data = await res.json();
      setNoteMessage(`Error: ${data.detail || "Failed to save note."}`);
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

      {/* Top 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Case Overview */}
        <div style={{
          background: "#1a1a2e", border: "1px solid #333",
          borderRadius: "6px", padding: "20px", marginBottom: "16px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, color: "#00d4ff", fontSize: "13px",
              textTransform: "uppercase", letterSpacing: "0.08em" }}>
              🗂 Case Overview
            </h3>
            {isAdmin && !editing && (
              <button
                onClick={() => setEditing(true)}
                style={{ padding: "4px 12px", background: "transparent", color: "#00d4ff",
                  border: "1px solid #00d4ff", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <>
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled" style={inputStyle} />
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
              {saveMessage && (
                <div style={{ color: "#00cc66", fontSize: "13px", marginBottom: "10px" }}>{saveMessage}</div>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={saveChanges} disabled={saving}
                  style={{ padding: "8px 18px", background: "#00d4ff", color: "#0f0f1a",
                    border: "none", borderRadius: "4px", cursor: "pointer",
                    fontWeight: "bold", fontSize: "13px", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={cancelEdit} disabled={saving}
                  style={{ padding: "8px 14px", background: "transparent", color: "#aaa",
                    border: "1px solid #444", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <Field label="Title">
                <div style={{ color: title ? "white" : "#555", fontSize: "13px" }}>
                  {title || "Untitled"}
                </div>
              </Field>
              <Field label="Priority">
                <div style={{ fontSize: "13px", fontWeight: "bold", color: priorityColor(caseData.priority) }}>
                  {caseData.priority}
                </div>
              </Field>
              <Field label="Status">
                <div style={{ fontSize: "13px", fontWeight: "bold", color: statusColor(caseData.status) }}>
                  {caseData.status}
                </div>
              </Field>
              {saveMessage && (
                <div style={{ color: "#00cc66", fontSize: "13px" }}>{saveMessage}</div>
              )}
            </>
          )}
        </div>

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

      {/* Placeholders — pending tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Section title="👥 People Involved"
          placeholder="Suspects, victims, and witnesses — requires people tables in database." />
        <Section title="📎 Evidence"
          placeholder="Evidence intake and chain of custody — requires evidence queries." />
      </div>

      {/* Investigation Notes — MongoDB */}
      <Section title="📝 Investigation Notes">
        <div style={{ marginBottom: "14px" }}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a new investigation note..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", marginBottom: "8px" }}
          />
          {noteMessage && (
            <div style={{ color: noteMessage.startsWith("Error") ? "#ff4d4d" : "#00cc66",
              fontSize: "12px", marginBottom: "6px" }}>{noteMessage}</div>
          )}
          <button
            onClick={submitNote}
            disabled={submittingNote || !newNote.trim()}
            style={{ padding: "7px 16px", background: "#00d4ff", color: "#0f0f1a",
              border: "none", borderRadius: "4px", cursor: "pointer",
              fontWeight: "bold", fontSize: "13px",
              opacity: submittingNote || !newNote.trim() ? 0.5 : 1 }}>
            {submittingNote ? "Saving..." : "Add Note"}
          </button>
        </div>

        {notes.length === 0
          ? <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>No notes yet.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {notes.map((n) => (
                <div key={n._id} style={{
                  background: "#0f0f1a", border: "1px solid #2a2a3e",
                  borderRadius: "4px", padding: "12px"
                }}>
                  <div style={{ color: "white", fontSize: "13px", lineHeight: "1.6", marginBottom: "6px" }}>
                    {n.note_text}
                  </div>
                  <div style={{ fontSize: "11px", color: "#555" }}>
                    {n.author_name} · {new Date(n.time_stamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
        }
      </Section>

      {/* Court placeholder */}
      <Section title="📅 Court / Legal Info"
        placeholder="Court dates and charges — requires court tables in database." />

      {/* Timeline — MongoDB */}
      <Section title="🔄 Timeline / Activity Feed">
        {timeline.length === 0
          ? <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>No activity yet.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {timeline.map((e) => (
                <div key={e._id} style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  padding: "10px", background: "#0f0f1a",
                  borderRadius: "4px", border: "1px solid #2a2a3e"
                }}>
                  <span style={{
                    fontSize: "10px", fontWeight: "bold", padding: "2px 7px",
                    borderRadius: "3px", background: eventTypeColor(e.event_type) + "22",
                    color: eventTypeColor(e.event_type), whiteSpace: "nowrap", marginTop: "1px"
                  }}>
                    {e.event_type.replace("_", " ")}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#ccc", fontSize: "13px" }}>{e.description}</div>
                    <div style={{ color: "#555", fontSize: "11px", marginTop: "3px" }}>
                      {new Date(e.time_stamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </Section>

      {/* Audit Log — MongoDB */}
      <Section title="🔐 Audit Log">
        {auditLog.length === 0
          ? <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>No audit events for this case.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {auditLog.map((a) => (
                <div key={a._id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "8px 10px", background: "#0f0f1a",
                  borderRadius: "4px", borderLeft: "2px solid #333", fontSize: "12px"
                }}>
                  <span style={{ color: "#00d4ff", fontWeight: "bold", minWidth: "110px" }}>
                    {a.action_type}
                  </span>
                  <span style={{ color: "#aaa", flex: 1 }}>{a.description}</span>
                  <span style={{ color: "#555", whiteSpace: "nowrap" }}>
                    {a.user_name} · {new Date(a.time_stamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
        }
      </Section>
    </div>
  );
}

export default CaseDetailPage;
