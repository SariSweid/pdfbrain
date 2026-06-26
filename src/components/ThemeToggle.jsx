function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      onClick={onToggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        padding: "6px 10px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        color: "var(--text-secondary)",
        fontSize: "14px",
        fontWeight: 500,
      }}
    >
      {isDark ? "☀️" : "🌙"}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

export default ThemeToggle;
