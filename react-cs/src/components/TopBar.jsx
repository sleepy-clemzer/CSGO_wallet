import { AUTO_MS } from "../constants/index.js";

export function TopBar({
  theme, toggleTheme, mounted,
  lastRef, refreshing, onRefresh, anyLoadingHist,
  user, authenticated, onLogin, onLogout,
}) {
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

        <div className="topbar-sep"/>

        {/* Auth Steam */}
        {authenticated && user ? (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.displayName}
                style={{ width:28, height:28, borderRadius:"50%", border:"1px solid var(--border)", flexShrink:0 }}
              />
            )}
            <span style={{ fontSize:12, fontWeight:500, color:"var(--fg)", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {user.displayName}
            </span>
            <button className="btn-top" onClick={onLogout} style={{ color:"var(--red)", borderColor:"var(--red-bg)" }}>
              Déconnexion
            </button>
          </div>
        ) : (
          <button className="btn-top" onClick={onLogin} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0zm0 6a10 10 0 110 20A10 10 0 0116 6z"/>
            </svg>
            Connexion Steam
          </button>
        )}
      </div>
    </header>
  );
}