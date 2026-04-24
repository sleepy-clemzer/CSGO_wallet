import { useState, useEffect } from "react";
import { TopBar }        from "./components/TopBar";
import { AddPanel }      from "./components/AddPanel";
import { SkinList }      from "./components/SkinList";
import { KpiStrip }      from "./components/KpiStrip";
import { PortfolioChart } from "./components/PortfolioChart";
import { RecapCard }     from "./components/RecapCard";
import { PROXY, SKINS_API } from "./constants";

// ✅ Import des services
import { fetchPortfolio, savePortfolio } from "./services/api/portfolioApi";

export default function Dashboard({ theme, toggleTheme, mounted, user, logout }) {

  const [data, setData]           = useState(null);
  const [range, setRange]         = useState("30d");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading]     = useState(true);

  const [allSkins, setAllSkins]   = useState([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const [dbError, setDbError]     = useState(null);

  const [tab, setTab]       = useState("valeur");
  const [wFilter, setWFilter] = useState("Tout");
  const [hidden, setHidden] = useState({});

  // ─── Ajout d'un skin ──────────────────────────────────────
  const handleAdd = async (skin) => {
    try {
      const newSkins = [...(data?.skins ?? []), skin];
      await savePortfolio(newSkins); // ✅ service
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Erreur ajout skin :", err);
    }
  };

  // ─── Suppression d'un skin ────────────────────────────────
  const handleDelete = async (skinId) => {
    try {
      const newSkins = (data?.skins ?? []).filter(s => s.id !== skinId);
      setData(d => ({ ...d, skins: newSkins }));
      await savePortfolio(newSkins); // ✅ service
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Erreur suppression skin :", err);
    }
  };

  // ─── Chargement base de skins ─────────────────────────────
  useEffect(() => {
    fetch(SKINS_API)
      .then(r => r.json())
      .then(json => {
        setAllSkins(json);
        setLoadingDB(false);
      })
      .catch(err => {
        console.error("Erreur chargement SKINS_API :", err);
        setDbError("Impossible de charger la base des skins");
        setLoadingDB(false);
      });
  }, []);

  // ─── Fetch portfolio ──────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchPortfolio(range) // ✅ service
      .then(json => {
        console.log("🔥 fetch portfolio :", json);
        setData(json);
        console.log("skins history lengths:",
          json?.skins?.map(s => ({ name: s.name, histLen: s.history?.length }))
        );
        setLoading(false);
      })
      .catch(err => {
        console.error("Erreur fetch portfolio :", err);
        setLoading(false);
      });
  }, [range, refreshKey]);

  // ─── Spinner premier chargement ───────────────────────────
  if (loading && !data) {
    return (
      <div className="shell" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:22, opacity:0.6 }}>Chargement…</div>
      </div>
    );
  }

  const skins    = data?.skins ?? [];
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];

  const allSkinsList = skins.filter(s => s);
  const active       = skins.filter(s => s && !hidden[s.id]);
  const weapons      = ["Tout", ...Array.from(new Set(allSkinsList.map(s => s.weapon ?? "Unknown")))];

  // ─── KPIs recalculés sur les skins actifs ─────────────────
  const totalBuy    = active.reduce((sum, s) => sum + (s.buyPrice ?? s.buy ?? 0), 0);
  const totalMarket = active.reduce((sum, s) => sum + (s.marketPrice ?? 0), 0);
  const profit      = totalMarket - totalBuy;
  const pct         = totalBuy > 0 ? (profit / totalBuy) * 100 : 0;

  // ─── Timeline reconstruite côté front ─────────────────────
  const filteredTimeline = timeline.map(point => {
    const valeur = active.reduce((sum, s) => {
      const skinVal = point[s.name];
      return sum + (skinVal ?? s.marketPrice ?? s.buyPrice ?? 0);
    }, 0);
    return { ...point, valeur };
  });

  const activePortfolio = {
    totalBuy,
    marketValue:      totalMarket,
    unrealizedPnL:    profit,
    unrealizedPnLPct: pct
  };

  const compData = active.map(s => ({
    name:   (s.name ?? "").length > 13 ? (s.name ?? "").slice(0, 11) + "…" : (s.name ?? "?"),
    achat:  s.buy ?? 0,
    marche: s.marketPrice ?? 0,
    profit: (s.marketPrice ?? 0) - (s.buy ?? 0),
    color:  s.color ?? "#888"
  }));

  const isDark      = theme === "dark";
  const accentCol   = isDark ? "#00ff87" : "#00cc6a";
  const redCol      = isDark ? "#ff4d4d" : "#ef4444";
  const gridCol     = isDark ? "#141414" : "#f0f0f0";
  const tickCol     = isDark ? "#555"    : "#71717a";
  const themeColors = { accentCol, redCol, gridCol, tickCol, isDark, theme };

  const toggleHide = (id) => setHidden(h => ({ ...h, [id]: !h[id] }));

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
            <div className="sec-head">Mes skins</div>
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
          <div style={{
            display:"flex",
            flexDirection:"column",
            alignItems:"center",
            justifyContent:"center",
            height:"100%",
            gap:12,
            textAlign:"center"
          }}>
            <div style={{ fontSize:56 }}>🎯</div>
            <div style={{ fontSize:20, fontWeight:600 }}>Aucun skin</div>
            <p style={{ fontSize:13, maxWidth:340, lineHeight:1.7 }}>
              Ajoutez vos premiers skins. L'historique complet Steam sera chargé automatiquement.
            </p>
          </div>
        ) : <>
          <div style={{ fontSize:12, opacity:0.6, marginBottom:6, paddingLeft:4 }}>
            Les données Steam ne représentent pas un marché financier. Les prix peuvent être volatils et ne garantissent pas une valeur de revente.
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