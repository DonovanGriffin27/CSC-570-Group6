// Authored by James Williams in collaboration with Claude
// ── Evidence types & condition statuses ───────────────────────────────────

export const EVIDENCE_TYPES = [
  "Physical Item", "Digital File", "Photo", "Video", "Audio",
  "Document", "Fingerprint", "DNA", "Weapon", "Drug Evidence", "Other",
];

export const CONDITION_STATUSES = [
  "Sealed", "Unsealed", "Damaged", "Contaminated", "Intact", "Unknown",
];

// ── Evidence lifecycle statuses (stored in DB, displayed in UI) ───────────

export const EVIDENCE_STATUSES = [
  "Collected", "In Custody", "In Storage", "In Analysis", "Released", "Disposed",
];

// ── Internal custody action keys (sent to / stored by backend) ────────────

export const CUSTODY_ACTION_KEYS = [
  "COLLECTED",
  "TRANSFERRED",
  "PLACED_IN_STORAGE",
  "REMOVED_FROM_STORAGE",
  "SUBMITTED_FOR_ANALYSIS",
  "ANALYSIS_COMPLETED",
  "RELEASED_TO_OWNER",
  "RELEASED_TO_EXTERNAL_AGENCY",
  "DISPOSED",
];

// Human-readable display label for each internal action key
export const CUSTODY_ACTION_LABEL = {
  COLLECTED:                   "Collected",
  TRANSFERRED:                 "Transferred",
  PLACED_IN_STORAGE:           "Placed in Storage",
  REMOVED_FROM_STORAGE:        "Removed from Storage",
  SUBMITTED_FOR_ANALYSIS:      "Submitted for Analysis",
  ANALYSIS_COMPLETED:          "Analysis Completed",
  RELEASED_TO_OWNER:           "Released to Owner",
  RELEASED_TO_EXTERNAL_AGENCY: "Released to External Agency",
  DISPOSED:                    "Disposed",
};

// ── User-facing action labels (shown in dropdown) → internal key ──────────
// Centralised here so the mapping never scatters across components.

export const USER_ACTION_TO_INTERNAL = {
  "Transferred":             "TRANSFERRED",
  "Place in Storage":        "PLACED_IN_STORAGE",
  "Remove from Storage":     "REMOVED_FROM_STORAGE",
  "Submit for Analysis":     "SUBMITTED_FOR_ANALYSIS",
  "Mark Analysis Complete":  "ANALYSIS_COMPLETED",
  "Released":                "RELEASED_TO_OWNER",
  "Disposed":                "DISPOSED",
};

// ── Context-aware actions per current evidence status ─────────────────────
// Only actions that make logical sense for the given status are offered.

export const ACTIONS_FOR_STATUS = {
  "Collected":   ["Transferred", "Place in Storage", "Submit for Analysis"],
  "In Custody":  ["Transferred", "Place in Storage", "Submit for Analysis", "Released", "Disposed"],
  "In Storage":  ["Remove from Storage", "Transferred"],
  "In Analysis": ["Mark Analysis Complete"],
  "Released":    [],
  "Disposed":    [],
};

// ── Color helpers ─────────────────────────────────────────────────────────

export const statusColor = (s) => ({
  "Collected":   "#34d399",
  "In Custody":  "#60a5fa",
  "In Storage":  "#818cf8",
  "In Analysis": "#f59e0b",
  "Released":    "#8b9ab4",
  "Disposed":    "#f87171",
}[s] || "#8b9ab4");

export const typeColor = (t) => ({
  "DNA":           "#ec4899",
  "Weapon":        "#f87171",
  "Drug Evidence": "#f97316",
  "Digital File":  "#60a5fa",
  "Photo":         "#818cf8",
  "Video":         "#a78bfa",
  "Audio":         "#c084fc",
  "Fingerprint":   "#34d399",
  "Document":      "#fbbf24",
  "Physical Item": "#94a3b8",
  "Other":         "#8b9ab4",
}[t] || "#8b9ab4");

export const actionColor = (a) => ({
  COLLECTED:                   "#34d399",
  TRANSFERRED:                 "#60a5fa",
  PLACED_IN_STORAGE:           "#818cf8",
  REMOVED_FROM_STORAGE:        "#a78bfa",
  SUBMITTED_FOR_ANALYSIS:      "#f59e0b",
  ANALYSIS_COMPLETED:          "#34d399",
  RELEASED_TO_OWNER:           "#8b9ab4",
  RELEASED_TO_EXTERNAL_AGENCY: "#94a3b8",
  DISPOSED:                    "#f87171",
}[a] || "#8b9ab4");
