import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const priorityColor = (p) =>
  p === "High" ? "#f87171" : p === "Medium" ? "#f59e0b" : "#34d399";

const statusColor = (s) =>
  s === "Closed" ? "#8b9ab4" : s === "In Progress" ? "#60a5fa" : "#34d399";

const eventTypeColor = (t) =>
  t === "STATUS_CHANGE" ? "#f59e0b"
  : t === "NOTE_ADDED" ? "#60a5fa"
  : t === "EVIDENCE_ADDED" ? "#a78bfa"
  : "#8b9ab4";

function Section({ title, children, placeholder }) {
  return (
    <div style={{
      background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
      borderRadius: "6px", padding: "18px 20px", marginBottom: "14px",
    }}>
      <h3 style={{
        margin: "0 0 14px", fontSize: "11px", fontWeight: "600",
        color: "var(--cv-text2)", textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        {title}
      </h3>
      {placeholder
        ? <p style={{ color: "var(--cv-text3)", fontSize: "13px", margin: 0 }}>{placeholder}</p>
        : children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{
        fontSize: "11px", color: "var(--cv-text3)", marginBottom: "4px",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function CaseDetailPage({ caseId, onBack, onCaseUpdated }) {
  const { user, token } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEdit = isAdmin && ["SUPER_ADMIN", "ADMIN"].includes(user?.admin_level);
  const canAssign = canEdit;

  const [caseData, setCaseData]         = useState(null);
  const [reports, setReports]           = useState([]);
  const [assignments, setAssignments]   = useState([]);
  const [notes, setNotes]               = useState([]);
  const [timeline, setTimeline]         = useState([]);

  const [expandedSection, setExpandedSection] = useState(null);

  const [editing, setEditing]           = useState(false);
  const [title, setTitle]               = useState("");
  const [priority, setPriority]         = useState("");
  const [status, setStatus]             = useState("");
  const [saving, setSaving]             = useState(false);
  const [saveMessage, setSaveMessage]   = useState("");

  const [newNote, setNewNote]           = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteMessage, setNoteMessage]   = useState("");

  const [investigators, setInvestigators] = useState([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedInv, setSelectedInv]   = useState("");
  const [assignMsg, setAssignMsg]       = useState("");

  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => { fetchAll(); }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canAssign) return;
    fetch("http://127.0.0.1:8000/admin/investigators", { headers: authHeaders })
      .then((r) => r.ok ? r.json() : [])
      .then(setInvestigators)
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!assignMsg) return;
    const t = setTimeout(() => setAssignMsg(""), 4000);
    return () => clearTimeout(t);
  }, [assignMsg]);

  useEffect(() => {
    if (!saveMessage) return;
    const t = setTimeout(() => setSaveMessage(""), 3000);
    return () => clearTimeout(t);
  }, [saveMessage]);

  useEffect(() => {
    if (!noteMessage) return;
    const t = setTimeout(() => setNoteMessage(""), 4000);
    return () => clearTimeout(t);
  }, [noteMessage]);

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
    const [notesRes, timelineRes] = await Promise.all([
      fetch(`http://127.0.0.1:8000/notes/${caseId}`, { headers: authHeaders }),
      fetch(`http://127.0.0.1:8000/timeline/${caseId}`, { headers: authHeaders }),
    ]);
    if (notesRes.ok) setNotes(await notesRes.json());
    if (timelineRes.ok) setTimeline(await timelineRes.json());
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
      method: "PATCH", headers: authHeaders,
      body: JSON.stringify({ title, priority, status }),
    });
    setSaving(false);
    if (res.ok) {
      setCaseData((prev) => ({ ...prev, title, priority, status }));
      setEditing(false);
      setSaveMessage("Changes saved.");
      fetchMongo();
      if (onCaseUpdated) onCaseUpdated();
    }
  };

  const submitNote = async () => {
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    const res = await fetch(`http://127.0.0.1:8000/notes/${caseId}`, {
      method: "POST", headers: authHeaders,
      body: JSON.stringify({ note_text: newNote }),
    });
    setSubmittingNote(false);
    if (res.ok) {
      setNewNote("");
      setNoteMessage("Note saved.");
      fetchMongo();
    } else {
      const data = await res.json();
      setNoteMessage(`Error: ${data.detail || "Failed to save note."}`);
    }
  };

  const submitAssign = async () => {
    if (!selectedInv) return;
    const res = await fetch(`http://127.0.0.1:8000/admin/cases/${caseId}/assign`, {
      method: "POST", headers: authHeaders,
      body: JSON.stringify({ user_id: parseInt(selectedInv) }),
    });
    const data = await res.json();
    if (res.ok) {
      setAssignMsg("Investigator assigned.");
      setShowAssignForm(false);
      setSelectedInv("");
      const assignRes = await fetch(`http://127.0.0.1:8000/assignments/case/${caseId}`, { headers: authHeaders });
      if (assignRes.ok) setAssignments(await assignRes.json());
      if (onCaseUpdated) onCaseUpdated();
    } else {
      setAssignMsg(`Error: ${data.detail || "Assignment failed."}`);
    }
  };

  if (!caseData) {
    return (
      <div style={{ padding: "40px 28px", color: "var(--cv-text3)", fontSize: "13px" }}>
        Loading...
      </div>
    );
  }

  // ── Expanded section full-page views ──────────────────────────────────
  if (expandedSection) {
    const sectionTitles = { notes: "Investigation Notes", timeline: "Timeline / Activity Feed" };
    return (
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px",
          marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--cv-border)" }}>
          <button onClick={() => setExpandedSection(null)} className="cv-btn cv-btn-secondary" style={{ padding: "5px 12px", fontSize: "12px" }}>
            ← Case Detail
          </button>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--cv-text)" }}>
              {sectionTitles[expandedSection]}
            </div>
            <div style={{ fontSize: "12px", color: "var(--cv-text3)", marginTop: "2px" }}>
              {caseData.case_number} · {caseData.title || "Untitled"}
            </div>
          </div>
        </div>

        {/* Notes full view */}
        {expandedSection === "notes" && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a new investigation note..." rows={3}
                className="cv-input" style={{ resize: "vertical", marginBottom: "8px" }} />
              {noteMessage && (
                <div style={{ color: noteMessage.startsWith("Error") ? "#f87171" : "#34d399",
                  fontSize: "12px", marginBottom: "6px" }}>{noteMessage}</div>
              )}
              <button onClick={submitNote} disabled={submittingNote || !newNote.trim()}
                className="cv-btn cv-btn-primary" style={{ padding: "6px 16px", fontSize: "12px" }}>
                {submittingNote ? "Saving..." : "Add Note"}
              </button>
            </div>
            <div style={{ fontSize: "12px", color: "var(--cv-text3)", marginBottom: "12px" }}>
              {notes.length} note{notes.length !== 1 ? "s" : ""} — newest first
            </div>
            {notes.map((n) => (
              <div key={n._id} style={{ background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
                borderRadius: "5px", padding: "14px 16px", marginBottom: "8px" }}>
                <div style={{ color: "var(--cv-text)", fontSize: "13px", lineHeight: "1.6", marginBottom: "8px" }}>
                  {n.note_text}
                </div>
                <div style={{ fontSize: "11px", color: "var(--cv-text3)" }}>
                  {n.author_name} · {new Date(n.time_stamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline full view */}
        {expandedSection === "timeline" && (
          <div>
            <div style={{ fontSize: "12px", color: "var(--cv-text3)", marginBottom: "12px" }}>
              {timeline.length} event{timeline.length !== 1 ? "s" : ""} — newest first
            </div>
            {timeline.map((e) => (
              <div key={e._id} style={{ display: "flex", alignItems: "flex-start", gap: "10px",
                padding: "10px 14px", background: "var(--cv-surface)",
                borderRadius: "5px", border: "1px solid var(--cv-border)", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 7px", borderRadius: "3px",
                  background: `${eventTypeColor(e.event_type)}18`, color: eventTypeColor(e.event_type),
                  border: `1px solid ${eventTypeColor(e.event_type)}30`, whiteSpace: "nowrap", marginTop: "1px" }}>
                  {e.event_type.replace("_", " ")}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--cv-text2)", fontSize: "13px" }}>{e.description}</div>
                  <div style={{ color: "var(--cv-text3)", fontSize: "11px", marginTop: "3px" }}>
                    {new Date(e.time_stamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "14px",
        marginBottom: "20px", paddingBottom: "16px",
        borderBottom: "1px solid var(--cv-border)",
      }}>
        {onBack && (
          <button onClick={onBack} className="cv-btn cv-btn-secondary" style={{ padding: "4px 10px", fontSize: "13px" }}>
            ✕
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--cv-text)" }}>
            {caseData.case_number}
          </div>
          <div style={{ fontSize: "12px", color: "var(--cv-text3)", marginTop: "2px" }}>
            Opened {new Date(caseData.date_opened).toLocaleDateString()}
            {caseData.date_closed && ` · Closed ${new Date(caseData.date_closed).toLocaleDateString()}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{
            fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "3px",
            background: `${priorityColor(caseData.priority)}18`,
            color: priorityColor(caseData.priority),
            border: `1px solid ${priorityColor(caseData.priority)}40`,
          }}>
            {caseData.priority}
          </span>
          <span style={{
            fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "3px",
            background: `${statusColor(caseData.status)}18`,
            color: statusColor(caseData.status),
            border: `1px solid ${statusColor(caseData.status)}40`,
          }}>
            {caseData.status}
          </span>
        </div>
        {saveMessage && (
          <span style={{ fontSize: "12px", color: "#34d399" }}>{saveMessage}</span>
        )}
      </div>

      {/* ── Top 2-col ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

        {/* Case Overview */}
        <div style={{
          background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
          borderRadius: "6px", padding: "18px 20px", marginBottom: "14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "11px", fontWeight: "600",
              color: "var(--cv-text2)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Case Overview
            </h3>
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="cv-btn cv-btn-ghost" style={{ padding: "3px 10px", fontSize: "12px" }}>
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <>
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Case title" className="cv-input" />
              </Field>
              <Field label="Priority">
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="cv-input">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="cv-input">
                  <option>Open</option>
                  <option value="In Progress">In Progress</option>
                  <option>Closed</option>
                </select>
              </Field>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button onClick={saveChanges} disabled={saving} className="cv-btn cv-btn-primary" style={{ padding: "7px 16px" }}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={cancelEdit} disabled={saving} className="cv-btn cv-btn-secondary" style={{ padding: "7px 12px" }}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <Field label="Title">
                <div style={{ color: title ? "var(--cv-text)" : "var(--cv-text3)", fontSize: "13px" }}>
                  {title || "Untitled"}
                </div>
              </Field>
              <Field label="Priority">
                <div style={{ fontSize: "13px", fontWeight: "600", color: priorityColor(caseData.priority) }}>
                  {caseData.priority}
                </div>
              </Field>
              <Field label="Status">
                <div style={{ fontSize: "13px", fontWeight: "600", color: statusColor(caseData.status) }}>
                  {caseData.status}
                </div>
              </Field>
            </>
          )}
        </div>

        {/* Crime Report */}
        <Section title="Crime Report">
          {reports.length === 0
            ? <p style={{ color: "var(--cv-text3)", fontSize: "13px", margin: 0 }}>No reports filed for this case.</p>
            : reports.map((r) => (
              <div key={r.report_id} style={{ marginBottom: "14px" }}>
                <Field label="Type">
                  <div style={{ color: "var(--cv-text)", fontSize: "13px" }}>{r.report_type}</div>
                </Field>
                <Field label="Filed">
                  <div style={{ color: "var(--cv-text2)", fontSize: "13px" }}>
                    {new Date(r.report_date).toLocaleString()}
                  </div>
                </Field>
                <Field label="Summary">
                  <div style={{ color: "var(--cv-text2)", fontSize: "13px", lineHeight: "1.6" }}>
                    {r.description}
                  </div>
                </Field>
              </div>
            ))
          }
        </Section>
      </div>

      {/* Assigned Investigators */}
      <Section title="Assigned Investigators">
        {assignments.length === 0 && !canAssign && (
          <p style={{ color: "var(--cv-text3)", fontSize: "13px", margin: 0 }}>No investigators assigned.</p>
        )}

        {assignments.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: canAssign ? "12px" : 0 }}>
            {assignments.map((a) => (
              <div key={a.assignment_id} style={{
                background: "var(--cv-raised)", border: "1px solid var(--cv-border)",
                borderRadius: "4px", padding: "6px 12px", fontSize: "13px",
              }}>
                <span style={{ color: "var(--cv-text)" }}>{a.first_name} {a.last_name}</span>
                <span style={{ color: "var(--cv-text3)", marginLeft: "8px", fontSize: "11px" }}>{a.status}</span>
              </div>
            ))}
          </div>
        )}

        {canAssign && (
          <div>
            {assignMsg && (
              <div style={{
                fontSize: "12px", marginBottom: "8px",
                color: assignMsg.startsWith("Error") ? "#f87171" : "#34d399",
              }}>
                {assignMsg}
              </div>
            )}
            {showAssignForm ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  value={selectedInv}
                  onChange={(e) => setSelectedInv(e.target.value)}
                  className="cv-input"
                  style={{ width: "auto", flex: 1 }}
                >
                  <option value="">Select investigator...</option>
                  {investigators
                    .filter((inv) => !assignments.some((a) => a.user_id === inv.user_id))
                    .map((inv) => (
                      <option key={inv.user_id} value={inv.user_id}>
                        {inv.first_name} {inv.last_name} — {inv.rank}
                      </option>
                    ))}
                </select>
                <button onClick={submitAssign} disabled={!selectedInv}
                  className="cv-btn cv-btn-success" style={{ padding: "6px 14px", fontSize: "12px" }}>
                  Assign
                </button>
                <button onClick={() => { setShowAssignForm(false); setSelectedInv(""); }}
                  className="cv-btn cv-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                  Cancel
                </button>
              </div>
            ) : investigators.filter((inv) => !assignments.some((a) => a.user_id === inv.user_id)).length > 0 ? (
              <button onClick={() => setShowAssignForm(true)}
                className="cv-btn cv-btn-ghost"
                style={{ padding: "5px 14px", fontSize: "12px" }}>
                + Add Investigator
              </button>
            ) : (
              <span style={{ fontSize: "12px", color: "var(--cv-text3)" }}>All available investigators assigned</span>
            )}
          </div>
        )}
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <Section title="People Involved"
          placeholder="Suspects, victims, and witnesses — requires people tables in database." />
        <Section title="Evidence"
          placeholder="Evidence intake and chain of custody — requires evidence queries." />
      </div>

      {/* Investigation Notes */}
      <Section title="Investigation Notes">
        <div style={{ marginBottom: "14px" }}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a new investigation note..."
            rows={3}
            className="cv-input"
            style={{ resize: "vertical", marginBottom: "8px" }}
          />
          {noteMessage && (
            <div style={{
              color: noteMessage.startsWith("Error") ? "#f87171" : "#34d399",
              fontSize: "12px", marginBottom: "6px",
            }}>
              {noteMessage}
            </div>
          )}
          <button
            onClick={submitNote}
            disabled={submittingNote || !newNote.trim()}
            className="cv-btn cv-btn-primary"
            style={{ padding: "6px 16px", fontSize: "12px" }}
          >
            {submittingNote ? "Saving..." : "Add Note"}
          </button>
        </div>

        {notes.length === 0
          ? <p style={{ color: "var(--cv-text3)", fontSize: "13px", margin: 0 }}>No notes yet.</p>
          : <>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {notes.slice(0, 3).map((n) => (
                  <div key={n._id} style={{
                    background: "var(--cv-raised)", border: "1px solid var(--cv-border)",
                    borderRadius: "4px", padding: "12px",
                  }}>
                    <div style={{ color: "var(--cv-text)", fontSize: "13px", lineHeight: "1.6", marginBottom: "6px" }}>
                      {n.note_text}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--cv-text3)" }}>
                      {n.author_name} · {new Date(n.time_stamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              {notes.length > 3 && (
                <button onClick={() => setExpandedSection("notes")}
                  className="cv-btn cv-btn-ghost"
                  style={{ marginTop: "10px", padding: "5px 14px", fontSize: "12px" }}>
                  Show all {notes.length} notes
                </button>
              )}
            </>
        }
      </Section>

      <Section title="Court / Legal Info"
        placeholder="Court dates and charges — requires court tables in database." />

      {/* Timeline */}
      <Section title="Timeline / Activity Feed">
        {timeline.length === 0
          ? <p style={{ color: "var(--cv-text3)", fontSize: "13px", margin: 0 }}>No activity yet.</p>
          : <>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {timeline.slice(0, 3).map((e) => (
                  <div key={e._id} style={{
                    display: "flex", alignItems: "flex-start", gap: "10px",
                    padding: "9px 12px", background: "var(--cv-raised)",
                    borderRadius: "4px", border: "1px solid var(--cv-border)",
                  }}>
                    <span style={{
                      fontSize: "10px", fontWeight: "600", padding: "2px 7px", borderRadius: "3px",
                      background: `${eventTypeColor(e.event_type)}18`,
                      color: eventTypeColor(e.event_type),
                      border: `1px solid ${eventTypeColor(e.event_type)}30`,
                      whiteSpace: "nowrap", marginTop: "1px",
                    }}>
                      {e.event_type.replace("_", " ")}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "var(--cv-text2)", fontSize: "13px" }}>{e.description}</div>
                      <div style={{ color: "var(--cv-text3)", fontSize: "11px", marginTop: "3px" }}>
                        {new Date(e.time_stamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {timeline.length > 3 && (
                <button onClick={() => setExpandedSection("timeline")}
                  className="cv-btn cv-btn-ghost"
                  style={{ marginTop: "10px", padding: "5px 14px", fontSize: "12px" }}>
                  Show all {timeline.length} events
                </button>
              )}
            </>
        }
      </Section>

    </div>
  );
}

export default CaseDetailPage;
