import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const statusColor = (s) =>
  s === "Approved" ? "#00cc66" : s === "Denied" ? "#ff4d4d" : "#ffaa00";

const DEPT_TYPES = [
  "Homicide", "Narcotics", "Cyber Crimes", "Financial Crimes",
  "Forensics", "Patrol", "Internal Affairs", "Administration", "Other",
];

function AdminPage() {
  const { token } = useAuth();

  //Account requests
  const [requests, setRequests] = useState([]);
  const [filter, setFilter]     = useState("Pending");
  const [reqLoading, setReqLoading] = useState(true);
  const [reqMessage, setReqMessage] = useState("");

  //Departments
  const [departments, setDepartments]   = useState([]);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptForm, setDeptForm]         = useState({ name: "", department_type: "", contact_email: "", contact_phone: "" });
  const [deptMessage, setDeptMessage]   = useState("");

  useEffect(() => { fetchRequests(); }, [filter]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDepartments(); }, []);

  //Fetchers
  const fetchRequests = async () => {
    setReqLoading(true);
    const url = filter === "All"
      ? "http://127.0.0.1:8000/admin/account-requests"
      : `http://127.0.0.1:8000/admin/account-requests?status_filter=${filter}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRequests(await res.json());
    setReqLoading(false);
  };

  const fetchDepartments = async () => {
    const res = await fetch("http://127.0.0.1:8000/departments");
    if (res.ok) setDepartments(await res.json());
  };

  //Account request actions
  const decide = async (requestId, action) => {
    const res = await fetch(`http://127.0.0.1:8000/admin/account-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) {
      setReqMessage(data.message);
      setTimeout(() => setReqMessage(""), 4000);
      fetchRequests();
    } else {
      setReqMessage(`Error: ${data.detail}`);
      setTimeout(() => setReqMessage(""), 6000);
    }
  };

  //Department create
  const setDept = (field) => (e) => setDeptForm((p) => ({ ...p, [field]: e.target.value }));

  const submitDepartment = async (e) => {
    e.preventDefault();
    const res = await fetch("http://127.0.0.1:8000/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(deptForm),
    });
    const data = await res.json();
    if (res.ok) {
      setDeptMessage(`Department "${data.name}" created.`);
      setDeptForm({ name: "", department_type: "", contact_email: "", contact_phone: "" });
      setShowDeptForm(false);
      fetchDepartments();
      setTimeout(() => setDeptMessage(""), 4000);
    } else {
      setDeptMessage(`Error: ${data.detail}`);
    }
  };

  //Render
  return (
    <div>
      <h1 style={{ marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "10px" }}>
        Admin Portal
      </h1>

      {/* ══════════ DEPARTMENTS ══════════ */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
          <h2 style={{ margin: 0 }}>Departments</h2>
          <button
            onClick={() => setShowDeptForm((p) => !p)}
            style={{ padding: "5px 14px", background: showDeptForm ? "#333" : "#00d4ff",
              color: showDeptForm ? "#aaa" : "#0f0f1a", border: "none", borderRadius: "4px",
              cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
          >
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
              <button type="submit" style={{
                padding: "8px 20px", background: "#00d4ff", color: "#0f0f1a",
                border: "none", borderRadius: "4px", cursor: "pointer",
                fontWeight: "bold", fontSize: "13px",
              }}>
                Create Department
              </button>
            </div>
          </form>
        )}

        {departments.length === 0 ? (
          <p style={{ color: "#555", fontSize: "13px" }}>No departments yet. Add one above.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {departments.map((d) => (
              <div key={d.department_id} style={{
                background: "#1a1a2e", border: "1px solid #333", borderRadius: "6px",
                padding: "10px 16px",
              }}>
                <div style={{ color: "white", fontWeight: "bold", fontSize: "13px" }}>{d.name}</div>
                <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>{d.department_type}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ ACCOUNT REQUESTS ══════════ */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>Account Requests</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            {["Pending", "Approved", "Denied", "All"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 14px", borderRadius: "4px", border: "1px solid #333",
                  background: filter === f ? "#00d4ff" : "transparent",
                  color: filter === f ? "#0f0f1a" : "#aaa",
                  cursor: "pointer", fontWeight: filter === f ? "bold" : "normal", fontSize: "13px",
                }}
              >
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
          <p style={{ color: "#555", fontSize: "13px" }}>No {filter.toLowerCase()} requests.</p>
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
                    color: statusColor(r.status), marginBottom: "4px" }}>
                    {r.status}
                  </div>
                  <div style={{ fontSize: "11px", color: "#555" }}>
                    {new Date(r.requested_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {r.status === "Pending" && (
                    <>
                      <button
                        onClick={() => decide(r.request_id, "approve")}
                        style={{ padding: "6px 14px", background: "#00cc66", color: "#0f0f1a",
                          border: "none", borderRadius: "4px", cursor: "pointer",
                          fontWeight: "bold", fontSize: "12px" }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => decide(r.request_id, "deny")}
                        style={{ padding: "6px 14px", background: "transparent", color: "#ff4d4d",
                          border: "1px solid #ff4d4d", borderRadius: "4px", cursor: "pointer",
                          fontWeight: "bold", fontSize: "12px" }}
                      >
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
