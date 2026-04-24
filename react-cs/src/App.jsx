/**
 * Root application component.
 *
 * Handles top-level concerns:
 *   - Theme management (dark/light)
 *   - Steam authentication state
 *   - Conditional rendering: loading spinner / login screen / dashboard
 */
import { useTheme } from "./hooks/useTheme";
import { useAuth }  from "./hooks/useAuth";
import Dashboard    from "./Dashboard";
import "./index.css";

export default function App() {
  const { theme, toggleTheme, mounted }                        = useTheme();
  const { user, authenticated, loading: authLoading, login, logout } = useAuth();

  // Show a centered spinner while the auth state is being resolved
  if (authLoading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg)" }}>
        <div className="spin" style={{ width:24, height:24 }}/>
      </div>
    );
  }

  // Unauthenticated — show the Steam login screen
  if (!authenticated) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:16, background:"var(--bg)" }}>

        {/* App logo */}
        <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" style={{ fill:"var(--card)", stroke:"var(--border)", strokeWidth:1 }}/>
          <path d="M14 5L19 11H9L14 5Z" style={{ fill:"var(--accent)" }}/>
          <path d="M14 23L9 17H19L14 23Z" style={{ fill:"var(--accent)", opacity:0.5 }}/>
          <rect x="11" y="11" width="6" height="6" rx="1" style={{ fill:"var(--accent)", opacity:0.9 }}/>
        </svg>

        <div style={{ fontSize:22, fontWeight:700, color:"var(--fg)" }}>CS2 Tracker</div>
        <p style={{ fontSize:13, color:"var(--muted)", maxWidth:300, textAlign:"center", lineHeight:1.6 }}>
          Sign in with Steam to access your portfolio and track your skins.
        </p>

        <button className="btn-add" style={{ width:"auto", padding:"10px 24px" }} onClick={login}>
          Steam Login
        </button>

        <button className="btn-theme" onClick={toggleTheme} style={{ marginTop:8 }}>
          {mounted ? (theme === "dark" ? "☀️" : "🌙") : null}
        </button>
      </div>
    );
  }

  // Authenticated — render the main dashboard
  return (
    <Dashboard
      theme={theme}
      toggleTheme={toggleTheme}
      mounted={mounted}
      user={user}
      authenticated={authenticated}
      logout={logout}
    />
  );
}