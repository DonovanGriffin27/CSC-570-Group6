// Authored by James Williams in collaboration with Claude
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";

const HEARING_TYPES = [
  "Arraignment", "Bail Hearing", "Preliminary Hearing",
  "Pre-Trial Conference", "Motion Hearing", "Trial",
  "Sentencing", "Appeal", "Other",
];

const hearingColor = (t) =>
  t === "Trial"        ? "#f87171"
  : t === "Sentencing" ? "#f59e0b"
  : t === "Arraignment"? "#60a5fa"
  : t === "Appeal"     ? "#a78bfa"
  : "#8b9ab4";

function CourtDatesPanel({ caseId }) {
  const { token } = useAuth();
  const [dates, setDates]         = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ date: "", court: "", hearing_type: "Arraignment" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  const authH = { Authorization: `Bearer ${token}` };
  const jsonH = { "Content-Type": "application/json", ...authH };

  const fetchDates = async () => {
    const res = await fetch(`${API}/cases/${caseId}/court-dates`, { headers: authH });
    if (res.ok) setDates(await res.json());
  };

  useEffect(() => { fetchDates(); }, [caseId]); // eslint-disable-line

  const closeModal = () => { setShowModal(false); setError(""); };

  const submit = async () => {
    if (!form.date || !form.court.trim()) return;
    setSubmitting(true);
    setError("");
    const res = await fetch(`${API}/cases/${caseId}/court-dates`, {
      method: "POST", headers: jsonH, body: JSON.stringify(form),
    });
    if (res.ok) {
      closeModal();
      setForm({ date: "", court: "", hearing_type: "Arraignment" });
      fetchDates();
    } else {
      const d = await res.json();
      setError(d.detail || "Failed to schedule.");
    }
    setSubmitting(false);
  };

  const remove = async (courtDateId) => {
    await fetch(`${API}/cases/${caseId}/court-dates/${courtDateId}`, {
      method: "DELETE", headers: authH,
    });
    fetchDates();
  };

  const now = new Date();
  const upcoming = dates.filter((d) => new Date(d.date) >= now);
  const past     = dates.filter((d) => new Date(d.date) <  now);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h3 style={{
          margin: 0, fontSize: "11px", fontWeight: "600",
          color: "var(--cv-text2)", textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          Court / Legal
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="cv-btn cv-btn-ghost"
          style={{ padding: "3px 10px", fontSize: "12px" }}
        >
          + Schedule
        </button>
      </div>

      {dates.length === 0 ? (
        <p style={{ color: "var(--cv-text3)", fontSize: "13px", margin: 0 }}>
          No court dates scheduled.
        </p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{
                fontSize: "10px", color: "var(--cv-text3)", textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: "6px",
              }}>
                Upcoming ({upcoming.length})
              </div>
              {upcoming.map((d) => <DateRow key={d.court_date_id} d={d} onRemove={remove} now={now} />)}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{
                fontSize: "10px", color: "var(--cv-text3)", textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: "6px",
              }}>
                Past ({past.length})
              </div>
              {past.map((d) => <DateRow key={d.court_date_id} d={d} onRemove={remove} now={now} />)}
            </div>
          )}
        </>
      )}

      {showModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
          }}
        >
          <div style={{
            background: "var(--cv-surface)", border: "1px solid var(--cv-border2)",
            borderRadius: "8px", padding: "24px", width: "400px", maxWidth: "90vw",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--cv-text)" }}>
                Schedule Court Date
              </div>
              <button onClick={closeModal} className="cv-btn cv-btn-secondary" style={{ padding: "3px 9px", fontSize: "13px" }}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <ModalField label="Hearing Type">
                <select
                  value={form.hearing_type}
                  onChange={(e) => setForm((p) => ({ ...p, hearing_type: e.target.value }))}
                  className="cv-input"
                >
                  {HEARING_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </ModalField>

              <ModalField label="Court / Venue *">
                <input
                  value={form.court}
                  onChange={(e) => setForm((p) => ({ ...p, court: e.target.value }))}
                  placeholder="e.g. Superior Court of Los Angeles"
                  className="cv-input"
                  autoFocus
                />
              </ModalField>

              <ModalField label="Date & Time *">
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="cv-input"
                />
              </ModalField>

              {error && (
                <div style={{ fontSize: "12px", color: "#f87171" }}>{error}</div>
              )}

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  onClick={submit}
                  disabled={!form.date || !form.court.trim() || submitting}
                  className="cv-btn cv-btn-primary"
                  style={{ flex: 1, padding: "8px" }}
                >
                  {submitting ? "Saving..." : "Schedule"}
                </button>
                <button onClick={closeModal} className="cv-btn cv-btn-secondary" style={{ padding: "8px 14px" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DateRow({ d, onRemove, now }) {
  const [confirming, setConfirming] = useState(false);
  const dt     = new Date(d.date);
  const isPast = dt < now;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "9px 12px", marginBottom: "6px", borderRadius: "5px",
      background: isPast ? "transparent" : "var(--cv-blue-bg)",
      border: `1px solid ${isPast ? "var(--cv-border)" : "var(--cv-border2)"}`,
      opacity: isPast ? 0.7 : 1,
    }}>
      <span style={{
        fontSize: "10px", fontWeight: "600", padding: "2px 7px", borderRadius: "3px",
        background: `${hearingColor(d.hearing_type)}18`,
        color: hearingColor(d.hearing_type),
        border: `1px solid ${hearingColor(d.hearing_type)}40`,
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        {d.hearing_type || "Court Date"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", color: "var(--cv-text)", fontWeight: "500" }}>
          {d.court}
        </div>
        <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginTop: "1px" }}>
          {dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      {!isPast && (
        <span style={{
          fontSize: "10px", color: "#34d399", fontWeight: "600",
          background: "rgba(52,211,153,0.08)", padding: "2px 6px",
          borderRadius: "3px", flexShrink: 0,
        }}>
          Upcoming
        </span>
      )}
      {confirming ? (
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <button
            onClick={() => { onRemove(d.court_date_id); setConfirming(false); }}
            style={{
              fontSize: "10px", padding: "2px 7px", borderRadius: "3px",
              background: "rgba(248,113,113,0.12)", color: "#f87171",
              border: "1px solid rgba(248,113,113,0.3)", cursor: "pointer",
            }}
          >
            Remove
          </button>
          <button
            onClick={() => setConfirming(false)}
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
          onClick={() => setConfirming(true)}
          style={{
            background: "none", border: "none", color: "var(--cv-text3)",
            cursor: "pointer", fontSize: "14px", padding: "2px 4px",
            lineHeight: 1, flexShrink: 0,
          }}
          title="Remove"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ModalField({ label, children }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: "11px", fontWeight: "600",
        color: "var(--cv-text2)", textTransform: "uppercase",
        letterSpacing: "0.07em", marginBottom: "5px",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default CourtDatesPanel;
