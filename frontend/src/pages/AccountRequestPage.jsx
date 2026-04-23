import { useState, useEffect } from "react";

const ROLES = ["investigator", "admin"];

const RANKS = ["OFFICER", "DETECTIVE", "SERGEANT", "LIEUTENANT", "CAPTAIN", "CHIEF"];

const ADMIN_LEVELS = [
  { value: "ADMIN",      label: "Admin — operational management" },
  { value: "SUPERVISOR", label: "Supervisor — review & limited interaction" },
  { value: "VIEWER",     label: "Viewer — read-only access" },
];

function AccountRequestPage({ onBack }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", contact_email: "", contact_phone: "",
    department_id: "", requested_role: "investigator", requested_admin_level: "ADMIN",
    badge_number: "", rank: "", password: "", confirm_password: "",
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
  const isAdmin = form.requested_role === "admin";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.department_id) { setError("Please select a department."); return; }
    if (isInvestigator && !form.badge_number.trim()) { setError("Badge number is required."); return; }
    if (isInvestigator && !form.rank.trim()) { setError("Rank is required."); return; }
    if (form.password !== form.confirm_password) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const payload = {
        first_name: form.first_name, last_name: form.last_name,
        contact_email: form.contact_email, contact_phone: form.contact_phone || null,
        department_id: parseInt(form.department_id),
        requested_role: form.requested_role,
        requested_admin_level: isAdmin ? form.requested_admin_level : null,
        badge_number: isInvestigator ? (form.badge_number || null) : null,
        rank: isInvestigator ? (form.rank || null) : null,
        password: form.password,
      };
      const res = await fetch("http://127.0.0.1:8000/auth/request-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Submission failed."); return; }
      setSuccess("Your request has been submitted. An admin will review it and contact you.");
    } catch {
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── Left panel ── */}
      <div style={{
        width: "42%", flexShrink: 0, background: "var(--cv-surface)",
        borderRight: "1px solid var(--cv-border)", display: "flex",
        flexDirection: "column", justifyContent: "space-between", padding: "48px 52px",
        backgroundImage: "radial-gradient(circle, rgba(59,130,246,0.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: "700", letterSpacing: "0.1em",
            color: "var(--cv-text)", textTransform: "uppercase" }}>
            CaseVault
          </div>
          <div style={{ fontSize: "12px", color: "var(--cv-text3)", marginTop: "4px" }}>
            Case Management System
          </div>
        </div>

        <div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--cv-text)",
            lineHeight: "1.3", marginBottom: "14px" }}>
            Request system access
          </div>
          <div style={{ fontSize: "13px", color: "var(--cv-text2)", lineHeight: "1.7", maxWidth: "300px" }}>
            All account requests are reviewed by an administrator before access is granted.
            You will be contacted at the email address you provide.
          </div>
        </div>

        <div>
          <button onClick={onBack} className="cv-btn cv-btn-secondary">
            Back to Sign In
          </button>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1, background: "var(--cv-base)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflowY: "auto", padding: "48px 40px",
      }}>
        <div style={{ width: "100%", maxWidth: "480px" }}>

          {success ? (
            <div style={{
              textAlign: "center", padding: "48px 0",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
            }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", color: "#34d399",
              }}>
                ✓
              </div>
              <div>
                <div style={{ fontWeight: "600", color: "var(--cv-text)", fontSize: "16px", marginBottom: "8px" }}>
                  Request Submitted
                </div>
                <div style={{ color: "var(--cv-text2)", fontSize: "13px", maxWidth: "320px" }}>
                  {success}
                </div>
              </div>
              <button onClick={onBack} className="cv-btn cv-btn-primary" style={{ padding: "9px 24px" }}>
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "28px" }}>
                <h2 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: "700", color: "var(--cv-text)" }}>
                  Request Access
                </h2>
                <div style={{ fontSize: "13px", color: "var(--cv-text3)" }}>
                  Fill out the form below and an administrator will review your request.
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field label="First Name *">
                    <input value={form.first_name} onChange={set("first_name")} required className="cv-input" />
                  </Field>
                  <Field label="Last Name *">
                    <input value={form.last_name} onChange={set("last_name")} required className="cv-input" />
                  </Field>
                </div>

                <Field label="Email Address *">
                  <input type="email" value={form.contact_email} onChange={set("contact_email")} required className="cv-input" placeholder="name@department.gov" />
                </Field>

                <Field label="Phone (optional)">
                  <input value={form.contact_phone} onChange={set("contact_phone")} className="cv-input" placeholder="(555) 000-0000" />
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field label="Role *">
                    <select value={form.requested_role} onChange={set("requested_role")} className="cv-input">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Department *">
                    <select value={form.department_id} onChange={set("department_id")} required className="cv-input">
                      <option value="">Select...</option>
                      {departments.map((d) => (
                        <option key={d.department_id} value={d.department_id}>{d.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {isAdmin && (
                  <Field label="Requested Access Level *">
                    <select value={form.requested_admin_level} onChange={set("requested_admin_level")} required className="cv-input">
                      {ADMIN_LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginTop: "5px" }}>
                      Super Admin access can only be granted by an existing Super Admin after approval.
                    </div>
                  </Field>
                )}

                {isInvestigator && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <Field label="Badge Number *">
                      <input value={form.badge_number} onChange={set("badge_number")} required className="cv-input" />
                    </Field>
                    <Field label="Rank *">
                      <select value={form.rank} onChange={set("rank")} required className="cv-input">
                        <option value="">Select rank...</option>
                        {RANKS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </Field>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field label="Password *">
                    <input type="password" value={form.password} onChange={set("password")} required className="cv-input" placeholder="Min. 8 characters" />
                  </Field>
                  <Field label="Confirm Password *">
                    <input
                      type="password"
                      value={form.confirm_password}
                      onChange={set("confirm_password")}
                      required
                      className="cv-input"
                      style={{
                        borderColor: form.confirm_password
                          ? form.confirm_password !== form.password ? "#f87171" : "#34d399"
                          : undefined,
                      }}
                    />
                    {form.confirm_password && form.confirm_password !== form.password && (
                      <div style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>Passwords do not match</div>
                    )}
                    {form.confirm_password && form.confirm_password === form.password && (
                      <div style={{ fontSize: "11px", color: "#34d399", marginTop: "4px" }}>Passwords match</div>
                    )}
                  </Field>
                </div>

                {error && (
                  <div style={{
                    padding: "9px 12px", borderRadius: "4px",
                    background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)",
                    color: "#f87171", fontSize: "13px",
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="cv-btn cv-btn-primary"
                  style={{ padding: "10px", fontSize: "14px", marginTop: "4px" }}
                >
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
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

export default AccountRequestPage;
