function Sidebar({ activePage, onNavigate }) {
  const links = [
    { label: "Investigator", page: "investigator" },
    { label: "Evidence", page: "evidence" },
    { label: "Admin", page: "admin" },
  ];

  return (
    <div style={{ width: "200px", background: "#1a1a2e", height: "100vh", padding: "20px" }}>
      <h2 style={{ color: "white", marginBottom: "30px" }}>CaseVault</h2>
      {links.map((link) => (
        <div
          key={link.page}
          onClick={() => onNavigate(link.page)}
          style={{
            color: activePage === link.page ? "#00d4ff" : "#aaa",
            cursor: "pointer",
            marginBottom: "15px",
            fontWeight: activePage === link.page ? "bold" : "normal",
          }}
        >
          {link.label}
        </div>
      ))}
    </div>
  );
}

export default Sidebar;