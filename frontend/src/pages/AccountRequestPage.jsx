import { useState, useEffect } from "react";

const ROLES = ["investigator", "admin"];

const RANKS = [
  'OFFICER',
  'DETECTIVE',
  'SERGEANT',
  'LIEUTENANT',
  'CAPTAIN',
  'CHIEF'
];

function AccountRequestPage({ onBack }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    contact_email: "",
    contact_phone: "",
    department_id: "",
    requested_role: "investigator",
    badge_number: "",
    rank: "",
    password: "",
    confirm_password: "",
  });
  const [departments, setDepartments] = useState([]);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/departments")
      .then((r) => r.json())
      .then(setDepartments)
      .catch(() => {});
  }, []);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const isInvestigator = form.requested_role === "investigator";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.department_id) {
      setError("Please select a department.");
      return;
    }
    if (isInvestigator && !form.badge_number.trim()) {
      setError("Badge number is required for investigators.");
      return;
    }
    if (isInvestigator && !form.rank.trim()) {
      setError("Rank is required for investigators.");
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        department_id: parseInt(form.department_id),
        requested_role: form.requested_role,
        badge_number: form.badge_number || null,
        rank: form.rank || null,
        password: form.password,
      };

      const res = await fetch("http://127.0.0.1:8000/auth/request-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Submission failed.");
        return;
      }

      setSuccess("Your request has been submitted! An admin will review it and contact you.");
    } catch {
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{
        background: "#1a1a2e",
        border: "1px solid #333",
        borderRadius: "8px",
        padding: "40px",
        width: "100%",
        maxWidth: "500px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <span onClick={onBack} style={{ color: "#aaa", cursor: "pointer", fontSize: "13px" }}>
            ← Back to Login
          </span>
          <div style={{ flex: 1, textAlign: "right", fontSize: "20px", fontWeight: "bold", color: "white" }}>
            Request Access
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>✓</div>
            <div style={{ color: "#00cc66", fontSize: "15px", marginBottom: "8px" }}>{success}</div>
            <button onClick={onBack} style={btnStyle}>Back to Login</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Name */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="First Name *">
                <input value={form.first_name} onChange={set("first_name")} required style={inputStyle} />
              </Field>
              <Field label="Last Name *">
                <input value={form.last_name} onChange={set("last_name")} required style={inputStyle} />
              </Field>
            </div>

            <Field label="Email *">
              <input type="email" value={form.contact_email} onChange={set("contact_email")} required style={inputStyle} />
            </Field>

            <Field label="Phone (optional)">
              <input value={form.contact_phone} onChange={set("contact_phone")} style={inputStyle} />
            </Field>

            {/* Role + Department */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Role *">
                <select value={form.requested_role} onChange={set("requested_role")} style={inputStyle}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Department *">
                <select value={form.department_id} onChange={set("department_id")} required style={inputStyle}>
                  <option value="">Select...</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>{d.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Badge + Rank — required for investigators */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label={`Badge Number${isInvestigator ? " *" : " (optional)"}`}>
                <input
                  value={form.badge_number}
                  onChange={set("badge_number")}
                  required={isInvestigator}
                  style={inputStyle}
                />
              </Field>
              <Field label={`Rank${isInvestigator ? " *" : " (optional)"}`}>
                <select
                  value={form.rank}
                  onChange={set("rank")}
                  required={isInvestigator}
                  style={inputStyle}
                >
                  <option value="">Select rank...</option>
                  {RANKS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Password *">
              <input type="password" value={form.password} onChange={set("password")} required style={inputStyle} />
            </Field>

            <Field label="Confirm Password *">
              <input
                type="password"
                value={form.confirm_password}
                onChange={set("confirm_password")}
                required
                style={{
                  ...inputStyle,
                  borderColor: form.confirm_password && form.confirm_password !== form.password
                    ? "#ff4d4d"
                    : form.confirm_password && form.confirm_password === form.password
                    ? "#00cc66"
                    : "#444",
                }}
              />
              {form.confirm_password && form.confirm_password !== form.password && (
                <div style={{ color: "#ff4d4d", fontSize: "11px", marginTop: "4px" }}>
                  Passwords do not match
                </div>
              )}
              {form.confirm_password && form.confirm_password === form.password && (
                <div style={{ color: "#00cc66", fontSize: "11px", marginTop: "4px" }}>
                  Passwords match
                </div>
              )}
            </Field>

            {error && <div style={{ color: "#ff4d4d", fontSize: "13px" }}>{error}</div>}

            <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
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
  width: "100%",
  padding: "9px 10px",
  borderRadius: "4px",
  border: "1px solid #444",
  background: "#0f0f1a",
  color: "white",
  fontSize: "13px",
  boxSizing: "border-box",
};

const btnStyle = {
  padding: "10px",
  background: "#00d4ff",
  color: "#0f0f1a",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
  width: "100%",
};

export default AccountRequestPage;
