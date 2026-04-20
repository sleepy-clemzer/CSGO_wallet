import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "./hooks/useTheme.js";
import { useAuth } from "./hooks/useAuth.js";
import { TopBar } from "./components/TopBar.jsx";
import { AddPanel } from "./components/AddPanel.jsx";
import { SkinList } from "./components/SkinList.jsx";
import { KpiStrip } from "./components/KpiStrip.jsx";
import { PortfolioChart } from "./components/PortfolioChart.jsx";
import { RecapCard } from "./components/RecapCard.jsx";
import { SKINS_API, HIST_URL, FULL_HIST_URL, RECORD_URL, AUTO_MS, RANGES, PROXY } from "./constants/index.js";
import { fmtTime } from "./utils/index.js";
import "./index.css";

export default function CS2Dashboard() {
  const { theme, toggleTheme, mounted }   = useTheme();
  const { user, authenticated, loading: authLoading, login, logout } = useAuth();

  const [portfolio, setPortfolio]         = useState([]);
  const [tab, setTab]                     = useState("valeur");
  const [range, setRange]                 = useState("all");
  const [wFilter, setWFilter]             = useState("Tout");
  const [hidden, setHidden]               = useState({});
  const [refreshing, setRefreshing]       = useState(false);
  const [history, setHistory]             = useState({});
  const [loadingHist, setLoadingHist]     = useState({});
  const [lastRef, setLastRef]             = useState(null);
  const [allSkins, setAllSkins]           = useState([]);
  const [loadDB, setLoadDB]               = useState(false);
  const [dbErr, setDbErr]                 = useState(null);
  const timerRef = useRef(null);

  // ── Load skins DB ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadDB(true);
    fetch(SKINS_API)
      .then(r => r.json())
      .then(d => setAllSkins(d.filter(s => s.name && s.weapon?.name)))
      .catch(() => setDbErr("Impossible de charger la base."))
      .finally(() => setLoadDB(false));
  }, []);

  // ── Charger le portfolio depuis le serveur quand l'user se connecte ────────
  useEffect(() => {
    if (!authenticated) { setPortfolio([]); return; }
    fetch(`${PROXY}/api/portfolio`, { credentials:"include" })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPortfolio(data); })
      .catch(() => {});
  }, [authenticated]);

  // ── Sauvegarder le portfolio sur le serveur à chaque changement ────────────
  const savePortfolio = useCallback((newPortfolio) => {
    if (!authenticated) return;
    fetch(`${PROXY}/api/portfolio`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ portfolio: newPortfolio }),
    }).catch(() => {});
  }, [authenticated]);

  // ── Load history ───────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(HIST_URL());
      if (r.ok) setHistory(await r.json());
    } catch {}
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Fetch full Steam history ───────────────────────────────────────────────
  const fetchFullHistory = useCallback(async (skin) => {
    setLoadingHist(h => ({ ...h, [skin.fullName]: true }));
    try {
      const r = await fetch(FULL_HIST_URL(skin.fullName));
      if (r.ok) {
        const data = await r.json();
        setHistory(prev => ({ ...prev, [skin.fullName]: data.points || [] }));
      }
    } catch (e) {
      console.warn("Full history fetch failed:", e.message);
    } finally {
      setLoadingHist(h => ({ ...h, [skin.fullName]: false }));
    }
  }, []);

  // ── Record prices ──────────────────────────────────────────────────────────
  const recordPrices = useCallback(async () => {
    if (!portfolio.length) return;
    setRefreshing(true);
    try {
      const r = await fetch(RECORD_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ skins: portfolio.map(s => s.fullName) }),
      });
      if (r.ok) {
        const d = await r.json();
        setPortfolio(p => {
          const updated = p.map(s => {
            const rr = d.recorded[s.fullName];
            return rr?.success ? { ...s, marketPrice: rr.price } : s;
          });
          savePortfolio(updated);
          return updated;
        });
        await loadHistory();
        setLastRef(new Date());
      }
    } catch {}
    setRefreshing(false);
  }, [portfolio, loadHistory, savePortfolio]);

  useEffect(() => {
    if (!portfolio.length) return;
    timerRef.current = setInterval(recordPrices, AUTO_MS);
    return () => clearInterval(timerRef.current);
  }, [portfolio.length, recordPrices]);

  // ── Skin actions ───────────────────────────────────────────────────────────
  const addSkin = useCallback((skin) => {
    setPortfolio(p => {
      const updated = [...p, { ...skin, id: Date.now() }];
      savePortfolio(updated);
      return updated;
    });
    fetchFullHistory(skin);
  }, [fetchFullHistory, savePortfolio]);

  const delSkin = (id) => {
    setPortfolio(p => {
      const updated = p.filter(s => s.id !== id);
      savePortfolio(updated);
      return updated;
    });
    setHidden(h => { const n = { ...h }; delete n[id]; return n; });
  };

  const toggleHide = (id) => setHidden(h => ({ ...h, [id]: !h[id] }));

  // ── Derived ────────────────────────────────────────────────────────────────
  const weapons     = ["Tout", ...Array.from(new Set(portfolio.map(s => s.weapon)))];
  const active      = wFilter === "Tout" ? portfolio : portfolio.filter(s => s.weapon === wFilter);
  const totalBuy    = active.reduce((a, s) => a + s.buy, 0);
  const totalMarket = active.reduce((a, s) => a + (s.marketPrice ?? s.buy), 0);
  const profit      = totalMarket - totalBuy;
  const pct         = totalBuy > 0 ? (profit / totalBuy) * 100 : 0;

  // ── Timeline ───────────────────────────────────────────────────────────────
  const now     = Date.now();
  const rangeMs = RANGES.find(r => r.key === range)?.ms ?? Infinity;
  const cutoff  = rangeMs === Infinity ? 0 : now - rangeMs;

  const buildTimeline = () => {
    const allTs = new Set();
    active.forEach(s => {
      (history[s.fullName] || []).forEach(p => { if (p.t >= cutoff) allTs.add(p.t); });
    });
    const sorted = [...allTs].sort((a, b) => a - b);

    if (!sorted.length) {
      const makePoint = (t) => {
        const pt = { time:t, label:fmtTime(t, range) };
        let tot = 0, ref = 0;
        active.forEach(s => {
          if (hidden[s.id]) return;
          const p = s.marketPrice ?? s.buy;
          tot += p; ref += s.buy; pt[s.name] = p;
        });
        pt.valeur = tot; pt.profit = tot - ref; pt.ref = ref;
        return pt;
      };
      return [makePoint(now - 3600000), makePoint(now)];
    }

    const result = sorted.map(t => {
      const pt = { time:t, label:fmtTime(t, range) };
      let tot = 0, ref = 0, hasAny = false;
      active.forEach(s => {
        if (hidden[s.id]) return;
        const h = history[s.fullName] || [];
        const before = h.filter(p => p.t <= t);
        if (!before.length) return;
        const p = before[before.length - 1].p;
        tot += p; ref += s.buy; pt[s.name] = p;
        hasAny = true;
      });
      if (!hasAny) return null;
      pt.valeur = tot; pt.profit = tot - ref; pt.ref = ref;
      return pt;
    }).filter(Boolean);

    if (result.length === 1) {
      const earlier = { ...result[0], time: result[0].time - 3600000, label: fmtTime(result[0].time - 3600000, range) };
      return [earlier, result[0]];
    }
    return result;
  };

  const timeline = buildTimeline();

  const compData = active.filter(s => !hidden[s.id]).map(s => ({
    name:   s.name.length > 13 ? s.name.slice(0, 11) + "…" : s.name,
    achat:  s.buy,
    marche: s.marketPrice ?? s.buy,
    profit: (s.marketPrice ?? s.buy) - s.buy,
    color:  s.color,
  }));

  const totalPts       = Object.values(history).reduce((a, h) => a + h.length, 0);
  const anyLoadingHist = Object.values(loadingHist).some(Boolean);

  // ── Theme colors ───────────────────────────────────────────────────────────
  const isDark    = theme === "dark";
  const accentCol = isDark ? "#00ff87" : "#00cc6a";
  const redCol    = isDark ? "#ff4d4d" : "#ef4444";
  const gridCol   = isDark ? "#141414" : "#f0f0f0";
  const tickCol   = isDark ? "#555"    : "#71717a";
  const themeColors = { accentCol, redCol, gridCol, tickCol, isDark, theme };

  // ── Écran de connexion ─────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg)" }}>
        <div className="spin" style={{ width:24, height:24 }}/>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:16, background:"var(--bg)" }}>
        <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" style={{ fill:"var(--card)", stroke:"var(--border)", strokeWidth:1 }}/>
          <path d="M14 5L19 11H9L14 5Z" style={{ fill:"var(--accent)" }}/>
          <path d="M14 23L9 17H19L14 23Z" style={{ fill:"var(--accent)", opacity:0.5 }}/>
          <rect x="11" y="11" width="6" height="6" rx="1" style={{ fill:"var(--accent)", opacity:0.9 }}/>
        </svg>
        <div style={{ fontSize:22, fontWeight:700, color:"var(--fg)" }}>CS2 Tracker</div>
        <p style={{ fontSize:13, color:"var(--muted)", maxWidth:300, textAlign:"center", lineHeight:1.6 }}>
          Connecte-toi avec Steam pour accéder à ton portfolio et suivre tes skins.
        </p>
        <button className="btn-add" style={{ width:"auto", padding:"10px 24px" }} onClick={login}>
          Connexion Steam
        </button>
        <button className="btn-theme" onClick={toggleTheme} style={{ marginTop:8 }}>
          {mounted ? (isDark ? "☀️" : "🌙") : null}
        </button>
      </div>
    );
  }

  return (
    <div className="shell">
      <TopBar
        theme={theme} toggleTheme={toggleTheme} mounted={mounted}
        lastRef={lastRef} refreshing={refreshing}
        onRefresh={recordPrices} anyLoadingHist={anyLoadingHist}
        user={user} authenticated={authenticated}
        onLogin={login} onLogout={logout}
      />

      <aside className="sidebar">
        <div className="sidebar-inner">
          <AddPanel onAdd={addSkin} allSkins={allSkins} loadingDB={loadDB} dbError={dbErr} />
          {portfolio.length > 0 && <>
            <div className="divider"/>
            <div className="sec-head">Mes skins</div>
            <SkinList
              active={active} hidden={hidden} loadingHist={loadingHist}
              accentCol={accentCol} redCol={redCol}
              onToggleHide={toggleHide} onDelete={delSkin}
              weapons={weapons} wFilter={wFilter} onFilterChange={setWFilter}
            />
          </>}
        </div>
      </aside>

      <main className="main">
        {portfolio.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12, textAlign:"center" }}>
            <div style={{ fontSize:56 }}>🎯</div>
            <div style={{ fontSize:20, fontWeight:600, color:"var(--fg)" }}>Aucun skin</div>
            <p style={{ fontSize:13, color:"var(--muted)", maxWidth:340, lineHeight:1.7 }}>
              Ajoutez vos premiers skins. L'historique complet Steam sera chargé automatiquement.
            </p>
          </div>
        ) : <>
          <KpiStrip
            totalBuy={totalBuy} totalMarket={totalMarket}
            profit={profit} pct={pct}
            totalPts={totalPts} activeCount={active.length}
            accentCol={accentCol} redCol={redCol}
          />
          <PortfolioChart
            tab={tab} setTab={setTab}
            range={range} setRange={setRange}
            timeline={timeline} active={active}
            hidden={hidden} onToggleHide={toggleHide}
            compData={compData} totalBuy={totalBuy}
            {...themeColors}
          />
          <RecapCard
            compData={compData} active={active}
            totalBuy={totalBuy} totalMarket={totalMarket}
            profit={profit} pct={pct}
            {...themeColors}
          />
        </>}
      </main>
    </div>
  );
}