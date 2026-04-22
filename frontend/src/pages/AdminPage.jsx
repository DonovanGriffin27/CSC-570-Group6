import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const priorityColor = (p) =>
  p === "High" ? "#ff4d4d" : p === "Medium" ? "#ffaa00" : "#00cc66";

const statusColor = (s) =>
  s === "Closed" ? "#aaa" : s === "In Progress" ? "#00d4ff" : "#00cc66";

const reqStatusColor = (s) =>
  s === "Approved" ? "#00cc66" : s === "Denied" ? "#ff4d4d" : "#ffaa00";

const levelColor = (l) =>
  l === "SUPER_ADMIN" ? "#ff4d4d"
  : l === "ADMIN" ? "#00d4ff"
  : l === "SUPERVISOR" ? "#ffaa00"
  : "#aaa";

const DEPT_TYPES = [
  "Homicide", "Narcotics", "Cyber Crimes", "Financial Crimes",
  "Forensics", "Patrol", "Internal Affairs", "Administration", "Other",
];

const ADMIN_LEVELS = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "VIEWER"];

// ── nav tabs ──────────────────────────────────────────────────────────────────
const TABS = ["Cases", "Account Requests", "Departments", "Admin Management"];

function AdminPage() {
  const { user, token } = useAuth();
  const isSuperAdmin = user?.admin_level === "SUPER_ADMIN";
  const visibleTabs = isSuperAdmin ? TABS : TABS.filter((t) => t !== "Admin Management");

  const [activeTab, setActiveTab] = useState("Cases");

  const authH = { Authorization: `Bearer ${token}` };
  const jsonH = { "Content-Type": "application/json", ...authH };

  // ── Cases state ──────────────────────────────────────────────────────────
  const [cases, setCases]               = useState([]);
  const [investigators, setInvestigators] = useState([]);
  const [assignTarget, setAssignTarget] = useState(null); // case_id being assigned
  const [selectedInv, setSelectedInv]   = useState("");
  const [caseMsg, setCaseMsg]           = useState("");

  // ── Account requests state ────────────────────────────────────────────────
  const [requests, setRequests]   = useState([]);
  const [reqFilter, setReqFilter] = useState("Pending");
  const [reqLoading, setReqLoading] = useState(true);
  const [reqMessage, setReqMessage] = useState("");

  // ── Departments state ─────────────────────────────────────────────────────
  const [departments, setDepartments]   = useState([]);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptForm, setDeptForm]         = useState({ name: "", department_type: "", contact_email: "", contact_phone: "" });
  const [deptMessage, setDeptMessage]   = useState("");

  // ── Admin management state ────────────────────────────────────────────────
  const [admins, setAdmins]           = useState([]);
  const [levelChanges, setLevelChanges] = useState({});
  const [adminMsg, setAdminMsg]         = useState("");

  // ── Initial loads ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCases();
    fetchInvestigators();
    fetchDepartments();
    if (isSuperAdmin) fetchAdmins();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchRequests(); }, [reqFilter]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchCases = async () => {
    const res = await fetch("http://127.0.0.1:8000/admin/cases", { headers: authH });
    if (res.ok) setCases(await res.json());
  };

  const fetchInvestigators = async () => {
    const res = await fetch("http://127.0.0.1:8000/admin/investigators", { headers: authH });
    if (res.ok) setInvestigators(await res.json());
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

  // ── Case actions ──────────────────────────────────────────────────────────
  const submitAssign = async (caseId) => {
    if (!selectedInv) return;
    const res = await fetch(`http://127.0.0.1:8000/admin/cases/${caseId}/assign`, {
      method: "POST",
      headers: jsonH,
      body: JSON.stringify({ user_id: parseInt(selectedInv) }),
    });
    const data = await res.json();
    if (res.ok) {
      setCaseMsg("Investigator assigned successfully.");
      setAssignTarget(null);
      setSelectedInv("");
      fetchCases();
    } else {
      setCaseMsg(`Error: ${data.detail || "Assignment failed."}`);
    }
    setTimeout(() => setCaseMsg(""), 4000);
  };

  // ── Account request actions ───────────────────────────────────────────────
  const decide = async (requestId, action) => {
    const res = await fetch(`http://127.0.0.1:8000/admin/account-requests/${requestId}`, {
      method: "PATCH",
      headers: jsonH,
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) {
      setReqMessage(data.message);
      fetchRequests();
    } else {
      setReqMessage(`Error: ${data.detail}`);
    }
    setTimeout(() => setReqMessage(""), 5000);
  };

  // ── Department actions ────────────────────────────────────────────────────
  const setDept = (field) => (e) => setDeptForm((p) => ({ ...p, [field]: e.target.value }));

  const submitDepartment = async (e) => {
    e.preventDefault();
    const res = await fetch("http://127.0.0.1:8000/departments", {
      method: "POST",
      headers: jsonH,
      body: JSON.stringify(deptForm),
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

  // ── Admin level actions ───────────────────────────────────────────────────
  const submitLevelChange = async (userId) => {
    const newLevel = levelChanges[userId];
    if (!newLevel) return;
    const res = await fetch(`http://127.0.0.1:8000/admin/admins/${userId}/level`, {
      method: "PATCH",
      headers: jsonH,
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

  return (
    <div>
      <h1 style={{ marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "10px" }}>
        Admin Portal
      </h1>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid #222", paddingBottom: "0" }}>
        {visibleTabs.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: "8px 18px", background: "transparent", border: "none",
            borderBottom: activeTab === t ? "2px solid #00d4ff" : "2px solid transparent",
            color: activeTab === t ? "#00d4ff" : "#666",
            cursor: "pointer", fontWeight: activeTab === t ? "bold" : "normal",
            fontSize: "13px", marginBottom: "-1px",
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ══════════ CASES TAB ══════════ */}
      {activeTab === "Cases" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ margin: 0 }}>All Cases</h2>
            {caseMsg && (
              <span style={{ fontSize: "13px", color: caseMsg.startsWith("Error") ? "#ff4d4d" : "#00cc66" }}>
                {caseMsg}
              </span>
            )}
          </div>

          {cases.length === 0 ? (
            <p style={{ color: "#555", fontSize: "13px" }}>No cases found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {cases.map((c) => (
                <div key={c.case_id} style={{
                  background: "#1a1a2e", border: `1px solid ${priorityColor(c.priority)}22`,
                  borderLeft: `3px solid ${priorityColor(c.priority)}`,
                  borderRadius: "6px", padding: "14px 18px",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 120px 160px 180px auto", alignItems: "center", gap: "16px" }}>
                    {/* Case number */}
                    <div>
                      <div style={{ fontWeight: "bold", color: "white", fontSize: "13px" }}>{c.case_number}</div>
                      <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>
                        {new Date(c.date_opened).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Title / report type */}
                    <div>
                      <div style={{ color: "white", fontSize: "13px" }}>{c.title || "Untitled"}</div>
                      {c.report_type && (
                        <div style={{ color: "#aaa", fontSize: "11px", marginTop: "2px" }}>{c.report_type}</div>
                      )}
                    </div>

                    {/* Priority */}
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: priorityColor(c.priority) }}>
                      {c.priority}
                    </div>

                    {/* Status */}
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: statusColor(c.status) }}>
                      {c.status}
                    </div>

                    {/* Assigned to */}
                    <div style={{ fontSize: "12px", color: c.assigned_to === "Unassigned" ? "#555" : "#aaa" }}>
                      {c.assigned_to}
                    </div>

                    {/* Assign button / inline selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {assignTarget === c.case_id ? (
                        <>
                          <select
                            value={selectedInv}
                            onChange={(e) => setSelectedInv(e.target.value)}
                            style={{ padding: "5px 8px", borderRadius: "4px", border: "1px solid #444",
                              background: "#0f0f1a", color: "white", fontSize: "12px" }}
                          >
                            <option value="">Pick investigator...</option>
                            {investigators.map((inv) => (
                              <option key={inv.user_id} value={inv.user_id}>
                                {inv.first_name} {inv.last_name} ({inv.rank})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => submitAssign(c.case_id)}
                            disabled={!selectedInv}
                            style={{ padding: "5px 10px", background: "#00cc66", color: "#0f0f1a",
                              border: "none", borderRadius: "4px", cursor: "pointer",
                              fontWeight: "bold", fontSize: "12px", opacity: selectedInv ? 1 : 0.5 }}
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => { setAssignTarget(null); setSelectedInv(""); }}
                            style={{ padding: "5px 8px", background: "transparent", color: "#aaa",
                              border: "1px solid #444", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setAssignTarget(c.case_id); setSelectedInv(""); }}
                          style={{ padding: "5px 12px", background: "transparent", color: "#00d4ff",
                            border: "1px solid #00d4ff", borderRadius: "4px", cursor: "pointer",
                            fontSize: "12px", whiteSpace: "nowrap" }}
                        >
                          + Assign
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ ACCOUNT REQUESTS TAB ══════════ */}
      {activeTab === "Account Requests" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <h2 style={{ margin: 0 }}>Account Requests</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              {["Pending", "Approved", "Denied", "All"].map((f) => (
                <button key={f} onClick={() => setReqFilter(f)} style={{
                  padding: "5px 14px", borderRadius: "4px", border: "1px solid #333",
                  background: reqFilter === f ? "#00d4ff" : "transparent",
                  color: reqFilter === f ? "#0f0f1a" : "#aaa",
                  cursor: "pointer", fontWeight: reqFilter === f ? "bold" : "normal", fontSize: "13px",
                }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {reqMessage && (
            <div style={{ marginBottom: "12px", fontSize: "13px",
              color: reqMessage.startsWith("Error") ? "#ff4d4d" : "#00cc66" }}>
              {reqMessage}
            </div>
          )}

          {reqLoading ? (
            <p style={{ color: "#aaa" }}>Loading...</p>
          ) : requests.length === 0 ? (
            <p style={{ color: "#555", fontSize: "13px" }}>No {reqFilter.toLowerCase()} requests.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {requests.map((r) => (
                <div key={r.request_id} style={{
                  background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px",
                  padding: "18px 20px",
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto",
                  alignItems: "center", gap: "16px",
                }}>
                  <div>
                    <div style={{ fontWeight: "bold", color: "white", marginBottom: "4px" }}>
                      {r.first_name} {r.last_name}
                    </div>
                    <div style={{ color: "#aaa", fontSize: "12px" }}>{r.contact_email}</div>
                    {r.contact_phone && (
                      <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>{r.contact_phone}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#00d4ff", textTransform: "capitalize", marginBottom: "4px" }}>
                      {r.requested_role}
                    </div>
                    {r.requested_admin_level && (
                      <div style={{ fontSize: "11px", color: levelColor(r.requested_admin_level), marginBottom: "2px" }}>
                        Requested: {r.requested_admin_level}
                      </div>
                    )}
                    {r.badge_number && <div style={{ fontSize: "11px", color: "#aaa" }}>Badge: {r.badge_number}</div>}
                    {r.rank && <div style={{ fontSize: "11px", color: "#aaa" }}>Rank: {r.rank}</div>}
                    {r.department_id && (
                      <div style={{ fontSize: "11px", color: "#aaa" }}>
                        Dept: {departments.find((d) => d.department_id === r.department_id)?.name ?? r.department_id}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "bold",
                      color: reqStatusColor(r.status), marginBottom: "4px" }}>
                      {r.status}
                    </div>
                    <div style={{ fontSize: "11px", color: "#555" }}>
                      {new Date(r.requested_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {r.status === "Pending" && (
                      <>
                        <button onClick={() => decide(r.request_id, "approve")}
                          style={{ padding: "6px 14px", background: "#00cc66", color: "#0f0f1a",
                            border: "none", borderRadius: "4px", cursor: "pointer",
                            fontWeight: "bold", fontSize: "12px" }}>
                          Approve
                        </button>
                        <button onClick={() => decide(r.request_id, "deny")}
                          style={{ padding: "6px 14px", background: "transparent", color: "#ff4d4d",
                            border: "1px solid #ff4d4d", borderRadius: "4px", cursor: "pointer",
                            fontWeight: "bold", fontSize: "12px" }}>
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

      {/* ══════════ DEPARTMENTS TAB ══════════ */}
      {activeTab === "Departments" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
            <h2 style={{ margin: 0 }}>Departments</h2>
            <button onClick={() => setShowDeptForm((p) => !p)}
              style={{ padding: "5px 14px", background: showDeptForm ? "#333" : "#00d4ff",
                color: showDeptForm ? "#aaa" : "#0f0f1a", border: "none", borderRadius: "4px",
                cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>
              {showDeptForm ? "Cancel" : "+ Add Department"}
            </button>
          </div>

          {deptMessage && (
            <div style={{ marginBottom: "10px", fontSize: "13px",
              color: deptMessage.startsWith("Error") ? "#ff4d4d" : "#00cc66" }}>
              {deptMessage}
            </div>
          )}

          {showDeptForm && (
            <form onSubmit={submitDepartment} style={{
              background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px",
              padding: "18px 20px", marginBottom: "14px",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px",
            }}>
              <Field label="Department Name *">
                <input value={deptForm.name} onChange={setDept("name")} required style={inputStyle} />
              </Field>
              <Field label="Type *">
                <select value={deptForm.department_type} onChange={setDept("department_type")} required style={inputStyle}>
                  <option value="">Select type...</option>
                  {DEPT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Contact Email (optional)">
                <input type="email" value={deptForm.contact_email} onChange={setDept("contact_email")} style={inputStyle} />
              </Field>
              <Field label="Contact Phone (optional)">
                <input value={deptForm.contact_phone} onChange={setDept("contact_phone")} style={inputStyle} />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <button type="submit" style={{ padding: "8px 20px", background: "#00d4ff", color: "#0f0f1a",
                  border: "none", borderRadius: "4px", cursor: "pointer",
                  fontWeight: "bold", fontSize: "13px" }}>
                  Create Department
                </button>
              </div>
            </form>
          )}

          {departments.length === 0 ? (
            <p style={{ color: "#555", fontSize: "13px" }}>No departments yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {departments.map((d) => (
                <div key={d.department_id} style={{
                  background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px", padding: "10px 16px" }}>
                  <div style={{ color: "white", fontWeight: "bold", fontSize: "13px" }}>{d.name}</div>
                  <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>{d.department_type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ ADMIN MANAGEMENT TAB (SUPER_ADMIN only) ══════════ */}
      {activeTab === "Admin Management" && isSuperAdmin && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
            <h2 style={{ margin: 0 }}>Admin Accounts</h2>
            {adminMsg && (
              <span style={{ fontSize: "13px", color: adminMsg.startsWith("Error") ? "#ff4d4d" : "#00cc66" }}>
                {adminMsg}
              </span>
            )}
          </div>

          <div style={{ marginBottom: "12px", fontSize: "12px", color: "#555" }}>
            Level guide: SUPER_ADMIN → full control · ADMIN → operational · SUPERVISOR → reviewer · VIEWER → read-only
          </div>

          {admins.length === 0 ? (
            <p style={{ color: "#555", fontSize: "13px" }}>No admins found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {admins.map((a) => (
                <div key={a.user_id} style={{
                  background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px",
                  padding: "14px 18px", display: "grid",
                  gridTemplateColumns: "1fr 1fr 200px 120px", alignItems: "center", gap: "16px",
                }}>
                  <div>
                    <div style={{ fontWeight: "bold", color: "white", fontSize: "13px" }}>
                      {a.first_name} {a.last_name}
                      {a.user_id === user?.user_id && (
                        <span style={{ color: "#555", fontWeight: "normal", marginLeft: "8px", fontSize: "11px" }}>(you)</span>
                      )}
                    </div>
                    <div style={{ color: "#aaa", fontSize: "12px", marginTop: "2px" }}>{a.email}</div>
                  </div>

                  <div style={{ fontSize: "12px", fontWeight: "bold", color: levelColor(a.admin_level) }}>
                    {a.admin_level}
                  </div>

                  <select
                    value={levelChanges[a.user_id] ?? a.admin_level}
                    onChange={(e) => setLevelChanges((p) => ({ ...p, [a.user_id]: e.target.value }))}
                    disabled={a.user_id === user?.user_id}
                    style={{ ...inputStyle, opacity: a.user_id === user?.user_id ? 0.4 : 1 }}
                  >
                    {ADMIN_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>

                  <button
                    onClick={() => submitLevelChange(a.user_id)}
                    disabled={a.user_id === user?.user_id || !levelChanges[a.user_id] || levelChanges[a.user_id] === a.admin_level}
                    style={{ padding: "7px 14px", background: "#00d4ff", color: "#0f0f1a",
                      border: "none", borderRadius: "4px", cursor: "pointer",
                      fontWeight: "bold", fontSize: "12px",
                      opacity: (a.user_id === user?.user_id || !levelChanges[a.user_id] || levelChanges[a.user_id] === a.admin_level) ? 0.4 : 1 }}
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
      <label style={{ fontSize: "11px", color: "#666", textTransform: "uppercase",
        letterSpacing: "0.06em", display: "block", marginBottom: "5px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: "4px",
  border: "1px solid #444", background: "#0f0f1a",
  color: "white", fontSize: "13px", boxSizing: "border-box",
};

export default AdminPage;
