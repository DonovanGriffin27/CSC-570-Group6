import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import CaseDetailPage from "./CaseDetailPage";

const priorityColor = (p) =>
  p === "High" ? "#f87171" : p === "Medium" ? "#f59e0b" : "#34d399";

const statusColor = (s) =>
  s === "Closed" ? "#8b9ab4" : s === "In Progress" ? "#60a5fa" : "#34d399";

const reqStatusColor = (s) =>
  s === "Approved" ? "#34d399" : s === "Denied" ? "#f87171" : "#f59e0b";

const levelColor = (l) =>
  l === "SUPER_ADMIN" ? "#f87171"
  : l === "ADMIN" ? "#60a5fa"
  : l === "SUPERVISOR" ? "#f59e0b"
  : "#8b9ab4";

const DEPT_TYPES = [
  "Homicide", "Narcotics", "Cyber Crimes", "Financial Crimes",
  "Forensics", "Patrol", "Internal Affairs", "Administration", "Other",
];

const ADMIN_LEVELS = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "VIEWER"];
const TABS = ["Cases", "Account Requests", "Departments", "Audit Log", "Admin Management"];

function AdminPage() {
  const { user, token } = useAuth();
  const isSuperAdmin = user?.admin_level === "SUPER_ADMIN";
  const visibleTabs = isSuperAdmin ? TABS : TABS.filter((t) => t !== "Admin Management");

  const [activeTab, setActiveTab] = useState("Cases");

  const authH = { Authorization: `Bearer ${token}` };
  const jsonH = { "Content-Type": "application/json", ...authH };

  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const [cases, setCases] = useState([]);

  const [requests, setRequests]     = useState([]);
  const [reqFilter, setReqFilter]   = useState("Pending");
  const [reqLoading, setReqLoading] = useState(true);
  const [reqMessage, setReqMessage] = useState("");

  const [departments, setDepartments]   = useState([]);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptForm, setDeptForm]         = useState({ name: "", department_type: "", contact_email: "", contact_phone: "" });
  const [deptMessage, setDeptMessage]   = useState("");

  const [admins, setAdmins]             = useState([]);
  const [levelChanges, setLevelChanges] = useState({});
  const [adminMsg, setAdminMsg]         = useState("");

  const [auditLog, setAuditLog]         = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedAuditUser, setSelectedAuditUser] = useState(null);

  useEffect(() => {
    fetchCases();
    fetchDepartments();
    if (isSuperAdmin) fetchAdmins();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "Audit Log") {
      setSelectedAuditUser(null);
      return;
    }
    fetchAuditLog();
    const interval = setInterval(fetchAuditLog, 30000);
    return () => clearInterval(interval);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchRequests(); }, [reqFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCases = async () => {
    const res = await fetch("http://127.0.0.1:8000/admin/cases", { headers: authH });
    if (res.ok) setCases(await res.json());
  };

  const fetchRequests = async () => {
    setReqLoading(true);
    const url = reqFilter === "All"
      ? "http://127.0.0.1:8000/admin/account-requests"
      : `http://127.0.0.1:8000/admin/account-requests?status_filter=${reqFilter}`;
    const res = await fetch(url, { headers: authH });
    if (res.ok) setRequests(await res.json());
    setReqLoading(false);
  };

  const fetchDepartments = async () => {
    const res = await fetch("http://127.0.0.1:8000/departments");
    if (res.ok) setDepartments(await res.json());
  };

  const fetchAdmins = async () => {
    const res = await fetch("http://127.0.0.1:8000/admin/admins", { headers: authH });
    if (res.ok) setAdmins(await res.json());
  };

  const fetchAuditLog = async () => {
    setAuditLoading(true);
    const res = await fetch("http://127.0.0.1:8000/admin/audit", { headers: authH });
    if (res.ok) setAuditLog(await res.json());
    setAuditLoading(false);
  };

  const decide = async (requestId, action) => {
    const res = await fetch(`http://127.0.0.1:8000/admin/account-requests/${requestId}`, {
      method: "PATCH", headers: jsonH,
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) { setReqMessage(data.message); fetchRequests(); }
    else setReqMessage(`Error: ${data.detail}`);
    setTimeout(() => setReqMessage(""), 5000);
  };

  const setDept = (field) => (e) => setDeptForm((p) => ({ ...p, [field]: e.target.value }));

  const submitDepartment = async (e) => {
    e.preventDefault();
    const res = await fetch("http://127.0.0.1:8000/departments", {
      method: "POST", headers: jsonH, body: JSON.stringify(deptForm),
    });
    const data = await res.json();
    if (res.ok) {
      setDeptMessage(`Department "${data.name}" created.`);
      setDeptForm({ name: "", department_type: "", contact_email: "", contact_phone: "" });
      setShowDeptForm(false);
      fetchDepartments();
    } else {
      setDeptMessage(`Error: ${data.detail}`);
    }
    setTimeout(() => setDeptMessage(""), 4000);
  };

  const submitLevelChange = async (userId) => {
    const newLevel = levelChanges[userId];
    if (!newLevel) return;
    const res = await fetch(`http://127.0.0.1:8000/admin/admins/${userId}/level`, {
      method: "PATCH", headers: jsonH,
      body: JSON.stringify({ admin_level: newLevel }),
    });
    const data = await res.json();
    if (res.ok) {
      setAdminMsg(data.message);
      setLevelChanges((p) => { const n = { ...p }; delete n[userId]; return n; });
      fetchAdmins();
    } else {
      setAdminMsg(`Error: ${data.detail}`);
    }
    setTimeout(() => setAdminMsg(""), 4000);
  };

  if (selectedCaseId) {
    return (
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: compact case list */}
        <div style={{
          width: "380px", flexShrink: 0, display: "flex", flexDirection: "column",
          background: "var(--cv-surface)", borderRight: "1px solid var(--cv-border)",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--cv-border)", flexShrink: 0 }}>
            <button
              onClick={() => setSelectedCaseId(null)}
              className="cv-btn cv-btn-secondary"
              style={{ padding: "5px 12px", fontSize: "12px", width: "100%" }}
            >
              ← Back to Cases
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {cases.map((c) => (
              <div
                key={c.case_id}
                onClick={() => setSelectedCaseId(c.case_id)}
                className={`cv-row${selectedCaseId === c.case_id ? " cv-row-selected" : ""}`}
                style={{
                  padding: "11px 16px",
                  borderLeft: `3px solid ${priorityColor(c.priority)}`,
                  borderBottom: "1px solid var(--cv-border)",
                  background: selectedCaseId === c.case_id ? "var(--cv-blue-bg)" : "transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--cv-text)" }}>
                      {c.case_number}
                    </div>
                    <div style={{
                      fontSize: "12px", color: "var(--cv-text2)", marginTop: "2px",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "240px",
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
            ))}
          </div>
        </div>

        {/* Right: case detail */}
        <div style={{ flex: 1, overflow: "hidden", background: "var(--cv-base)" }}>
          <div style={{ height: "100%", overflowY: "auto" }}>
            <CaseDetailPage key={selectedCaseId} caseId={selectedCaseId} onCaseUpdated={fetchCases} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--cv-text)" }}>
          Admin Portal
        </h1>
        <div style={{ fontSize: "12px", color: "var(--cv-text3)", marginTop: "4px" }}>
          {isSuperAdmin ? "Super Admin — full system access" : `${user?.admin_level} — department-scoped access`}
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--cv-border)", marginBottom: "24px" }}>
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`cv-tab${activeTab === t ? " active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ══ CASES TAB ══ */}
      {activeTab === "Cases" && (
        <div>
          <div style={{ marginBottom: "14px" }}>
            <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--cv-text)" }}>
              All Cases
            </span>
            <span style={{ fontSize: "12px", color: "var(--cv-text3)", marginLeft: "10px" }}>
              Click a case to view details and assign investigators
            </span>
          </div>

          {cases.length === 0 ? (
            <p style={{ color: "var(--cv-text3)", fontSize: "13px" }}>No cases found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {cases.map((c) => (
                <div key={c.case_id}
                  onClick={() => setSelectedCaseId(c.case_id)}
                  style={{
                    background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
                    borderLeft: `3px solid ${priorityColor(c.priority)}`,
                    borderRadius: "5px", padding: "12px 16px", cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--cv-raised)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "var(--cv-surface)"}
                >
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "130px 1fr 90px 120px 160px",
                    alignItems: "center", gap: "16px",
                  }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "var(--cv-text)", fontSize: "13px" }}>{c.case_number}</div>
                      <div style={{ color: "var(--cv-text3)", fontSize: "11px", marginTop: "2px" }}>
                        {new Date(c.date_opened).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--cv-text)", fontSize: "13px" }}>{c.title || "Untitled"}</div>
                      {c.report_type && (
                        <div style={{ color: "var(--cv-text3)", fontSize: "11px", marginTop: "2px" }}>{c.report_type}</div>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: priorityColor(c.priority) }}>
                      {c.priority}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: statusColor(c.status) }}>
                      {c.status}
                    </div>
                    <div style={{ fontSize: "12px", color: c.assigned_to === "Unassigned" ? "var(--cv-text3)" : "var(--cv-text2)" }}>
                      {c.assigned_to}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ ACCOUNT REQUESTS TAB ══ */}
      {activeTab === "Account Requests" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
            <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--cv-text)" }}>
              Account Requests
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              {["Pending", "Approved", "Denied", "All"].map((f) => (
                <button key={f} onClick={() => setReqFilter(f)}
                  className={`cv-btn ${reqFilter === f ? "cv-btn-primary" : "cv-btn-secondary"}`}
                  style={{ padding: "4px 12px", fontSize: "12px" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {reqMessage && (
            <div style={{ marginBottom: "12px", fontSize: "13px",
              color: reqMessage.startsWith("Error") ? "#f87171" : "#34d399" }}>
              {reqMessage}
            </div>
          )}

          {reqLoading ? (
            <p style={{ color: "var(--cv-text3)" }}>Loading...</p>
          ) : requests.length === 0 ? (
            <p style={{ color: "var(--cv-text3)", fontSize: "13px" }}>No {reqFilter.toLowerCase()} requests.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {requests.map((r) => (
                <div key={r.request_id} style={{
                  background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
                  borderRadius: "5px", padding: "16px 20px",
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto",
                  alignItems: "center", gap: "16px",
                }}>
                  <div>
                    <div style={{ fontWeight: "600", color: "var(--cv-text)", marginBottom: "3px" }}>
                      {r.first_name} {r.last_name}
                    </div>
                    <div style={{ color: "var(--cv-text2)", fontSize: "12px" }}>{r.contact_email}</div>
                    {r.contact_phone && (
                      <div style={{ color: "var(--cv-text3)", fontSize: "11px", marginTop: "2px" }}>{r.contact_phone}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--cv-blue-l)", textTransform: "capitalize", marginBottom: "3px" }}>
                      {r.requested_role}
                    </div>
                    {r.requested_admin_level && (
                      <div style={{ fontSize: "11px", fontWeight: "600", color: levelColor(r.requested_admin_level), marginBottom: "2px" }}>
                        {r.requested_admin_level}
                      </div>
                    )}
                    {r.badge_number && <div style={{ fontSize: "11px", color: "var(--cv-text2)" }}>Badge: {r.badge_number}</div>}
                    {r.rank && <div style={{ fontSize: "11px", color: "var(--cv-text2)" }}>Rank: {r.rank}</div>}
                    {r.department_id && (
                      <div style={{ fontSize: "11px", color: "var(--cv-text2)" }}>
                        Dept: {departments.find((d) => d.department_id === r.department_id)?.name ?? r.department_id}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "600",
                      color: reqStatusColor(r.status), marginBottom: "3px" }}>
                      {r.status}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--cv-text3)" }}>
                      {new Date(r.requested_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {r.status === "Pending" && (
                      <>
                        <button onClick={() => decide(r.request_id, "approve")}
                          className="cv-btn cv-btn-success" style={{ padding: "5px 12px", fontSize: "12px" }}>
                          Approve
                        </button>
                        <button onClick={() => decide(r.request_id, "deny")}
                          className="cv-btn cv-btn-danger" style={{ padding: "5px 12px", fontSize: "12px" }}>
                          Deny
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ DEPARTMENTS TAB ══ */}
      {activeTab === "Departments" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
            <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--cv-text)" }}>Departments</span>
            <button onClick={() => setShowDeptForm((p) => !p)}
              className={`cv-btn ${showDeptForm ? "cv-btn-secondary" : "cv-btn-primary"}`}
              style={{ padding: "5px 12px", fontSize: "12px" }}>
              {showDeptForm ? "Cancel" : "+ Add Department"}
            </button>
          </div>

          {deptMessage && (
            <div style={{ marginBottom: "10px", fontSize: "13px",
              color: deptMessage.startsWith("Error") ? "#f87171" : "#34d399" }}>
              {deptMessage}
            </div>
          )}

          {showDeptForm && (
            <form onSubmit={submitDepartment} style={{
              background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
              borderRadius: "6px", padding: "18px 20px", marginBottom: "16px",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px",
            }}>
              <Field label="Department Name *">
                <input value={deptForm.name} onChange={setDept("name")} required className="cv-input" />
              </Field>
              <Field label="Type *">
                <select value={deptForm.department_type} onChange={setDept("department_type")} required className="cv-input">
                  <option value="">Select type...</option>
                  {DEPT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Contact Email">
                <input type="email" value={deptForm.contact_email} onChange={setDept("contact_email")} className="cv-input" />
              </Field>
              <Field label="Contact Phone">
                <input value={deptForm.contact_phone} onChange={setDept("contact_phone")} className="cv-input" />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="cv-btn cv-btn-primary" style={{ padding: "7px 20px" }}>
                  Create Department
                </button>
              </div>
            </form>
          )}

          {departments.length === 0 ? (
            <p style={{ color: "var(--cv-text3)", fontSize: "13px" }}>No departments yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {departments.map((d) => (
                <div key={d.department_id} style={{
                  background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
                  borderRadius: "5px", padding: "10px 14px",
                }}>
                  <div style={{ color: "var(--cv-text)", fontWeight: "600", fontSize: "13px" }}>{d.name}</div>
                  <div style={{ color: "var(--cv-text3)", fontSize: "11px", marginTop: "2px" }}>{d.department_type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ AUDIT LOG TAB ══ */}
      {activeTab === "Audit Log" && (() => {
        const byUser = auditLog.reduce((acc, e) => {
          if (!acc[e.user_id]) acc[e.user_id] = { user_id: e.user_id, user_name: e.user_name, events: [] };
          acc[e.user_id].events.push(e);
          return acc;
        }, {});
        const auditUsers = Object.values(byUser).sort(
          (a, b) => new Date(b.events[0].time_stamp) - new Date(a.events[0].time_stamp)
        );
        const userEvents = selectedAuditUser ? (byUser[selectedAuditUser]?.events ?? []) : [];

        return (
          <div>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              {selectedAuditUser && (
                <button onClick={() => setSelectedAuditUser(null)}
                  className="cv-btn cv-btn-secondary" style={{ padding: "4px 12px", fontSize: "12px" }}>
                  ← All Users
                </button>
              )}
              <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--cv-text)" }}>
                {selectedAuditUser
                  ? `${byUser[selectedAuditUser]?.user_name ?? "User"} — Activity Log`
                  : "Audit Log"}
              </span>
              {!selectedAuditUser && (
                <span style={{ fontSize: "12px", color: "var(--cv-text3)" }}>
                  {auditUsers.length} user{auditUsers.length !== 1 ? "s" : ""} · {auditLog.length} total events
                </span>
              )}
              {selectedAuditUser && (
                <span style={{ fontSize: "12px", color: "var(--cv-text3)" }}>
                  {userEvents.length} event{userEvents.length !== 1 ? "s" : ""} — newest first
                </span>
              )}
              <button onClick={fetchAuditLog} className="cv-btn cv-btn-secondary"
                style={{ padding: "4px 12px", fontSize: "12px", marginLeft: "auto" }}>
                Refresh
              </button>
            </div>

            {auditLoading ? (
              <p style={{ color: "var(--cv-text3)", fontSize: "13px" }}>Loading...</p>
            ) : auditLog.length === 0 ? (
              <p style={{ color: "var(--cv-text3)", fontSize: "13px" }}>No audit events recorded yet.</p>
            ) : selectedAuditUser ? (
              /* ── Individual user events ── */
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {userEvents.map((a) => (
                  <div key={a._id} style={{
                    display: "grid", gridTemplateColumns: "160px 1fr 160px",
                    alignItems: "center", gap: "12px",
                    padding: "9px 14px", background: "var(--cv-surface)",
                    border: "1px solid var(--cv-border)", borderLeft: "3px solid var(--cv-blue)",
                    borderRadius: "4px", fontSize: "12px",
                  }}>
                    <span style={{ color: "var(--cv-blue-l)", fontWeight: "600", fontSize: "11px" }}>
                      {a.action_type}
                    </span>
                    <span style={{ color: "var(--cv-text2)" }}>{a.description}</span>
                    <span style={{ color: "var(--cv-text3)", textAlign: "right" }}>
                      {new Date(a.time_stamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* ── User list ── */
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {auditUsers.map((u) => (
                  <div key={u.user_id}
                    onClick={() => setSelectedAuditUser(u.user_id)}
                    style={{
                      background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
                      borderRadius: "5px", padding: "14px 18px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "16px",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--cv-raised)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "var(--cv-surface)"}
                  >
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                      background: "var(--cv-blue-bg)", border: "1px solid var(--cv-border2)",
                      color: "var(--cv-blue-l)", display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: "700", fontSize: "12px",
                    }}>
                      {(u.user_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--cv-text)" }}>
                        {u.user_name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginTop: "2px" }}>
                        Last activity: {new Date(u.events[0].time_stamp).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--cv-text)" }}>
                        {u.events.length}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--cv-text3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        action{u.events.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ ADMIN MANAGEMENT TAB ══ */}
      {activeTab === "Admin Management" && isSuperAdmin && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
            <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--cv-text)" }}>Admin Accounts</span>
            {adminMsg && (
              <span style={{ fontSize: "12px", color: adminMsg.startsWith("Error") ? "#f87171" : "#34d399" }}>
                {adminMsg}
              </span>
            )}
          </div>

          <div style={{ marginBottom: "12px", fontSize: "12px", color: "var(--cv-text3)" }}>
            SUPER_ADMIN — full control &nbsp;·&nbsp; ADMIN — operational &nbsp;·&nbsp; SUPERVISOR — reviewer &nbsp;·&nbsp; VIEWER — read-only
          </div>

          {admins.length === 0 ? (
            <p style={{ color: "var(--cv-text3)", fontSize: "13px" }}>No admins found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {admins.map((a) => (
                <div key={a.user_id} style={{
                  background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
                  borderRadius: "5px", padding: "12px 16px",
                  display: "grid", gridTemplateColumns: "1fr 120px 200px 100px",
                  alignItems: "center", gap: "16px",
                }}>
                  <div>
                    <div style={{ fontWeight: "600", color: "var(--cv-text)", fontSize: "13px" }}>
                      {a.first_name} {a.last_name}
                      {a.user_id === user?.user_id && (
                        <span style={{ color: "var(--cv-text3)", fontWeight: "400", marginLeft: "8px", fontSize: "11px" }}>(you)</span>
                      )}
                    </div>
                    <div style={{ color: "var(--cv-text2)", fontSize: "12px", marginTop: "2px" }}>{a.email}</div>
                    {a.admin_level !== "SUPER_ADMIN" && a.department_name && (
                      <div style={{ color: "var(--cv-text3)", fontSize: "11px", marginTop: "2px" }}>{a.department_name}</div>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: levelColor(a.admin_level) }}>
                    {a.admin_level}
                  </div>
                  <select
                    value={levelChanges[a.user_id] ?? a.admin_level}
                    onChange={(e) => setLevelChanges((p) => ({ ...p, [a.user_id]: e.target.value }))}
                    disabled={a.user_id === user?.user_id}
                    className="cv-input"
                    style={{ opacity: a.user_id === user?.user_id ? 0.4 : 1 }}
                  >
                    {ADMIN_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <button
                    onClick={() => submitLevelChange(a.user_id)}
                    disabled={a.user_id === user?.user_id || !levelChanges[a.user_id] || levelChanges[a.user_id] === a.admin_level}
                    className="cv-btn cv-btn-primary"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                  >
                    Update
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
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

export default AdminPage;
