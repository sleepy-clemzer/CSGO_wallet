import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

const SKINS_API = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const PROXY = import.meta.env.VITE_STEAM_PROXY_URL || "http://localhost:3001";
const STEAM_PROXY = (name) => `${PROXY}/steam-price?name=${encodeURIComponent(name)}`;
const HISTORY_URL = (name) => name ? `${PROXY}/price-history?name=${encodeURIComponent(name)}` : `${PROXY}/price-history`;
const RECORD_URL = `${PROXY}/record-prices`;
const AUTO_REFRESH_MS = 0.5 * 60 * 1000;

const WEAR_LABELS = {
  "Factory New": "FN", "Minimal Wear": "MW", "Field-Tested": "FT",
  "Well-Worn": "WW", "Battle-Scarred": "BS",
};
const WEAR_ORDER = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
const SKIN_COLORS = ["#3fb950","#58a6ff","#f0883e","#a371f7","#f85149","#d29922","#38bdf8","#e879f9","#fb923c","#34d399"];

const TIME_RANGES = [
  { key: "1h",  label: "1H",  ms: 60*60*1000 },
  { key: "24h", label: "24H", ms: 24*60*60*1000 },
  { key: "7d",  label: "7J",  ms: 7*24*60*60*1000 },
  { key: "30d", label: "30J", ms: 30*24*60*60*1000 },
  { key: "all", label: "Tout", ms: Infinity },
];

const POPULAR_WEAPONS = ["AK-47", "AWP", "M4A4", "Desert Eagle", "Glock-18", "M4A1-S", "USP-S", "Knife"];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#07090f}
.d{background:#07090f;min-height:100vh;padding:22px;font-family:'Rajdhani',sans-serif;color:#c9d1d9}
.hdr{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #161b22}
.pulse{width:8px;height:8px;border-radius:50%;background:#3fb950;animation:p 2.5s infinite;flex-shrink:0}
@keyframes p{0%,100%{opacity:1}50%{opacity:.2}}
.htitle{font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:.12em;color:#e6edf3}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.kpi{background:#0d1117;border:1px solid #161b22;border-radius:10px;padding:14px 16px}
.klbl{font-family:'Share Tech Mono',monospace;font-size:9px;color:#484f58;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.kval{font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:500}
.ksub{font-size:11px;color:#484f58;margin-top:3px}
.card{background:#0d1117;border:1px solid #161b22;border-radius:10px;padding:16px;margin-bottom:14px}
.card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px}
.card-title{font-size:13px;font-weight:500;color:#e6edf3}
.sec-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;color:#484f58;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.tabs{display:flex;gap:5px}
.tab{font-family:'Share Tech Mono',monospace;font-size:10px;padding:4px 12px;border-radius:5px;border:1px solid #21262d;background:transparent;color:#484f58;cursor:pointer;letter-spacing:.04em;transition:all .15s}
.tab.on{background:#161b22;color:#c9d1d9;border-color:#30363d}
.tab:hover:not(.on){color:#8b949e}
.time-tabs{display:flex;gap:3px;background:#07090f;border:1px solid #161b22;border-radius:6px;padding:2px}
.time-tab{font-family:'Share Tech Mono',monospace;font-size:9px;padding:3px 8px;border-radius:4px;border:none;background:transparent;color:#484f58;cursor:pointer;letter-spacing:.04em;transition:all .15s}
.time-tab.on{background:#161b22;color:#c9d1d9}
.legend{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
.leg{display:flex;align-items:center;gap:5px;font-family:'Share Tech Mono',monospace;font-size:10px;color:#6e7681;cursor:pointer;transition:opacity .15s;user-select:none}
.leg.dim{opacity:.3}
.legdot{width:8px;height:8px;border-radius:2px;flex-shrink:0}
.bot{display:grid;grid-template-columns:1fr 1.5fr;gap:12px}
.pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.pill{font-family:'Share Tech Mono',monospace;font-size:10px;padding:3px 11px;border-radius:20px;border:1px solid #21262d;background:transparent;color:#484f58;cursor:pointer;transition:all .15s}
.pill.on{background:#3fb950;color:#04260a;border-color:#3fb950}
.pill:hover:not(.on){color:#8b949e;border-color:#30363d}
.slist{max-height:300px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#21262d transparent}
.srow{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #111827;cursor:pointer;transition:opacity .15s}
.srow:last-child{border-bottom:none}
.srow:hover{opacity:.7}
.srow.dim{opacity:.25}
.sname{font-size:13px;font-weight:500;color:#e6edf3}
.sweap{font-family:'Share Tech Mono',monospace;font-size:10px;color:#484f58;margin-top:2px}
.sprice{font-family:'Share Tech Mono',monospace;font-size:13px;text-align:right}
.sdelta{font-family:'Share Tech Mono',monospace;font-size:10px;text-align:right;margin-top:2px}
.statgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.statbox{background:#07090f;border-radius:8px;padding:12px 14px}
.stlbl{font-family:'Share Tech Mono',monospace;font-size:9px;color:#484f58;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.stval{font-family:'Share Tech Mono',monospace;font-size:17px;color:#e6edf3}
.stfoot{font-size:11px;color:#30363d;margin-top:3px}
.add-panel{background:#0d1117;border:1px solid #161b22;border-radius:10px;padding:16px;margin-bottom:14px}
.add-panel-hdr{display:flex;align-items:center;justify-content:space-between;cursor:pointer}
.chevron{font-size:10px;color:#484f58;font-family:'Share Tech Mono',monospace;transition:transform .2s;user-select:none}
.chevron.open{transform:rotate(180deg)}
.steps{display:flex;gap:0;margin-bottom:18px;border:1px solid #161b22;border-radius:8px;overflow:hidden}
.step{flex:1;padding:8px 12px;text-align:center;font-family:'Share Tech Mono',monospace;font-size:10px;color:#484f58;background:#07090f;border-right:1px solid #161b22;letter-spacing:.06em;transition:all .15s}
.step:last-child{border-right:none}
.step.done{color:#3fb950}
.step.active{background:#0d1117;color:#e6edf3}
.step-num{display:block;font-size:16px;font-weight:600;margin-bottom:2px}
.inp{background:#07090f;border:1px solid #21262d;border-radius:6px;padding:9px 12px;color:#e6edf3;font-family:'Share Tech Mono',monospace;font-size:12px;outline:none;transition:border-color .15s;width:100%}
.inp:focus{border-color:#3fb950;box-shadow:0 0 0 2px rgba(63,185,80,.1)}
.inp::placeholder{color:#30363d}

/* COMBOBOX ARME */
.combo-wrap{position:relative;margin-bottom:4px}
.combo-input{background:#07090f;border:1px solid #21262d;border-radius:6px;padding:9px 32px 9px 12px;color:#e6edf3;font-family:'Share Tech Mono',monospace;font-size:12px;outline:none;transition:border-color .15s;width:100%;cursor:pointer;text-align:left}
.combo-input:focus,.combo-input.open{border-color:#3fb950;box-shadow:0 0 0 2px rgba(63,185,80,.1)}
.combo-arrow{position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#484f58;font-size:10px;transition:transform .2s}
.combo-arrow.open{transform:translateY(-50%) rotate(180deg)}
.combo-dd{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#0d1117;border:1px solid #21262d;border-radius:8px;z-index:50;overflow:hidden;max-height:260px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#21262d transparent}
.combo-sep{padding:5px 12px 3px;font-family:'Share Tech Mono',monospace;font-size:9px;color:#30363d;text-transform:uppercase;letter-spacing:.1em;background:#07090f;position:sticky;top:0}
.combo-opt{padding:9px 12px;font-family:'Share Tech Mono',monospace;font-size:11px;color:#c9d1d9;cursor:pointer;border-left:2px solid transparent;transition:all .1s}
.combo-opt:hover,.combo-opt.hl{background:#161b22;border-left-color:#3fb950;color:#e6edf3}
.combo-opt mark{background:none;color:#3fb950;font-style:normal}
.combo-empty{padding:10px 12px;font-family:'Share Tech Mono',monospace;font-size:11px;color:#484f58}

.skin-scroll{max-height:240px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#21262d transparent;margin-bottom:12px}
.skin-opt{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;cursor:pointer;transition:all .15s;border:1px solid transparent}
.skin-opt:hover{background:#111827;border-color:#161b22}
.skin-img{width:52px;height:38px;object-fit:contain;flex-shrink:0;border-radius:4px}
.wear-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px}
.wear-btn{padding:8px 4px;border-radius:6px;border:1px solid #21262d;background:#07090f;color:#484f58;font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;text-align:center;transition:all .15s}
.wear-btn:hover:not(.unavail){border-color:#30363d;color:#9ca3af}
.wear-btn.sel{border-color:#3fb950;background:rgba(63,185,80,.07);color:#3fb950}
.wear-btn.unavail{opacity:.25;cursor:not-allowed}
.price-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.price-box{background:#07090f;border:1px solid #161b22;border-radius:8px;padding:12px}
.price-box-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;color:#484f58;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
.price-box-val{font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:500;margin-top:6px}
.price-box-sub{font-size:10px;color:#30363d;margin-top:4px;word-break:break-all}
.cmp-bar{background:#07090f;border:1px solid #161b22;border-radius:8px;padding:12px;margin-bottom:12px}
.cmp-track{height:6px;background:#161b22;border-radius:3px;overflow:hidden;margin:10px 0 6px}
.cmp-fill{height:100%;border-radius:3px;transition:width .5s ease}
.cmp-labels{display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:10px}
.spin{width:14px;height:14px;border:2px solid #21262d;border-top-color:#3fb950;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
.btn-add{font-family:'Share Tech Mono',monospace;font-size:12px;padding:10px;border-radius:7px;border:none;background:#3fb950;color:#04260a;cursor:pointer;font-weight:600;width:100%;letter-spacing:.06em;transition:opacity .15s,transform .1s}
.btn-add:hover:not(:disabled){opacity:.88}
.btn-add:active:not(:disabled){transform:scale(.98)}
.btn-add:disabled{opacity:.35;cursor:not-allowed}
.btn-del{font-family:'Share Tech Mono',monospace;font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid #21262d;background:transparent;color:#484f58;cursor:pointer;transition:all .15s;flex-shrink:0}
.btn-del:hover{border-color:#f85149;color:#f85149}
.btn-link{background:none;border:none;color:#484f58;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;text-decoration:underline;padding:0}
.btn-link:hover{color:#9ca3af}
.muted{font-family:'Share Tech Mono',monospace;font-size:10px;color:#484f58}
.err{font-family:'Share Tech Mono',monospace;font-size:10px;color:#f85149;margin-top:6px}
.refresh-btn{font-family:'Share Tech Mono',monospace;font-size:10px;padding:4px 12px;border-radius:5px;border:1px solid #21262d;background:transparent;color:#484f58;cursor:pointer;transition:all .15s}
.refresh-btn:hover{border-color:#3fb950;color:#3fb950}
.price-current{display:flex;align-items:baseline;gap:10px;margin-bottom:4px}
.price-big{font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:500;color:#e6edf3}
.price-change{font-family:'Share Tech Mono',monospace;font-size:13px}
.chart-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;color:#30363d;font-family:'Share Tech Mono',monospace;font-size:11px;text-align:center;gap:8px}
.auto-badge{display:inline-flex;align-items:center;gap:4px;font-family:'Share Tech Mono',monospace;font-size:9px;color:#3fb950;background:rgba(63,185,80,.08);border:1px solid rgba(63,185,80,.2);border-radius:4px;padding:2px 8px}
`;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function parseSteamPrice(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(".", "").replace(",", ".")
    : cleaned.replace(",", ".");
  return parseFloat(normalized) || null;
}

async function fetchSteamPrice(marketName) {
  const res = await fetch(STEAM_PROXY(marketName));
  if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (!data.success) throw new Error("Skin introuvable.");
  return parseSteamPrice(data.lowest_price ?? data.median_price);
}

function formatTime(ts, range) {
  const d = new Date(ts);
  if (range === "1h" || range === "24h") return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (range === "7d") return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

// ── TOOLTIP ───────────────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 8, padding: "10px 14px", fontFamily: "'Share Tech Mono',monospace" }}>
      <p style={{ color: "#6e7681", fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke, fontSize: 12, margin: "2px 0" }}>
          {p.name}: {Number(p.value).toFixed(2)} €
        </p>
      ))}
    </div>
  );
};

const KpiCard = ({ label, value, sub, color = "#c9d1d9" }) => (
  <div className="kpi">
    <div className="klbl">{label}</div>
    <div className="kval" style={{ color }}>{value}</div>
    {sub && <div className="ksub">{sub}</div>}
  </div>
);

// ── WEAPON COMBOBOX ───────────────────────────────────────────────────────────
function WeaponCombobox({ weapons, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const filtered = query.trim()
    ? weapons.filter(w => w.name.toLowerCase().includes(query.toLowerCase()))
    : weapons;

  const popular = filtered.filter(w => POPULAR_WEAPONS.includes(w.name));
  const others = filtered.filter(w => !POPULAR_WEAPONS.includes(w.name));

  function pick(w) {
    setDisplayValue(w.name);
    setQuery("");
    setOpen(false);
    onSelect(w);
  }

  function handleInputChange(e) {
    setQuery(e.target.value);
    setDisplayValue(e.target.value);
    setOpen(true);
  }

  function handleFocus() {
    setOpen(true);
    setQuery("");
  }

  function handleBlur(e) {
    if (wrapRef.current && wrapRef.current.contains(e.relatedTarget)) return;
    setOpen(false);
    setQuery("");
  }

  function highlight(name) {
    if (!query.trim()) return name;
    const i = name.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return name;
    return (
      <>
        {name.slice(0, i)}
        <mark style={{ background: "none", color: "#3fb950", fontStyle: "normal" }}>
          {name.slice(i, i + query.length)}
        </mark>
        {name.slice(i + query.length)}
      </>
    );
  }

  const renderOpts = (list) => list.map(w => (
    <div
      key={w.id}
      className="combo-opt"
      onMouseDown={() => pick(w)}
    >
      {highlight(w.name)}
    </div>
  ));

  return (
    <div className="combo-wrap" ref={wrapRef} onBlur={handleBlur}>
      <input
        ref={inputRef}
        className={`combo-input${open ? " open" : ""}`}
        value={open ? (query || displayValue) : displayValue}
        placeholder="Choisir une arme…"
        onChange={handleInputChange}
        onFocus={handleFocus}
        autoComplete="off"
      />
      <span className={`combo-arrow${open ? " open" : ""}`}>▼</span>
      {open && (
        <div className="combo-dd">
          {filtered.length === 0 && (
            <div className="combo-empty">Aucun résultat pour "{query}"</div>
          )}
          {popular.length > 0 && !query.trim() && (
            <>
              <div className="combo-sep">Populaires</div>
              {renderOpts(popular)}
              {others.length > 0 && <div className="combo-sep">Toutes les armes</div>}
            </>
          )}
          {query.trim() ? renderOpts(filtered) : renderOpts(others)}
        </div>
      )}
    </div>
  );
}

// ── ADD SKIN PANEL ────────────────────────────────────────────────────────────
function AddSkinPanel({ onAdd }) {
  const [open, setOpen] = useState(true);
  const [allSkins, setAllSkins] = useState([]);
  const [loadingDB, setLoadingDB] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [selWeapon, setSelWeapon] = useState(null);
  const [skinSearch, setSkinSearch] = useState("");
  const [selSkin, setSelSkin] = useState(null);
  const [selWear, setSelWear] = useState(null);
  const [buyPrice, setBuyPrice] = useState("");
  const [marketPrice, setMarketPrice] = useState(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [rawMarketName, setRawMarketName] = useState("");

  useEffect(() => {
    if (!open || allSkins.length > 0) return;
    setLoadingDB(true);
    fetch(SKINS_API).then(r => r.json())
      .then(data => setAllSkins(data.filter(s => s.name && s.weapon?.name)))
      .catch(() => setDbError("Impossible de charger la base."))
      .finally(() => setLoadingDB(false));
  }, [open]);

  const weapons = [...new Map(allSkins.map(s => [s.weapon.name, s.weapon])).values()]
    .sort((a, b) => {
      const ai = POPULAR_WEAPONS.indexOf(a.name);
      const bi = POPULAR_WEAPONS.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

  const skinsForWeapon = selWeapon
    ? allSkins.filter(s => s.weapon.name === selWeapon.name && (skinSearch === "" || s.name.toLowerCase().includes(skinSearch.toLowerCase())))
    : [];

  useEffect(() => {
    if (!selSkin || !selWear) { setMarketPrice(null); setPriceError(null); return; }
    const name = `${selSkin.name} (${selWear})`;
    setRawMarketName(name);
    setFetchingPrice(true); setPriceError(null); setMarketPrice(null);
    fetchSteamPrice(name)
      .then(p => setMarketPrice(p))
      .catch(e => setPriceError(e.message))
      .finally(() => setFetchingPrice(false));
  }, [selSkin, selWear]);

  const step = !selWeapon ? 1 : !selSkin ? 2 : !selWear ? 3 : 4;

  const reset = (w) => {
    setSelWeapon(w);
    setSelSkin(null);
    setSelWear(null);
    setSkinSearch("");
    setMarketPrice(null);
    setBuyPrice("");
    setPriceError(null);
  };

  const buyNum = parseFloat(buyPrice) || 0;
  const profit = marketPrice != null ? marketPrice - buyNum : null;
  const pct = buyNum > 0 && profit != null ? (profit / buyNum) * 100 : null;
  const canAdd = selSkin && selWear && buyNum > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      weapon: selWeapon.name,
      name: `${selSkin.name.split("|")[1]?.trim() ?? selSkin.name} ${WEAR_LABELS[selWear] ?? ""}`.trim(),
      fullName: rawMarketName,
      buy: buyNum,
      marketPrice,
      image: selSkin.image,
      rarity: selSkin.rarity,
      color: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)],
    });
    reset(null);
  };

  return (
    <div className="add-panel">
      <div className="add-panel-hdr" onClick={() => setOpen(o => !o)}>
        <span className="card-title">+ Ajouter un skin</span>
        <span className={`chevron${open ? " open" : ""}`}>▲</span>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>
          <div className="steps">
            {["Arme", "Skin", "Usure", "Prix"].map((s, i) => (
              <div key={s} className={`step${step > i + 1 ? " done" : step === i + 1 ? " active" : ""}`}>
                <span className="step-num">{step > i + 1 ? "✓" : i + 1}</span>{s}
              </div>
            ))}
          </div>

          {loadingDB && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
              <div className="spin" /><span className="muted">Chargement de la base…</span>
            </div>
          )}
          {dbError && <p className="err">{dbError}</p>}

          {!loadingDB && !dbError && (
            <>
              {/* ÉTAPE 1 — ARME */}
              <div className="sec-lbl">
                {selWeapon
                  ? <span style={{ color: "#3fb950" }}>✓ {selWeapon.name} <button className="btn-link" onClick={() => reset(null)}>modifier</button></span>
                  : "1. Arme"}
              </div>

              {!selWeapon && (
                <WeaponCombobox weapons={weapons} onSelect={(w) => reset(w)} />
              )}

              {/* ÉTAPE 2 — SKIN */}
              {selWeapon && (
                <>
                  <div className="sec-lbl" style={{ marginTop: 10 }}>
                    {selSkin
                      ? <span style={{ color: "#3fb950" }}>✓ {selSkin.name.split("|")[1]?.trim()} <button className="btn-link" onClick={() => { setSelSkin(null); setSelWear(null); setMarketPrice(null); }}>modifier</button></span>
                      : `2. Skin (${skinsForWeapon.length})`}
                  </div>

                  {!selSkin && (
                    <>
                      <input
                        className="inp"
                        style={{ marginBottom: 8 }}
                        placeholder="Rechercher un skin…"
                        value={skinSearch}
                        onChange={e => setSkinSearch(e.target.value)}
                      />
                      <div className="skin-scroll">
                        {skinsForWeapon.map(s => (
                          <div key={s.id} className="skin-opt" onClick={() => { setSelSkin(s); setSelWear(null); setMarketPrice(null); }}>
                            {s.image && <img src={s.image} className="skin-img" alt="" loading="lazy" />}
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#e6edf3" }}>{s.name.split("|")[1]?.trim()}</div>
                              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: s.rarity?.color ?? "#484f58", marginTop: 2 }}>{s.rarity?.name ?? "—"}</div>
                            </div>
                          </div>
                        ))}
                        {skinsForWeapon.length === 0 && <p className="muted" style={{ padding: "12px 0" }}>Aucun résultat.</p>}
                      </div>
                    </>
                  )}

                  {/* ÉTAPE 3 — USURE */}
                  {selSkin && (
                    <>
                      <div className="sec-lbl" style={{ marginTop: 10 }}>
                        {selWear
                          ? <span style={{ color: "#3fb950" }}>✓ {selWear} <button className="btn-link" onClick={() => setSelWear(null)}>modifier</button></span>
                          : "3. Usure"}
                      </div>

                      {!selWear && (
                        <div className="wear-grid">
                          {WEAR_ORDER.map(w => {
                            const ok = selSkin.wears?.some(sw => sw.name === w);
                            return (
                              <button key={w} className={`wear-btn${!ok ? " unavail" : ""}`} onClick={() => ok && setSelWear(w)}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{WEAR_LABELS[w]}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* ÉTAPE 4 — PRIX */}
                      {selWear && (
                        <>
                          <div className="sec-lbl" style={{ marginTop: 10 }}>4. Prix</div>
                          <div className="price-row">
                            <div className="price-box">
                              <div className="price-box-lbl">Ton prix d'achat</div>
                              <input className="inp" type="number" step="0.01" placeholder="ex: 52.00" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} style={{ fontSize: 14 }} />
                              {buyNum > 0 && <div className="price-box-val" style={{ color: "#58a6ff" }}>{buyNum.toFixed(2)} €</div>}
                            </div>
                            <div className="price-box">
                              <div className="price-box-lbl">Steam lowest_price</div>
                              {fetchingPrice && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}><div className="spin" /><span className="muted">Proxy…</span></div>}
                              {!fetchingPrice && marketPrice != null && <div className="price-box-val" style={{ color: "#3fb950" }}>{marketPrice.toFixed(2)} €</div>}
                              {!fetchingPrice && priceError && <p className="err" style={{ marginTop: 8 }}>{priceError}</p>}
                              <div className="price-box-sub">{rawMarketName}</div>
                            </div>
                          </div>

                          {buyNum > 0 && marketPrice != null && (
                            <div className="cmp-bar">
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span className="muted">Achat vs marché</span>
                                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: profit >= 0 ? "#3fb950" : "#f85149" }}>
                                  {profit >= 0 ? "+" : ""}{profit.toFixed(2)} € ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="cmp-track">
                                <div className="cmp-fill" style={{ width: `${Math.min(100, (Math.min(buyNum, marketPrice) / Math.max(buyNum, marketPrice)) * 100)}%`, background: profit >= 0 ? "#3fb950" : "#f85149" }} />
                              </div>
                              <div className="cmp-labels">
                                <span style={{ color: "#58a6ff" }}>Achat {buyNum.toFixed(2)} €</span>
                                <span style={{ color: "#3fb950" }}>Marché {marketPrice.toFixed(2)} €</span>
                              </div>
                            </div>
                          )}

                          <button className="btn-add" disabled={!canAdd} onClick={handleAdd}>
                            {canAdd ? "Ajouter →" : "Saisissez un prix d'achat"}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function CS2Dashboard() {
  const [portfolio, setPortfolio] = useState([]);
  const [tab, setTab] = useState("valeur");
  const [timeRange, setTimeRange] = useState("all");
  const [weaponFilter, setWeaponFilter] = useState("Tout");
  const [hidden, setHidden] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [priceHistory, setPriceHistory] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);
  const injected = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (injected.current) return;
    const s = document.createElement("style"); s.textContent = CSS;
    document.head.appendChild(s); injected.current = true;
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(HISTORY_URL());
      if (res.ok) setPriceHistory(await res.json());
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const recordPrices = useCallback(async () => {
    if (portfolio.length === 0) return;
    setRefreshing(true);
    try {
      const names = portfolio.map(s => s.fullName);
      const res = await fetch(RECORD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skins: names }),
      });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(prev => prev.map(s => {
          const r = data.recorded[s.fullName];
          return r?.success ? { ...s, marketPrice: r.price, lastRefresh: new Date().toISOString() } : s;
        }));
        await loadHistory();
        setLastRefresh(new Date());
      }
    } catch {}
    setRefreshing(false);
  }, [portfolio, loadHistory]);

  useEffect(() => {
    if (portfolio.length === 0) return;
    intervalRef.current = setInterval(recordPrices, AUTO_REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [portfolio.length, recordPrices]);

  const addSkin = useCallback((skin) => {
    setPortfolio(prev => [...prev, { ...skin, id: Date.now(), addedAt: new Date().toISOString() }]);
    setTimeout(loadHistory, 500);
  }, [loadHistory]);

  const deleteSkin = (id) => {
    setPortfolio(prev => prev.filter(s => s.id !== id));
    setHidden(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const toggleHidden = (id) => setHidden(prev => ({ ...prev, [id]: !prev[id] }));

  const weapons = ["Tout", ...Array.from(new Set(portfolio.map(s => s.weapon)))];
  const activeSkins = weaponFilter === "Tout" ? portfolio : portfolio.filter(s => s.weapon === weaponFilter);
  const totalBuy = activeSkins.reduce((a, s) => a + s.buy, 0);
  const totalMarket = activeSkins.reduce((a, s) => a + (s.marketPrice ?? s.buy), 0);
  const profit = totalMarket - totalBuy;
  const pct = totalBuy > 0 ? (profit / totalBuy) * 100 : 0;
  const profitColor = profit >= 0 ? "#3fb950" : "#f85149";

  const now = Date.now();
  const rangeMs = TIME_RANGES.find(r => r.key === timeRange)?.ms ?? Infinity;
  const cutoff = rangeMs === Infinity ? 0 : now - rangeMs;

  const buildValueTimeline = () => {
    const allTimes = new Set();
    activeSkins.forEach(s => {
      const h = priceHistory[s.fullName] || [];
      h.forEach(pt => { if (pt.t >= cutoff) allTimes.add(pt.t); });
    });
    const sortedTimes = [...allTimes].sort((a, b) => a - b);
    if (sortedTimes.length === 0) return [];
    return sortedTimes.map(t => {
      const point = { time: t, label: formatTime(t, timeRange) };
      let total = 0, totalBuyRef = 0;
      activeSkins.forEach(s => {
        const h = priceHistory[s.fullName] || [];
        const before = h.filter(p => p.t <= t);
        const price = before.length > 0 ? before[before.length - 1].p : (s.marketPrice ?? s.buy);
        if (!hidden[s.id]) { total += price; totalBuyRef += s.buy; point[s.name] = price; }
      });
      point.valeur = total; point.profit = total - totalBuyRef; point.prix_initial = totalBuyRef;
      return point;
    });
  };

  const timeline = portfolio.length > 0 ? buildValueTimeline() : [];
  const hasHistory = timeline.length > 1;
  const firstVal = timeline.length > 0 ? timeline[0].valeur : totalMarket;
  const lastVal = timeline.length > 0 ? timeline[timeline.length - 1].valeur : totalMarket;
  const changeAbs = lastVal - firstVal;
  const changePct = firstVal > 0 ? (changeAbs / firstVal) * 100 : 0;

  const comparisonData = activeSkins.filter(s => !hidden[s.id]).map(s => ({
    name: s.name.length > 16 ? s.name.slice(0, 14) + "…" : s.name,
    achat: s.buy, marche: s.marketPrice ?? s.buy, color: s.color,
  }));

  return (
    <div className="d">
      <div className="hdr">
        <div className="pulse" />
        <span className="htitle">CS2 // INVENTORY TRACKER</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          {lastRefresh && <span className="muted">màj {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
          <span className="auto-badge"><div className="pulse" style={{ width: 5, height: 5 }} /> auto {AUTO_REFRESH_MS / 60000}min</span>
        </div>
      </div>

      <div className="kpis">
        <KpiCard label="investi" value={totalBuy > 0 ? `${totalBuy.toFixed(2)} €` : "—"} sub={`${activeSkins.length} skin${activeSkins.length !== 1 ? "s" : ""}`} />
        <KpiCard label="valeur marché" value={totalMarket > 0 ? `${totalMarket.toFixed(2)} €` : "—"} sub="Steam lowest price" />
        <KpiCard label="profit / perte" value={totalBuy > 0 ? `${profit >= 0 ? "+" : ""}${profit.toFixed(2)} €` : "—"} sub={totalBuy > 0 ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)} %` : ""} color={totalBuy > 0 ? profitColor : "#484f58"} />
        <KpiCard label="skins" value={activeSkins.length} sub="via Steam API" />
      </div>

      <AddSkinPanel onAdd={addSkin} />

      {portfolio.length > 0 && <>
        <div className="card">
          <div className="card-hdr">
            <div>
              <span className="card-title">Évolution du portefeuille</span>
              {hasHistory && tab === "valeur" && (
                <div className="price-current" style={{ marginTop: 8 }}>
                  <span className="price-big">{lastVal.toFixed(2)} €</span>
                  <span className="price-change" style={{ color: changeAbs >= 0 ? "#3fb950" : "#f85149" }}>
                    {changeAbs >= 0 ? "+" : ""}{changeAbs.toFixed(2)} € ({changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="refresh-btn" onClick={recordPrices} disabled={refreshing}>
                  {refreshing ? "..." : "↻ Rafraîchir"}
                </button>
                <div className="tabs">
                  {["valeur", "profit", "skins", "comparaison"].map(t => (
                    <button key={t} className={`tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {tab !== "comparaison" && (
                <div className="time-tabs">
                  {TIME_RANGES.map(r => (
                    <button key={r.key} className={`time-tab${timeRange === r.key ? " on" : ""}`} onClick={() => setTimeRange(r.key)}>{r.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="legend">
            {tab === "valeur" && <><span className="leg"><span className="legdot" style={{ background: "#3fb950" }} />Valeur actuelle</span><span className="leg"><span className="legdot" style={{ background: "#f85149", opacity: .5 }} />Prix initial</span></>}
            {tab === "profit" && <span className="leg"><span className="legdot" style={{ background: "#58a6ff" }} />Profit net</span>}
            {tab === "skins" && activeSkins.map(s => (
              <span key={s.id} className={`leg${hidden[s.id] ? " dim" : ""}`} onClick={() => toggleHidden(s.id)}>
                <span className="legdot" style={{ background: hidden[s.id] ? "#30363d" : s.color }} />{s.name}
              </span>
            ))}
            {tab === "comparaison" && <><span className="leg"><span className="legdot" style={{ background: "#58a6ff" }} />Achat</span><span className="leg"><span className="legdot" style={{ background: "#3fb950" }} />Marché</span></>}
          </div>

          {tab === "comparaison" ? (
            comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, comparisonData.length * 48 + 40)}>
                <BarChart data={comparisonData} layout="vertical" margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#161b22" horizontal={false} />
                  <XAxis type="number" tick={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, fill: "#484f58" }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(0) + "€"} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, fill: "#6e7681" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="achat" name="Achat" fill="#58a6ff" barSize={12} radius={[0, 3, 3, 0]} />
                  <Bar dataKey="marche" name="Marché" fill="#3fb950" barSize={12} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">Ajoutez des skins pour voir la comparaison.</div>
          ) : hasHistory ? (
            <ResponsiveContainer width="100%" height={280}>
              {tab === "valeur" ? (
                <AreaChart data={timeline} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3fb950" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#3fb950" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#161b22" />
                  <XAxis dataKey="label" tick={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, fill: "#484f58" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, fill: "#484f58" }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(0) + "€"} width={52} orientation="right" domain={["dataMin - 5", "dataMax + 5"]} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="valeur" name="Valeur" stroke="#3fb950" strokeWidth={2} fill="url(#gVal)" dot={false} activeDot={{ r: 4, fill: "#3fb950" }} />
                  <Line type="monotone" dataKey="prix_initial" name="Prix initial" stroke="#f85149" strokeWidth={1} strokeDasharray="6 3" dot={false} opacity={0.5} />
                </AreaChart>
              ) : tab === "profit" ? (
                <AreaChart data={timeline} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#58a6ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#161b22" />
                  <XAxis dataKey="label" tick={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, fill: "#484f58" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, fill: "#484f58" }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(0) + "€"} width={52} orientation="right" />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={0} stroke="#21262d" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#58a6ff" strokeWidth={2} fill="url(#gProf)" dot={false} activeDot={{ r: 4, fill: "#58a6ff" }} />
                </AreaChart>
              ) : (
                <LineChart data={timeline} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#161b22" />
                  <XAxis dataKey="label" tick={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, fill: "#484f58" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, fill: "#484f58" }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(0) + "€"} width={52} orientation="right" domain={["dataMin - 2", "dataMax + 2"]} />
                  <Tooltip content={<Tip />} />
                  {activeSkins.map(s => !hidden[s.id] && (
                    <Line key={s.id} type="monotone" dataKey={s.name} name={s.name} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: s.color }} connectNulls />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">
              <div style={{ fontSize: 24 }}>📈</div>
              <p>Les courbes apparaîtront avec le temps.</p>
              <p>Cliquez "↻ Rafraîchir" pour enregistrer un premier point.</p>
            </div>
          )}
        </div>

        <div className="bot">
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="sec-lbl">mes skins</div>
            <div className="pills">{weapons.map(w => <button key={w} className={`pill${weaponFilter === w ? " on" : ""}`} onClick={() => setWeaponFilter(w)}>{w}</button>)}</div>
            <div className="slist">
              {activeSkins.map(s => {
                const curr = s.marketPrice ?? s.buy;
                const delta = curr - s.buy;
                const col = delta >= 0 ? "#3fb950" : "#f85149";
                const dpct = s.buy > 0 ? (delta / s.buy) * 100 : 0;
                const pts = (priceHistory[s.fullName] || []).length;
                return (
                  <div key={s.id} className={`srow${hidden[s.id] ? " dim" : ""}`} onClick={() => toggleHidden(s.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {s.image ? <img src={s.image} style={{ width: 44, height: 32, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} alt="" /> : <span style={{ width: 3, height: 34, background: s.color, flexShrink: 0 }} />}
                      <div>
                        <div className="sname">{s.name}</div>
                        <div className="sweap">{s.weapon} · achat {s.buy.toFixed(2)} € · {pts} pts</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div>
                        <div className="sprice" style={{ color: "#e6edf3" }}>{curr.toFixed(2)} €</div>
                        <div className="sdelta" style={{ color: col }}>{delta >= 0 ? "+" : ""}{delta.toFixed(2)} € ({dpct >= 0 ? "+" : ""}{dpct.toFixed(1)}%)</div>
                      </div>
                      <button className="btn-del" onClick={e => { e.stopPropagation(); deleteSkin(s.id); }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="sec-lbl">récapitulatif</div>
            <div className="statgrid">
              <div className="statbox"><div className="stlbl">investi</div><div className="stval">{totalBuy.toFixed(2)} €</div><div className="stfoot">total achat</div></div>
              <div className="statbox"><div className="stlbl">marché</div><div className="stval" style={{ color: "#3fb950" }}>{totalMarket.toFixed(2)} €</div><div className="stfoot">Steam lowest</div></div>
            </div>
            <div className="statgrid">
              <div className="statbox"><div className="stlbl">profit / perte</div><div className="stval" style={{ color: profitColor }}>{profit >= 0 ? "+" : ""}{profit.toFixed(2)} €</div><div className="stfoot">{pct >= 0 ? "+" : ""}{pct.toFixed(1)} %</div></div>
              <div className="statbox"><div className="stlbl">données</div><div className="stval">{Object.values(priceHistory).reduce((a, h) => a + h.length, 0)}</div><div className="stfoot">points enregistrés</div></div>
            </div>
            {activeSkins.length > 0 && <>
              <div className="sec-lbl" style={{ marginTop: 6 }}>top performances</div>
              {[...activeSkins].sort((a, b) => ((b.marketPrice ?? b.buy) - b.buy) / b.buy - ((a.marketPrice ?? a.buy) - a.buy) / a.buy).slice(0, 3).map((s, i) => {
                const d = (s.marketPrice ?? s.buy) - s.buy;
                const dp = s.buy > 0 ? (d / s.buy) * 100 : 0;
                return (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 2 ? "1px solid #111827" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="muted" style={{ width: 16 }}>#{i + 1}</span>
                      {s.image && <img src={s.image} style={{ width: 28, height: 20, objectFit: "contain", borderRadius: 2 }} alt="" />}
                      <span style={{ fontSize: 11, color: "#e6edf3" }}>{s.name}</span>
                    </div>
                    <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: dp >= 0 ? "#3fb950" : "#f85149" }}>{dp >= 0 ? "+" : ""}{dp.toFixed(1)}%</span>
                  </div>
                );
              })}
            </>}
          </div>
        </div>
      </>}

      {portfolio.length === 0 && (
        <div className="chart-empty" style={{ padding: "48px 20px" }}>
          <div style={{ fontSize: 36 }}>🎯</div>
          AUCUN SKIN — utilisez le panneau ci-dessus pour commencer
        </div>
      )}
    </div>
  );
}