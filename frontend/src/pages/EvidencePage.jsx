// Authored by James Williams in collaboration with Claude
import { useState, useEffect, useRef } from "react";
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

function defaultCustodyForm() {
  return { action_type: "", location: "", condition_status: "", notes: "" };
}

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
  "image/jpeg", "image/png", "image/tiff", "image/bmp",
  "video/mp4", "video/quicktime", "video/x-msvideo",
  "audio/mpeg", "audio/wav",
]);

const MAX_FILE_BYTES = 50 * 1024 * 1024;

// ── Evidence detail panel ──────────────────────────────────────────────────

function PortalDetail({ detail, onAddCustody, fileProps }) {
  const { evidence, metadata, custody_chain } = detail;

  return (
    <div style={{ padding: "20px 24px" }}>

      {/* Case context pill */}
      <div style={{
        fontSize: "11px", color: "var(--cv-text3)", marginBottom: "16px",
        padding: "5px 10px", background: "var(--cv-raised)",
        border: "1px solid var(--cv-border)", borderRadius: "4px",
        display: "inline-flex", alignItems: "center", gap: "6px",
      }}>
        <span style={{ opacity: 0.6 }}>Case</span>
        <strong style={{ color: "var(--cv-text2)" }}>
          {evidence.case_number || `#${evidence.case_id}`}
        </strong>
        {evidence.case_title && (
          <span style={{ color: "var(--cv-text3)" }}>— {evidence.case_title}</span>
        )}
      </div>

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

      {/* Digital Metadata */}
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

      {/* Attached File */}
      <div style={{ borderTop: "1px solid var(--cv-border)", margin: "4px 0 18px" }} />
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--cv-text2)",
          textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
          Attached File
        </div>
        {metadata?.storage_path ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "var(--cv-text2)" }}>
              {metadata.file_name || "evidence-file"}
            </span>
            <button onClick={fileProps.onDownload} className="cv-btn cv-btn-ghost"
              style={{ padding: "3px 10px", fontSize: "11px" }}>
              Download
            </button>
          </div>
        ) : (
          <button onClick={fileProps.onUpload} disabled={fileProps.uploading}
            className="cv-btn cv-btn-secondary" style={{ padding: "4px 14px", fontSize: "12px" }}>
            {fileProps.uploading ? "Uploading..." : "+ Attach File"}
          </button>
        )}
        {fileProps.error && (
          <div style={{ color: "#f87171", fontSize: "12px", marginTop: "6px" }}>
            {fileProps.error}
          </div>
        )}
      </div>

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

// ── Main page ──────────────────────────────────────────────────────────────

function EvidencePage() {
  const { token } = useAuth();
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [allEvidence, setAllEvidence]       = useState([]);
  const [loading, setLoading]               = useState(true);

  const [search, setSearch]                 = useState("");
  const [filterType, setFilterType]         = useState("All");
  const [filterStatus, setFilterStatus]     = useState("All");

  const [selectedId, setSelectedId]         = useState(null);
  const [detail, setDetail]                 = useState(null);
  const [detailLoading, setDetailLoading]   = useState(false);

  const [showCustodyModal, setShowCustodyModal] = useState(false);
  const [custodyForm, setCustodyForm]           = useState(defaultCustodyForm());
  const [custodyLoading, setCustodyLoading]     = useState(false);
  const [custodyError, setCustodyError]         = useState("");

  const fileInputRef                    = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError]     = useState("");

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    setLoading(true);
    const r = await fetch(`${API}/evidence`, { headers: authHeaders });
    setLoading(false);
    if (r.ok) setAllEvidence(await r.json());
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
    fetchDetail(id);
  };

  // Opens the custody modal with the first valid action pre-selected
  const openCustodyModal = () => {
    const status    = detail?.evidence?.current_status || "";
    const available = ACTIONS_FOR_STATUS[status] || [];
    setCustodyForm({ ...defaultCustodyForm(), action_type: available[0] || "" });
    setCustodyError("");
    setShowCustodyModal(true);
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
      // Refresh the full list so the status badge updates, then refresh detail
      await fetchAll();
      await fetchDetail(selectedId);
    } else {
      const data = await r.json().catch(() => ({}));
      setCustodyError(data.detail || "Failed to log custody event.");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      setUploadError("File type not allowed. Accepted: PDF, Word, Excel, TXT, CSV, JPG, PNG, TIFF, BMP, MP4, MOV, AVI, MP3, WAV.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError("File exceeds the 50 MB size limit.");
      return;
    }

    setUploadLoading(true);
    setUploadError("");
    const formData = new FormData();
    formData.append("file", file);
    const r = await fetch(`${API}/evidence/${selectedId}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    setUploadLoading(false);
    if (r.ok) {
      await fetchDetail(selectedId);
    } else {
      const data = await r.json().catch(() => ({}));
      setUploadError(data.detail || "Upload failed.");
    }
  };

  const handleDownload = async () => {
    const r = await fetch(`${API}/evidence/${selectedId}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const data = await r.json();
      window.open(data.url, "_blank");
    }
  };

  // Stats computed from the full unfiltered list
  const stats = EVIDENCE_STATUSES.reduce((acc, s) => {
    acc[s] = allEvidence.filter((e) => e.current_status === s).length;
    return acc;
  }, {});

  const filtered = allEvidence.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || e.description?.toLowerCase().includes(q)
      || e.evidence_type?.toLowerCase().includes(q)
      || e.case_number?.toLowerCase().includes(q)
      || e.case_title?.toLowerCase().includes(q);
    const matchType   = filterType   === "All" || e.evidence_type  === filterType;
    const matchStatus = filterStatus === "All" || e.current_status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  // Available actions for the selected evidence
  const currentStatus    = detail?.evidence?.current_status || "";
  const availableActions = ACTIONS_FOR_STATUS[currentStatus] || [];
  const isTerminalStatus = currentStatus !== "" && availableActions.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Page header ── */}
      <div style={{
        padding: "18px 28px 16px",
        borderBottom: "1px solid var(--cv-border)",
        background: "var(--cv-surface)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--cv-text)", marginBottom: "2px" }}>
          Evidence Portal
        </div>
        <div style={{ fontSize: "12px", color: "var(--cv-text3)" }}>
          System-wide evidence inventory — search, filter, and track chain of custody across all cases.
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{
        display: "flex", flexShrink: 0,
        borderBottom: "1px solid var(--cv-border)",
        background: "var(--cv-surface)",
      }}>
        <div style={{
          padding: "10px 20px", borderRight: "1px solid var(--cv-border)",
          display: "flex", flexDirection: "column", alignItems: "center", minWidth: "72px",
        }}>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--cv-text)", lineHeight: 1 }}>
            {loading ? "—" : allEvidence.length}
          </div>
          <div style={{ fontSize: "10px", color: "var(--cv-text3)", textTransform: "uppercase",
            letterSpacing: "0.06em", marginTop: "3px" }}>
            Total
          </div>
        </div>

        {EVIDENCE_STATUSES.map((s) => (
          <div
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "All" : s)}
            style={{
              padding: "10px 14px", borderRight: "1px solid var(--cv-border)",
              display: "flex", flexDirection: "column", alignItems: "center",
              cursor: "pointer", userSelect: "none",
              background: filterStatus === s ? `${statusColor(s)}12` : "transparent",
              transition: "background 0.12s",
            }}
          >
            <div style={{
              fontSize: "20px", fontWeight: "700",
              color: filterStatus === s ? statusColor(s) : "var(--cv-text)",
              lineHeight: 1,
            }}>
              {loading ? "—" : (stats[s] || 0)}
            </div>
            <div style={{
              fontSize: "10px",
              color: filterStatus === s ? statusColor(s) : "var(--cv-text3)",
              textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "3px",
              whiteSpace: "nowrap", fontWeight: filterStatus === s ? "600" : "normal",
            }}>
              {s}
            </div>
          </div>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left: evidence list ── */}
        <div style={{
          width: "300px", flexShrink: 0, borderRight: "1px solid var(--cv-border)",
          display: "flex", flexDirection: "column", background: "var(--cv-surface)",
        }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--cv-border)", flexShrink: 0 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, type, case..."
              className="cv-input"
              style={{ fontSize: "12px", marginBottom: "8px" }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="cv-input"
              style={{ fontSize: "11px" }}
            >
              <option value="All">All Types</option>
              {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{
            padding: "5px 12px", fontSize: "10px", color: "var(--cv-text3)",
            borderBottom: "1px solid var(--cv-border)", flexShrink: 0,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {loading
              ? "Loading..."
              : `${filtered.length} item${filtered.length !== 1 ? "s" : ""}${
                  filtered.length !== allEvidence.length ? ` of ${allEvidence.length}` : ""
                }`
            }
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "16px 12px", color: "var(--cv-text3)", fontSize: "12px" }}>
                Loading evidence...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "16px 12px", color: "var(--cv-text3)", fontSize: "12px" }}>
                {allEvidence.length === 0
                  ? "No evidence on record."
                  : "No items match your filters."}
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
                  <div style={{ display: "flex", gap: "5px", alignItems: "center",
                    marginBottom: "4px", flexWrap: "wrap" }}>
                    <Badge value={ev.evidence_type} color={typeColor(ev.evidence_type)} />
                    <Badge value={ev.current_status} color={statusColor(ev.current_status)} />
                  </div>
                  <div style={{
                    fontSize: "12px", color: "var(--cv-text)", marginBottom: "4px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {ev.description}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{
                      fontSize: "10px", fontWeight: "600", color: "var(--cv-text3)",
                      background: "var(--cv-raised)", padding: "1px 5px", borderRadius: "3px",
                      border: "1px solid var(--cv-border)",
                    }}>
                      {ev.case_number || `Case #${ev.case_id}`}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--cv-text3)" }}>
                      {ev.intake_date ? new Date(ev.intake_date).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: detail panel ── */}
        <div style={{ flex: 1, overflowY: "auto", background: "var(--cv-base)" }}>
          {!selectedId ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%",
              color: "var(--cv-text3)", fontSize: "13px", gap: "8px",
            }}>
              <div style={{ fontSize: "28px", opacity: 0.25 }}>🔍</div>
              <div>Select an evidence item to view its detail and chain of custody.</div>
            </div>
          ) : detailLoading ? (
            <div style={{ padding: "24px", color: "var(--cv-text3)", fontSize: "13px" }}>
              Loading detail...
            </div>
          ) : detail ? (
            <PortalDetail
              detail={detail}
              onAddCustody={openCustodyModal}
              fileProps={{
                onUpload: () => { setUploadError(""); fileInputRef.current?.click(); },
                onDownload: handleDownload,
                uploading: uploadLoading,
                error: uploadError,
              }}
            />
          ) : null}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.tiff,.bmp,.mp4,.mov,.avi,.mp3,.wav"
        onChange={handleFileChange}
      />

      {/* ── Log Custody Event Modal ── */}
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
                onClick={() => {
                  setShowCustodyModal(false);
                  setCustodyForm(defaultCustodyForm());
                  setCustodyError("");
                }}
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
                    onClick={() => {
                      setShowCustodyModal(false);
                      setCustodyForm(defaultCustodyForm());
                      setCustodyError("");
                    }}
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
    </div>
  );
}

export default EvidencePage;
