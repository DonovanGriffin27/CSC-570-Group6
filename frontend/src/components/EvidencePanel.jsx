// Authored by James Williams in collaboration with Claude
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";
import {
  EVIDENCE_TYPES, EVIDENCE_STATUSES, CONDITION_STATUSES,
  ACTIONS_FOR_STATUS, USER_ACTION_TO_INTERNAL, CUSTODY_ACTION_LABEL,
  typeColor, statusColor, actionColor,
} from "../constants/evidenceConstants";

const labelSt = {
  fontSize: "10px", color: "var(--cv-text3)", textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: "3px",
};
const valueSt = { fontSize: "13px", color: "var(--cv-text)" };

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

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "11px", color: "var(--cv-text3)", marginBottom: "5px",
        textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function defaultAddForm() {
  return {
    evidence_type: "Physical Item", description: "", current_status: "Collected",
    collection_location: "", condition_status: "Unknown",
    file_name: "", file_type: "", file_hash: "",
    metadata_tags: "", source_device: "", metadata_notes: "",
  };
}

function defaultCustodyForm() {
  return { action_type: "", location: "", condition_status: "", notes: "" };
}

// ── Evidence detail right panel ────────────────────────────────────────────

function EvidenceDetail({ detail, onAddCustody }) {
  const { evidence, metadata, custody_chain } = detail;

  return (
    <div>

      {/* Overview */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--cv-text2)",
          textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
          Evidence Overview
        </div>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div>
            <div style={labelSt}>ID</div>
            <div style={valueSt}>#{evidence.evidence_id}</div>
          </div>
          <div>
            <div style={labelSt}>Type</div>
            <Badge value={evidence.evidence_type} color={typeColor(evidence.evidence_type)} />
          </div>
          <div>
            <div style={labelSt}>Status</div>
            <Badge value={evidence.current_status} color={statusColor(evidence.current_status)} />
          </div>
          <div>
            <div style={labelSt}>Condition</div>
            <Badge value={evidence.condition_status} color="#8b9ab4" />
          </div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <div style={labelSt}>Description</div>
          <div style={{ ...valueSt, lineHeight: "1.6" }}>{evidence.description}</div>
        </div>

        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <div>
            <div style={labelSt}>Collected By</div>
            <div style={valueSt}>
              {evidence.collected_by_name || `User ${evidence.collected_by_user_id}`}
            </div>
          </div>
          {evidence.collection_location && (
            <div>
              <div style={labelSt}>Collection Location</div>
              <div style={valueSt}>{evidence.collection_location}</div>
            </div>
          )}
          <div>
            <div style={labelSt}>Intake Date</div>
            <div style={valueSt}>
              {evidence.intake_date ? new Date(evidence.intake_date).toLocaleString() : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata — only when at least one field is populated */}
      {metadata && (
        metadata.file_name || metadata.file_type || metadata.file_hash ||
        metadata.source_device || metadata.gps_location ||
        metadata.notes || metadata.metadata_tags?.length > 0
      ) ? (
        <>
          <div style={{ borderTop: "1px solid var(--cv-border)", margin: "4px 0 18px" }} />
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--cv-text2)",
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
              Digital Metadata
            </div>

            {(metadata.file_name || metadata.file_type) && (
              <div style={{ display: "flex", gap: "24px", marginBottom: "10px" }}>
                {metadata.file_name && (
                  <div>
                    <div style={labelSt}>File Name</div>
                    <div style={valueSt}>{metadata.file_name}</div>
                  </div>
                )}
                {metadata.file_type && (
                  <div>
                    <div style={labelSt}>File Type</div>
                    <div style={valueSt}>{metadata.file_type}</div>
                  </div>
                )}
              </div>
            )}

            {metadata.file_hash && (
              <div style={{ marginBottom: "10px" }}>
                <div style={labelSt}>File Hash</div>
                <code style={{
                  display: "block", marginTop: "4px", padding: "6px 10px",
                  background: "var(--cv-raised)", borderRadius: "4px",
                  fontSize: "11px", color: "var(--cv-text2)", wordBreak: "break-all",
                  border: "1px solid var(--cv-border)",
                }}>
                  {metadata.file_hash}
                </code>
              </div>
            )}

            {(metadata.source_device || metadata.gps_location) && (
              <div style={{ display: "flex", gap: "24px", marginBottom: "10px" }}>
                {metadata.source_device && (
                  <div>
                    <div style={labelSt}>Source Device</div>
                    <div style={valueSt}>{metadata.source_device}</div>
                  </div>
                )}
                {metadata.gps_location && (
                  <div>
                    <div style={labelSt}>GPS Location</div>
                    <div style={valueSt}>{metadata.gps_location}</div>
                  </div>
                )}
              </div>
            )}

            {metadata.metadata_tags?.length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <div style={labelSt}>Tags</div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                  {metadata.metadata_tags.map((tag, i) => (
                    <span key={i} style={{
                      fontSize: "10px", padding: "2px 7px", borderRadius: "3px",
                      background: "#60a5fa18", color: "#60a5fa", border: "1px solid #60a5fa30",
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {metadata.notes && (
              <div>
                <div style={labelSt}>Notes</div>
                <div style={{ ...valueSt, lineHeight: "1.6", fontStyle: "italic" }}>
                  {metadata.notes}
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Chain of Custody */}
      <div style={{ borderTop: "1px solid var(--cv-border)", margin: "4px 0 18px" }} />
      <div>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--cv-text2)",
            textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Chain of Custody
            <span style={{ fontWeight: "400", textTransform: "none", letterSpacing: "normal",
              color: "var(--cv-text3)", marginLeft: "6px", fontSize: "11px" }}>
              ({custody_chain.length} event{custody_chain.length !== 1 ? "s" : ""})
            </span>
          </div>
          <button onClick={onAddCustody} className="cv-btn cv-btn-ghost"
            style={{ padding: "3px 10px", fontSize: "11px" }}>
            + Log Event
          </button>
        </div>

        {custody_chain.length === 0 ? (
          <p style={{ color: "var(--cv-text3)", fontSize: "13px", margin: 0 }}>
            No custody events recorded.
          </p>
        ) : (
          custody_chain.map((ev, idx) => (
            <div key={ev.custody_event_id} style={{ display: "flex", gap: "10px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                width: "14px", flexShrink: 0, paddingTop: "5px" }}>
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  background: actionColor(ev.action_type), flexShrink: 0,
                }} />
                {idx < custody_chain.length - 1 && (
                  <div style={{
                    width: "2px", flex: 1, minHeight: "16px",
                    background: "var(--cv-border)", margin: "4px 0",
                  }} />
                )}
              </div>

              <div style={{
                flex: 1, background: "var(--cv-raised)", border: "1px solid var(--cv-border)",
                borderRadius: "4px", padding: "10px 12px",
                marginBottom: idx < custody_chain.length - 1 ? "0" : "4px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: "6px" }}>
                  <Badge
                    value={CUSTODY_ACTION_LABEL[ev.action_type] || ev.action_type.replace(/_/g, " ")}
                    color={actionColor(ev.action_type)}
                  />
                  <span style={{ fontSize: "10px", color: "var(--cv-text3)",
                    marginLeft: "8px", whiteSpace: "nowrap" }}>
                    {new Date(ev.time_stamp).toLocaleString()}
                  </span>
                </div>

                {(ev.from_user_name || ev.to_user_name) && (
                  <div style={{ fontSize: "12px", color: "var(--cv-text2)", marginBottom: "4px" }}>
                    {ev.from_user_name && (
                      <span style={{ fontWeight: "500" }}>{ev.from_user_name}</span>
                    )}
                    {ev.from_user_name && ev.to_user_name && (
                      <span style={{ color: "var(--cv-text3)", margin: "0 6px" }}>→</span>
                    )}
                    {ev.to_user_name && (
                      <span style={{ fontWeight: "500" }}>{ev.to_user_name}</span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--cv-text3)" }}>
                  {ev.location && <span>Location: {ev.location}</span>}
                  {ev.condition_status && <span>Condition: {ev.condition_status}</span>}
                </div>

                {ev.notes && (
                  <div style={{
                    fontSize: "12px", color: "var(--cv-text2)", marginTop: "6px",
                    paddingTop: "6px", borderTop: "1px solid var(--cv-border)",
                    fontStyle: "italic",
                  }}>
                    "{ev.notes}"
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main panel component ───────────────────────────────────────────────────

function EvidencePanel({ caseId, bodyMinHeight = "380px" }) {
  const { user, token } = useAuth();
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [list, setList]                   = useState([]);
  const [selectedId, setSelectedId]       = useState(null);
  const [detail, setDetail]               = useState(null);
  const [loading, setLoading]             = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState("All");

  const [showAddModal, setShowAddModal]   = useState(false);
  const [addForm, setAddForm]             = useState(defaultAddForm());
  const [addLoading, setAddLoading]       = useState(false);
  const [addError, setAddError]           = useState("");

  const [showCustodyModal, setShowCustodyModal] = useState(false);
  const [custodyForm, setCustodyForm]           = useState(defaultCustodyForm());
  const [custodyLoading, setCustodyLoading]     = useState(false);
  const [custodyError, setCustodyError]         = useState("");

  useEffect(() => { fetchList(); }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedId !== null) fetchDetail(selectedId);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchList = async () => {
    setLoading(true);
    const r = await fetch(`${API}/evidence/case/${caseId}`, { headers: authHeaders });
    setLoading(false);
    if (r.ok) setList(await r.json());
  };

  const fetchDetail = async (id) => {
    setDetailLoading(true);
    const r = await fetch(`${API}/evidence/${id}`, { headers: authHeaders });
    setDetailLoading(false);
    if (r.ok) setDetail(await r.json());
  };

  const handleSelect = (id) => {
    if (id === selectedId) return;
    setDetail(null);
    setSelectedId(id);
  };

  // Opens the custody modal with the first valid action pre-selected
  const openCustodyModal = () => {
    const status    = detail?.evidence?.current_status || "";
    const available = ACTIONS_FOR_STATUS[status] || [];
    setCustodyForm({ ...defaultCustodyForm(), action_type: available[0] || "" });
    setCustodyError("");
    setShowCustodyModal(true);
  };

  const submitEvidence = async () => {
    if (!addForm.description.trim()) { setAddError("Description is required."); return; }
    setAddLoading(true);
    setAddError("");
    const tags = addForm.metadata_tags
      ? addForm.metadata_tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    const body = {
      case_id:              caseId,
      evidence_type:        addForm.evidence_type,
      description:          addForm.description,
      current_status:       addForm.current_status,
      collected_by_user_id: user.user_id,
      collection_location:  addForm.collection_location || null,
      condition_status:     addForm.condition_status,
      file_name:            addForm.file_name      || null,
      file_type:            addForm.file_type      || null,
      file_hash:            addForm.file_hash      || null,
      metadata_tags:        tags,
      source_device:        addForm.source_device  || null,
      metadata_notes:       addForm.metadata_notes || null,
    };
    const r = await fetch(`${API}/evidence`, {
      method: "POST", headers: authHeaders, body: JSON.stringify(body),
    });
    setAddLoading(false);
    if (r.ok) {
      const data = await r.json();
      setShowAddModal(false);
      setAddForm(defaultAddForm());
      await fetchList();
      setSelectedId(data.evidence_id);
    } else {
      const data = await r.json().catch(() => ({}));
      setAddError(data.detail || "Failed to add evidence.");
    }
  };

  const submitCustodyEvent = async () => {
    const internalAction = USER_ACTION_TO_INTERNAL[custodyForm.action_type];
    if (!internalAction) { setCustodyError("Please select an action."); return; }
    setCustodyLoading(true);
    setCustodyError("");
    const body = {
      action_type:      internalAction,
      location:         custodyForm.location         || null,
      condition_status: custodyForm.condition_status || null,
      notes:            custodyForm.notes            || null,
    };
    const r = await fetch(`${API}/evidence/${selectedId}/custody`, {
      method: "POST", headers: authHeaders, body: JSON.stringify(body),
    });
    setCustodyLoading(false);
    if (r.ok) {
      setShowCustodyModal(false);
      setCustodyForm(defaultCustodyForm());
      // Refresh both the list (status badge) and the detail panel
      await fetchList();
      await fetchDetail(selectedId);
    } else {
      const data = await r.json().catch(() => ({}));
      setCustodyError(data.detail || "Failed to log custody event.");
    }
  };

  const filtered = list.filter((ev) => {
    const matchSearch = !search
      || ev.description?.toLowerCase().includes(search.toLowerCase())
      || ev.evidence_type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || ev.current_status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Compute available user-facing actions for the currently selected evidence
  const currentStatus    = detail?.evidence?.current_status || "";
  const availableActions = ACTIONS_FOR_STATUS[currentStatus] || [];
  const isTerminalStatus = currentStatus !== "" && availableActions.length === 0;

  return (
    <>
      <div style={{
        background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
        borderRadius: "6px", marginBottom: "14px", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px 12px", borderBottom: "1px solid var(--cv-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h3 style={{ margin: 0, fontSize: "11px", fontWeight: "600", color: "var(--cv-text2)",
            textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Evidence
            {list.length > 0 && (
              <span style={{ marginLeft: "8px", color: "var(--cv-text3)", fontWeight: "normal",
                textTransform: "none", letterSpacing: "normal", fontSize: "12px" }}>
                ({list.length})
              </span>
            )}
          </h3>
          <button onClick={() => setShowAddModal(true)} className="cv-btn cv-btn-primary"
            style={{ padding: "4px 12px", fontSize: "12px" }}>
            + Add Evidence
          </button>
        </div>

        {/* Two-column body */}
        <div style={{ display: "flex", minHeight: bodyMinHeight }}>

          {/* Left — list */}
          <div style={{
            width: "252px", flexShrink: 0, borderRight: "1px solid var(--cv-border)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid var(--cv-border)" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search type or description..."
                className="cv-input"
                style={{ fontSize: "12px", marginBottom: "8px" }}
              />
              <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                {["All", ...EVIDENCE_STATUSES].map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    fontSize: "10px", padding: "2px 6px", borderRadius: "3px", cursor: "pointer",
                    border: `1px solid ${filterStatus === s ? "var(--cv-blue)" : "var(--cv-border)"}`,
                    background: filterStatus === s ? "var(--cv-blue-bg)" : "transparent",
                    color: filterStatus === s ? "var(--cv-blue)" : "var(--cv-text3)",
                    fontWeight: filterStatus === s ? "600" : "normal",
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "16px 12px", color: "var(--cv-text3)", fontSize: "12px" }}>
                  Loading...
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "16px 12px", color: "var(--cv-text3)", fontSize: "12px" }}>
                  {list.length === 0
                    ? "No evidence on record for this case."
                    : "No results match your filter."}
                </div>
              ) : (
                filtered.map((ev) => (
                  <div
                    key={ev.evidence_id}
                    onClick={() => handleSelect(ev.evidence_id)}
                    className={selectedId === ev.evidence_id ? "cv-row cv-row-selected" : "cv-row"}
                    style={{
                      padding: "10px 12px", cursor: "pointer",
                      borderBottom: "1px solid var(--cv-border)",
                    }}
                  >
                    <div style={{ marginBottom: "4px" }}>
                      <Badge value={ev.evidence_type} color={typeColor(ev.evidence_type)} />
                    </div>
                    <div style={{
                      fontSize: "12px", color: "var(--cv-text)", marginBottom: "5px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {ev.description}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <Badge value={ev.current_status} color={statusColor(ev.current_status)} />
                      <span style={{ fontSize: "10px", color: "var(--cv-text3)" }}>
                        {new Date(ev.intake_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right — detail */}
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            {!selectedId ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100%", color: "var(--cv-text3)", fontSize: "13px",
              }}>
                Select an evidence item to view details.
              </div>
            ) : detailLoading ? (
              <div style={{ color: "var(--cv-text3)", fontSize: "13px" }}>Loading...</div>
            ) : detail ? (
              <EvidenceDetail detail={detail} onAddCustody={openCustodyModal} />
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Add Evidence Modal ──────────────────────────────────────────── */}
      {showAddModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
            borderRadius: "8px", padding: "28px", width: "560px", maxWidth: "95vw",
            maxHeight: "88vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "22px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--cv-text)" }}>
                Add Evidence
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setAddForm(defaultAddForm()); setAddError(""); }}
                className="cv-btn cv-btn-ghost" style={{ padding: "4px 10px", fontSize: "12px" }}>
                ✕
              </button>
            </div>

            <FormField label="Evidence Type *">
              <select value={addForm.evidence_type} className="cv-input"
                onChange={(e) => setAddForm((f) => ({ ...f, evidence_type: e.target.value }))}>
                {EVIDENCE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </FormField>

            <FormField label="Description *">
              <textarea value={addForm.description} rows={3} className="cv-input"
                style={{ resize: "vertical" }} placeholder="Describe the evidence..."
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <FormField label="Initial Status">
                <select value={addForm.current_status} className="cv-input"
                  onChange={(e) => setAddForm((f) => ({ ...f, current_status: e.target.value }))}>
                  {EVIDENCE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Condition">
                <select value={addForm.condition_status} className="cv-input"
                  onChange={(e) => setAddForm((f) => ({ ...f, condition_status: e.target.value }))}>
                  {CONDITION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </FormField>
            </div>

            <FormField label="Collection Location">
              <input value={addForm.collection_location} className="cv-input"
                placeholder="Scene address, lab, locker number..."
                onChange={(e) => setAddForm((f) => ({ ...f, collection_location: e.target.value }))} />
            </FormField>

            <div style={{ padding: "14px 0 2px", marginBottom: "4px",
              borderTop: "1px solid var(--cv-border)" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--cv-text3)",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                Digital / File Metadata (optional)
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormField label="File Name">
                  <input value={addForm.file_name} className="cv-input"
                    placeholder="evidence_photo.jpg"
                    onChange={(e) => setAddForm((f) => ({ ...f, file_name: e.target.value }))} />
                </FormField>
                <FormField label="File Type">
                  <input value={addForm.file_type} className="cv-input"
                    placeholder="image/jpeg"
                    onChange={(e) => setAddForm((f) => ({ ...f, file_type: e.target.value }))} />
                </FormField>
              </div>

              <FormField label="File Hash (SHA-256)">
                <input value={addForm.file_hash} className="cv-input"
                  placeholder="sha256:..."
                  style={{ fontFamily: "monospace", fontSize: "11px" }}
                  onChange={(e) => setAddForm((f) => ({ ...f, file_hash: e.target.value }))} />
              </FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormField label="Source Device">
                  <input value={addForm.source_device} className="cv-input"
                    placeholder="iPhone 15 Pro, CCTV cam 4..."
                    onChange={(e) => setAddForm((f) => ({ ...f, source_device: e.target.value }))} />
                </FormField>
                <FormField label="Tags (comma-separated)">
                  <input value={addForm.metadata_tags} className="cv-input"
                    placeholder="cctv, outdoor, night"
                    onChange={(e) => setAddForm((f) => ({ ...f, metadata_tags: e.target.value }))} />
                </FormField>
              </div>

              <FormField label="Metadata Notes">
                <textarea value={addForm.metadata_notes} rows={2} className="cv-input"
                  style={{ resize: "vertical" }} placeholder="Additional context..."
                  onChange={(e) => setAddForm((f) => ({ ...f, metadata_notes: e.target.value }))} />
              </FormField>
            </div>

            {addError && (
              <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "12px" }}>
                {addError}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                onClick={() => { setShowAddModal(false); setAddForm(defaultAddForm()); setAddError(""); }}
                className="cv-btn cv-btn-secondary" style={{ padding: "7px 16px" }}>
                Cancel
              </button>
              <button onClick={submitEvidence} disabled={addLoading}
                className="cv-btn cv-btn-primary" style={{ padding: "7px 22px" }}>
                {addLoading ? "Saving..." : "Add Evidence"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Custody Event Modal ─────────────────────────────────────── */}
      {showCustodyModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "var(--cv-surface)", border: "1px solid var(--cv-border)",
            borderRadius: "8px", padding: "28px", width: "440px", maxWidth: "95vw",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "22px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--cv-text)" }}>
                Log Custody Event
              </h3>
              <button
                onClick={() => { setShowCustodyModal(false); setCustodyForm(defaultCustodyForm()); setCustodyError(""); }}
                className="cv-btn cv-btn-ghost" style={{ padding: "4px 10px", fontSize: "12px" }}>
                ✕
              </button>
            </div>

            {isTerminalStatus ? (
              <div style={{ padding: "8px 0 16px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "var(--cv-text3)", marginBottom: "6px" }}>
                  No further custody actions are available.
                </div>
                <div style={{ fontSize: "11px", color: "var(--cv-text3)" }}>
                  Evidence with status{" "}
                  <strong style={{ color: "var(--cv-text2)" }}>{currentStatus}</strong>{" "}
                  has reached a terminal state.
                </div>
              </div>
            ) : (
              <>
                <FormField label="Action *">
                  <select value={custodyForm.action_type} className="cv-input"
                    onChange={(e) => setCustodyForm((f) => ({ ...f, action_type: e.target.value }))}>
                    {availableActions.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Location">
                  <input value={custodyForm.location} className="cv-input"
                    placeholder="Evidence locker B-12, Forensics Lab 3..."
                    onChange={(e) => setCustodyForm((f) => ({ ...f, location: e.target.value }))} />
                </FormField>

                <FormField label="Condition">
                  <select value={custodyForm.condition_status} className="cv-input"
                    onChange={(e) => setCustodyForm((f) => ({ ...f, condition_status: e.target.value }))}>
                    <option value="">— unchanged —</option>
                    {CONDITION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </FormField>

                <FormField label="Notes">
                  <textarea value={custodyForm.notes} rows={3} className="cv-input"
                    style={{ resize: "vertical" }}
                    placeholder="Transfer reason, analyst name, observations..."
                    onChange={(e) => setCustodyForm((f) => ({ ...f, notes: e.target.value }))} />
                </FormField>

                {custodyError && (
                  <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "12px" }}>
                    {custodyError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { setShowCustodyModal(false); setCustodyForm(defaultCustodyForm()); setCustodyError(""); }}
                    className="cv-btn cv-btn-secondary" style={{ padding: "7px 16px" }}>
                    Cancel
                  </button>
                  <button onClick={submitCustodyEvent} disabled={custodyLoading}
                    className="cv-btn cv-btn-primary" style={{ padding: "7px 22px" }}>
                    {custodyLoading ? "Saving..." : "Log Event"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default EvidencePanel;
