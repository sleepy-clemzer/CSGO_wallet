/**
 * Main dashboard component.
 *
 * Responsibilities:
 *   - Fetching and refreshing portfolio data from the backend
 *   - Loading the skin database (ByMykel API)
 *   - Computing per-active-skin KPIs and filtered timeline
 *   - Coordinating skin add / delete operations
 *   - Passing derived data down to child components
 */
import { useState, useEffect }           from "react";
import { useTranslation }                from "react-i18next";
import { TopBar }                        from "./components/TopBar";
import { AddPanel }                      from "./components/AddPanel";
import { SkinList }                      from "./components/SkinList";
import { KpiStrip }                      from "./components/KpiStrip";
import { PortfolioChart }                from "./components/PortfolioChart";
import { RecapCard }                     from "./components/RecapCard";
import { PROXY, SKINS_API }             from "./constants";
import { fetchPortfolio, savePortfolio } from "./services/api/portfolioApi";

export default function Dashboard({ theme, toggleTheme, mounted, user, logout }) {
  const { t } = useTranslation();

  // Portfolio data returned by the backend
  const [data, setData]             = useState(null);
  const [range, setRange]           = useState("30d");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading]       = useState(true);

  // Skin database (ByMykel CS2 skins API)
  const [allSkins, setAllSkins]   = useState([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const [dbError, setDbError]     = useState(null);

  // UI state
  const [tab, setTab]         = useState("valeur");
  const [wFilter, setWFilter] = useState("Tout");
  const [hidden, setHidden]   = useState({});

  // ---------------------------------------------------------------------------
  // Portfolio operations
  // ---------------------------------------------------------------------------

  /**
   * Adds a skin to the portfolio.
   * Saves immediately to the backend then triggers a full data refresh.
   *
   * @param {Object} skin - Skin object built by AddPanel
   */
  const handleAdd = async (skin) => {
    try {
      const newSkins = [...(data?.skins ?? []), skin];
      await savePortfolio(newSkins);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("[Dashboard] Failed to add skin:", err);
    }
  };

  /**
   * Removes a skin from the portfolio by ID.
   * Updates the UI immediately then saves to the backend.
   *
   * @param {string} skinId - ID of the skin to remove
   */
  const handleDelete = async (skinId) => {
    try {
      const newSkins = (data?.skins ?? []).filter(s => s.id !== skinId);
      setData(d => ({ ...d, skins: newSkins }));
      await savePortfolio(newSkins);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("[Dashboard] Failed to delete skin:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  // Load the skin database once on mount
  useEffect(() => {
    fetch(SKINS_API)
      .then(r => r.json())
      .then(json => { setAllSkins(json); setLoadingDB(false); })
      .catch(() => { setDbError(t("errors.loadSkins")); setLoadingDB(false); });
  }, []);

  // Fetch portfolio data whenever range or refreshKey changes
  useEffect(() => {
    setLoading(true);
    fetchPortfolio(range)
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range, refreshKey]);

  // ---------------------------------------------------------------------------
  // Loading state — shown only on first load (no existing data)
  // ---------------------------------------------------------------------------
  if (loading && !data) {
    return (
      <div className="shell" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:22, opacity:0.6 }}>{t("common.loading")}</div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const skins    = data?.skins ?? [];
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];

  // All skins — used for sidebar list and recap (unaffected by hidden state)
  const allSkinsList = skins.filter(s => s);

  // Visible skins — used for chart rendering and KPI computation
  const active = skins.filter(s => s && !hidden[s.id]);

  const weapons = ["Tout", ...Array.from(new Set(allSkinsList.map(s => s.weapon ?? "Unknown")))];

  // KPIs computed from visible skins only
  const totalBuy    = active.reduce((sum, s) => sum + (s.buyPrice ?? s.buy ?? 0), 0);
  const totalMarket = active.reduce((sum, s) => sum + (s.marketPrice ?? 0), 0);
  const profit      = totalMarket - totalBuy;
  const pct         = totalBuy > 0 ? (profit / totalBuy) * 100 : 0;

  /**
   * Recomputes the timeline valeur field to reflect only visible skins.
   * Falls back to marketPrice if a skin has no history data in the timeline.
   */
  const filteredTimeline = timeline.map(point => {
    const valeur = active.reduce((sum, s) => {
      return sum + (point[s.name] ?? s.marketPrice ?? s.buyPrice ?? 0);
    }, 0);
    return { ...point, valeur };
  });

  // Portfolio metrics passed to chart components
  const activePortfolio = {
    totalBuy,
    marketValue:      totalMarket,
    unrealizedPnL:    profit,
    unrealizedPnLPct: pct
  };

  // Comparison bar chart data — truncates long names for readability
  const compData = active.map(s => ({
    name:   (s.name ?? "").length > 13 ? (s.name ?? "").slice(0, 11) + "…" : (s.name ?? "?"),
    achat:  s.buy ?? 0,
    marche: s.marketPrice ?? 0,
    profit: (s.marketPrice ?? 0) - (s.buy ?? 0),
    color:  s.color ?? "#888"
  }));

  // Theme-derived color tokens
  const isDark      = theme === "dark";
  const accentCol   = isDark ? "#00ff87" : "#00cc6a";
  const redCol      = isDark ? "#ff4d4d" : "#ef4444";
  const gridCol     = isDark ? "#141414" : "#f0f0f0";
  const tickCol     = isDark ? "#555"    : "#71717a";
  const themeColors = { accentCol, redCol, gridCol, tickCol, isDark, theme };

  // Toggles a skin's visibility in charts without removing it from the list
  const toggleHide = (id) => setHidden(h => ({ ...h, [id]: !h[id] }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="shell">
      <TopBar
        theme={theme}
        toggleTheme={toggleTheme}
        mounted={mounted}
        refreshing={loading}
        onRefresh={() => setRefreshKey(k => k + 1)}
        anyLoadingHist={false}
        user={user}
        authenticated={!!user}
        onLogin={() => window.location.href = `${PROXY}/auth/steam`}
        onLogout={logout}
      />

      <aside className="sidebar">
        <div className="sidebar-inner">
          <AddPanel
            onAdd={handleAdd}
            allSkins={allSkins}
            loadingDB={loadingDB}
            dbError={dbError}
          />

          {allSkinsList.length > 0 && <>
            <div className="divider"/>
            <div className="sec-head">{t("sidebar.mySkins")}</div>
            <SkinList
              active={allSkinsList}
              hidden={hidden}
              loadingHist={{}}
              accentCol={accentCol}
              redCol={redCol}
              onToggleHide={toggleHide}
              onDelete={handleDelete}
              weapons={weapons}
              wFilter={wFilter}
              onFilterChange={setWFilter}
            />
          </>}
        </div>
      </aside>

      <main className="main">
        {allSkinsList.length === 0 ? (

          // Empty state — no skins in portfolio
          <div style={{
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            height:"100%", gap:12, textAlign:"center"
          }}>
            <div style={{ fontSize:56 }}>🎯</div>
            <div style={{ fontSize:20, fontWeight:600 }}>{t("empty.title")}</div>
            <p style={{ fontSize:13, maxWidth:340, lineHeight:1.7 }}>
              {t("empty.description")}
            </p>
          </div>

        ) : <>

          {/* Legal disclaimer */}
          <div style={{ fontSize:12, opacity:0.6, marginBottom:6, paddingLeft:4 }}>
            {t("chart.disclaimer")}
          </div>

          <KpiStrip
            totalBuy={totalBuy}
            totalMarket={totalMarket}
            profit={profit}
            pct={pct}
            totalPts={filteredTimeline.length}
            activeCount={active.length}
            accentCol={accentCol}
            redCol={redCol}
          />

          <PortfolioChart
            tab={tab}
            setTab={setTab}
            range={range}
            setRange={setRange}
            timeline={filteredTimeline}
            portfolio={activePortfolio}
            active={active}
            hidden={hidden}
            onToggleHide={toggleHide}
            compData={compData}
            totalBuy={totalBuy}
            currentLowest={data?.current?.lowestListing ?? 0}
            {...themeColors}
          />

          <RecapCard
            compData={compData}
            active={allSkinsList}
            totalBuy={totalBuy}
            totalMarket={totalMarket}
            profit={profit}
            pct={pct}
            {...themeColors}
          />
        </>}
      </main>
    </div>
  );
}