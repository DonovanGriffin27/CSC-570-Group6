import { useState } from "react";

function InvestigatorPage() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Low");
  const [cases, setCases] = useState([]);

  const createCase = async () => {
    const res = await fetch("http://127.0.0.1:8000/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority }),
    });
    const data = await res.json();
    console.log(data);
  };

  const fetchCases = async () => {
    const res = await fetch("http://127.0.0.1:8000/cases");
    const data = await res.json();
    setCases(data);
  };

  return (
    <div>
      <h1 style={{ marginBottom: "30px", borderBottom: "1px solid #333", paddingBottom: "10px" }}>
        Investigator Portal
      </h1>

      <h2 style={{ marginBottom: "15px" }}>Create Case</h2>
      <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <input
          placeholder="Case title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: "8px", borderRadius: "4px", border: "1px solid #444", background: "#1a1a2e", color: "white", flex: 1 }}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ padding: "8px", borderRadius: "4px", border: "1px solid #444", background: "#1a1a2e", color: "white" }}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        <button
          onClick={createCase}
          style={{ padding: "8px 16px", background: "#00d4ff", color: "#0f0f1a", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          Create
        </button>
      </div>

      <h2 style={{ marginBottom: "15px" }}>Case Queue</h2>
      <button
        onClick={fetchCases}
        style={{ padding: "8px 16px", background: "#1a1a2e", color: "#00d4ff", border: "1px solid #00d4ff", borderRadius: "4px", cursor: "pointer", marginBottom: "15px" }}
      >
        Load Cases
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {cases.map((c) => (
          <div
            key={c.case_id}
            style={{ background: "#1a1a2e", padding: "15px", borderRadius: "6px", border: "1px solid #333" }}
          >
            <span style={{ fontWeight: "bold" }}>{c.title}</span>
            <span style={{ marginLeft: "15px", color: "#aaa" }}>{c.status}</span>
            <span
              style={{
                marginLeft: "15px",
                color: c.priority === "High" ? "#ff4d4d" : c.priority === "Medium" ? "#ffaa00" : "#00cc66",
              }}
            >
              {c.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InvestigatorPage;