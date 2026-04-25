// Authored by James Williams in collaboration with Claude
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";

const SUSPECT_STATUSES = ["Active", "Cleared", "Arrested"];
const RISK_LEVELS      = ["Low", "Medium", "High"];

const suspectStatusColor = (s) => ({
  Active:   "#f59e0b",
  Cleared:  "#34d399",
  Arrested: "#f87171",
}[s] || "#8b9ab4");

const riskColor = (r) => ({
  Low:    "#34d399",
  Medium: "#f59e0b",
  High:   "#f87171",
}[r] || "#8b9ab4");

function Badge({ value, color }) {
  return (
    <span style={{
      fontSize: "10px", fontWeight: "600", padding: "2px 7px", borderRadius: "3px",
      background: `${color}18`, color, border: `1px solid ${color}30`, whiteSpace: "nowrap",
    }}>
      {value}
    </span>
  );
}

function formatDob(dob) {
  if (!dob) return null;
  return new Date(dob).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function defaultForm() {
  return {
    role: "suspect", first_name: "", last_name: "",
    dob: "", contact_phone: "",
    status: "Active", risk_level: "Low",
  };
}

function PeoplePanel({ caseId }) {
  const { token } = useAuth();
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [suspects, setSuspects] = useState([]);
  const [victims, setVictims]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(defaultForm());
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => { fetchPeople(); }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPeople = async () => {
    setLoading(true);
    const r = await fetch(`${API}/cases/${caseId}/people`, { headers: authHeaders });
    setLoading(false);
    if (r.ok) {
      const data = await r.json();
      setSuspects(data.suspects || []);
      setVictims(data.victims   || []);
    }
  };

  const openModal = () => { setForm(defaultForm()); setError(""); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setError(""); };

  const submit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    setError("");
    const body = {
      role:          form.role,
      first_name:    form.first_name.trim(),
      last_name:     form.last_name.trim(),
      dob:           form.dob     || null,
      contact_phone: form.contact_phone || null,
      status:        form.status,
      risk_level:    form.risk_level,
    };
    const r = await fetch(`${API}/cases/${caseId}/people`, {
      method: "POST", headers: authHeaders, body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) {
      closeModal();
      fetchPeople();
    } else {
      const data = await r.json().catch(() => ({}));
      setError(data.detail || "Failed to add person.");
    }
  };

  const removeSuspect = async (personId) => {
    await fetch(`${API}/cases/${caseId}/suspects/${personId}`, {
      method: "DELETE", headers: authHeaders,
    });
    fetchPeople();
  };

  const removeVictim = async (personId) => {
    await fetch(`${API}/cases/${caseId}/victims/${personId}`, {
      method: "DELETE", headers: authHeaders,
    });
    fetchPeople();
  };

  const patchSuspect = async (personId, patch) => {
    await fetch(`${API}/cases/${caseId}/suspects/${personId}`, {
      method: "PATCH", headers: authHeaders, body: JSON.stringify(patch),
    });
    fetchPeople();
  };

  const totalCount = suspects.length + victims.length;

  return (
    <>
      <div style={{
        background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
        borderRadius: "6px", padding: "18px 20px", marginBottom: "14px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "11px", fontWeight: "600",
            color: "var(--cv-text2)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            People Involved
            {totalCount > 0 && (
              <span style={{ marginLeft: "8px", fontWeight: "normal", textTransform: "none",
                letterSpacing: "normal", fontSize: "12px", color: "var(--cv-text3)" }}>
                ({totalCount})
              </span>
            )}
          </h3>
          <button onClick={openModal} className="cv-btn cv-btn-primary"
            style={{ padding: "4px 12px", fontSize: "12px" }}>
            + Add Person
          </button>
        </div>

        {loading ? (
          <p style={{ color: "var(--cv-text3)", fontSize: "13px", margin: 0 }}>Loading...</p>
        ) : totalCount === 0 ? (
          <p style={{ color: "var(--cv-text3)", fontSize: "13px", margin: 0 }}>
            No people added to this case yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Suspects */}
            {suspects.length > 0 && (
              <div>
                <div style={{ fontSize: "10px", fontWeight: "600", color: "var(--cv-text3)",
                  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                  Suspects ({suspects.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {suspects.map((s) => (
                    <div key={s.person_id} style={{
                      background: "var(--cv-raised)", border: "1px solid var(--cv-border)",
                      borderRadius: "5px", padding: "11px 14px",
                      display: "flex", alignItems: "center", gap: "12px",
                    }}>
                      {/* Name + details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--cv-text)",
                          marginBottom: "4px" }}>
                          {s.first_name} {s.last_name}
                        </div>
                        <div style={{ display: "flex", gap: "10px", fontSize: "11px",
                          color: "var(--cv-text3)", flexWrap: "wrap" }}>
                          {s.dob && <span>DOB: {formatDob(s.dob)}</span>}
                          {s.contact_phone && <span>📞 {s.contact_phone}</span>}
                        </div>
                      </div>

                      {/* Status + risk dropdowns */}
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                        <select
                          value={s.status || "Active"}
                          onChange={(e) => patchSuspect(s.person_id, { status: e.target.value })}
                          style={{
                            fontSize: "10px", fontWeight: "600", padding: "2px 5px",
                            borderRadius: "3px", cursor: "pointer",
                            background: `${suspectStatusColor(s.status)}18`,
                            color: suspectStatusColor(s.status),
                            border: `1px solid ${suspectStatusColor(s.status)}40`,
                          }}
                        >
                          {SUSPECT_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                        <select
                          value={s.risk_level || "Low"}
                          onChange={(e) => patchSuspect(s.person_id, { risk_level: e.target.value })}
                          style={{
                            fontSize: "10px", fontWeight: "600", padding: "2px 5px",
                            borderRadius: "3px", cursor: "pointer",
                            background: `${riskColor(s.risk_level)}18`,
                            color: riskColor(s.risk_level),
                            border: `1px solid ${riskColor(s.risk_level)}40`,
                          }}
                        >
                          {RISK_LEVELS.map((r) => (
                            <option key={r} value={r}>{r} Risk</option>
                          ))}
                        </select>
                      </div>

                      {/* Remove */}
                      {confirmRemove === s.person_id ? (
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <button
                            onClick={() => { removeSuspect(s.person_id); setConfirmRemove(null); }}
                            style={{
                              fontSize: "10px", padding: "2px 7px", borderRadius: "3px",
                              background: "rgba(248,113,113,0.12)", color: "#f87171",
                              border: "1px solid rgba(248,113,113,0.3)", cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setConfirmRemove(null)}
                            style={{
                              fontSize: "10px", padding: "2px 7px", borderRadius: "3px",
                              background: "transparent", color: "var(--cv-text3)",
                              border: "1px solid var(--cv-border)", cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(s.person_id)}
                          title="Remove from case"
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--cv-text3)", fontSize: "14px", padding: "2px 4px",
                            lineHeight: 1, flexShrink: 0,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Victims */}
            {victims.length > 0 && (
              <div>
                <div style={{ fontSize: "10px", fontWeight: "600", color: "var(--cv-text3)",
                  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                  Victims ({victims.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {victims.map((v) => (
                    <div key={v.person_id} style={{
                      background: "var(--cv-raised)", border: "1px solid var(--cv-border)",
                      borderRadius: "5px", padding: "11px 14px",
                      display: "flex", alignItems: "center", gap: "12px",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--cv-text)",
                          marginBottom: "4px" }}>
                          {v.first_name} {v.last_name}
                        </div>
                        <div style={{ display: "flex", gap: "10px", fontSize: "11px",
                          color: "var(--cv-text3)", flexWrap: "wrap" }}>
                          {v.dob && <span>DOB: {formatDob(v.dob)}</span>}
                          {v.contact_phone && <span>📞 {v.contact_phone}</span>}
                        </div>
                      </div>
                      <Badge value="Victim" color="#60a5fa" />
                      {confirmRemove === v.person_id ? (
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <button
                            onClick={() => { removeVictim(v.person_id); setConfirmRemove(null); }}
                            style={{
                              fontSize: "10px", padding: "2px 7px", borderRadius: "3px",
                              background: "rgba(248,113,113,0.12)", color: "#f87171",
                              border: "1px solid rgba(248,113,113,0.3)", cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setConfirmRemove(null)}
                            style={{
                              fontSize: "10px", padding: "2px 7px", borderRadius: "3px",
                              background: "transparent", color: "var(--cv-text3)",
                              border: "1px solid var(--cv-border)", cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(v.person_id)}
                          title="Remove from case"
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--cv-text3)", fontSize: "14px", padding: "2px 4px",
                            lineHeight: 1, flexShrink: 0,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Person Modal ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
            borderRadius: "8px", padding: "28px", width: "460px", maxWidth: "95vw",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "22px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--cv-text)" }}>
                Add Person to Case
              </h3>
              <button onClick={closeModal} className="cv-btn cv-btn-ghost"
                style={{ padding: "4px 10px", fontSize: "12px" }}>✕</button>
            </div>

            {/* Role toggle */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginBottom: "8px",
                textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Role *
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {["suspect", "victim"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    style={{
                      padding: "6px 18px", borderRadius: "4px", cursor: "pointer",
                      fontSize: "12px", fontWeight: "600", textTransform: "capitalize",
                      border: `1px solid ${form.role === r ? "var(--cv-blue)" : "var(--cv-border)"}`,
                      background: form.role === r ? "var(--cv-blue-bg)" : "transparent",
                      color: form.role === r ? "var(--cv-blue)" : "var(--cv-text3)",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Name row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginBottom: "5px",
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>First Name *</div>
                <input value={form.first_name} className="cv-input"
                  placeholder="Jane"
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginBottom: "5px",
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>Last Name *</div>
                <input value={form.last_name} className="cv-input"
                  placeholder="Doe"
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>

            {/* DOB + Phone row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginBottom: "5px",
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>Date of Birth</div>
                <input type="date" value={form.dob} className="cv-input"
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginBottom: "5px",
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>Phone Number</div>
                <input value={form.contact_phone} className="cv-input"
                  placeholder="555-867-5309"
                  onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
              </div>
            </div>

            {/* Suspect-only fields */}
            {form.role === "suspect" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginBottom: "5px",
                    textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>
                  <select value={form.status} className="cv-input"
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {SUSPECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginBottom: "5px",
                    textTransform: "uppercase", letterSpacing: "0.06em" }}>Risk Level</div>
                  <select value={form.risk_level} className="cv-input"
                    onChange={(e) => setForm((f) => ({ ...f, risk_level: e.target.value }))}>
                    {RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            )}

            {error && (
              <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "12px" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={closeModal} className="cv-btn cv-btn-secondary"
                style={{ padding: "7px 16px" }}>Cancel</button>
              <button onClick={submit} disabled={saving}
                className="cv-btn cv-btn-primary" style={{ padding: "7px 22px" }}>
                {saving ? "Saving..." : "Add Person"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PeoplePanel;
