import { AUTO_MS } from "../constants";

export function TopBar({ theme, toggleTheme, mounted, lastRef, refreshing, onRefresh, anyLoadingHist }) {
  const isDark = theme === "dark";

  return (
    <header className="topbar">
      <div className="logo">
        <div className="logo-mark">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" style={{ fill:"var(--card)", stroke:"var(--border)", strokeWidth:1 }}/>
            <path d="M14 5L19 11H9L14 5Z" style={{ fill:"var(--accent)" }}/>
            <path d="M14 23L9 17H19L14 23Z" style={{ fill:"var(--accent)", opacity:0.5 }}/>
            <rect x="11" y="11" width="6" height="6" rx="1" style={{ fill:"var(--accent)", opacity:0.9 }}/>
          </svg>
        </div>
        CS2 Tracker
      </div>

      <div className="topbar-sep"/>
      <span className="topbar-label">Portfolio</span>

      <div className="ms-left" style={{ display:"flex", alignItems:"center", gap:8 }}>
        {anyLoadingHist && (
          <div className="hist-loading">
            <div className="spin"/>
            Chargement historique Steam...
          </div>
        )}
        {lastRef && (
          <span className="muted" style={{ fontSize:11 }}>
            màj {lastRef.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })}
          </span>
        )}
        <div className="badge-live">
          <div className="dot-live"/>
          LIVE · auto {AUTO_MS / 60000}min
        </div>
        <button className="btn-top" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "..." : "↻ Actualiser"}
        </button>
        <button className="btn-theme" onClick={toggleTheme} title="Changer le thème">
          {mounted ? (isDark ? "☀️" : "🌙") : null}
        </button>
      </div>
    </header>
  );
}