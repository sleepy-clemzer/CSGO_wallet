import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { useTheme } from "../hooks/useTheme";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SKINS_API  = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const PROXY      = import.meta.env.VITE_STEAM_PROXY_URL || "http://localhost:3001";
const STEAM_URL  = (n) => `${PROXY}/steam-price?name=${encodeURIComponent(n)}`;
const HIST_URL   = (n) => n ? `${PROXY}/price-history?name=${encodeURIComponent(n)}` : `${PROXY}/price-history`;
const RECORD_URL = `${PROXY}/record-prices`;
const AUTO_MS    = 30 * 60 * 1000;

const WEAR_MAP   = { "Factory New":"FN","Minimal Wear":"MW","Field-Tested":"FT","Well-Worn":"WW","Battle-Scarred":"BS" };
const WEAR_ORDER = ["Factory New","Minimal Wear","Field-Tested","Well-Worn","Battle-Scarred"];
const COLORS     = ["#00cc6a","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#10b981","#f97316","#a78bfa"];

const RANGES = [
  { key:"1h",  label:"1H",  ms:3600000 },
  { key:"24h", label:"24H", ms:86400000 },
  { key:"7d",  label:"7J",  ms:604800000 },
  { key:"30d", label:"30J", ms:2592000000 },
  { key:"all", label:"MAX", ms:Infinity },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function parseSteamPrice(raw) {
  if (!raw) return null;
  const c = raw.replace(/\s/g,"").replace(/[^\d.,]/g,"");
  const n = c.includes(",") && c.includes(".") ? c.replace(".","").replace(",",".") : c.replace(",",".");
  return parseFloat(n) || null;
}
async function fetchSteamPrice(name) {
  const r = await fetch(STEAM_URL(name));
  if (!r.ok) throw new Error(`Proxy ${r.status}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  if (!d.success) throw new Error("Introuvable.");
  return parseSteamPrice(d.lowest_price ?? d.median_price);
}
function fmtTime(ts, range) {
  const d = new Date(ts);
  if (range==="1h"||range==="24h") return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  if (range==="7d") return d.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric"});
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
}
function fmt(n, decimals=2) {
  return n != null ? n.toFixed(decimals) : "—";
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── THEME VARIABLES ── */
:root {
  --bg:        #f4f4f5;
  --bg2:       #ffffff;
  --fg:        #0a0a0b;
  --fg2:       #3f3f46;
  --muted:     #71717a;
  --border:    #e4e4e7;
  --card:      #ffffff;
  --card2:     #f9f9fa;
  --accent:    #00cc6a;
  --accent-bg: rgba(0,204,106,0.08);
  --red:       #ef4444;
  --red-bg:    rgba(239,68,68,0.08);
  --input-bg:  #f4f4f5;
  --hover-bg:  #efefef;
  --shadow:    0 1px 3px rgba(0,0,0,0.08);
}

:root.dark {
  --bg:        #0a0a0a;
  --bg2:       #0f0f0f;
  --fg:        #f5f5f5;
  --fg2:       #a1a1aa;
  --muted:     #555;
  --border:    #1a1a1a;
  --card:      #0f0f0f;
  --card2:     #111;
  --accent:    #00ff87;
  --accent-bg: rgba(0,255,135,0.08);
  --red:       #ff4d4d;
  --red-bg:    rgba(255,77,77,0.08);
  --input-bg:  #111;
  --hover-bg:  #141414;
  --shadow:    0 1px 3px rgba(0,0,0,0.5);
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg);
  font-family: 'Inter', -apple-system, sans-serif;
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
  transition: background 0.2s, color 0.2s;
}

/* ── LAYOUT ── */
.shell {
  display: grid;
  grid-template-rows: 52px 1fr;
  grid-template-columns: 300px 1fr;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* ── TOPBAR ── */
.topbar {
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  gap: 12px;
  z-index: 50;
  transition: background 0.2s, border-color 0.2s;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
  letter-spacing: -0.01em;
}
.logo-mark {
  width: 28px; height: 28px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.topbar-sep { width: 1px; height: 20px; background: var(--border); margin: 0 4px; }
.topbar-label { font-size: 12px; color: var(--muted); font-weight: 400; }
.ms-left { margin-left: auto; }
.badge-live {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--card);
  font-size: 11px; font-weight: 500; color: var(--fg2);
}
.dot-live { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: blink 2s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
.btn-top {
  height: 30px; padding: 0 12px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--card);
  color: var(--fg2); font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.btn-top:hover { border-color: var(--muted); color: var(--fg); }
.btn-top:disabled { opacity: .4; cursor: not-allowed; }
.btn-theme {
  height: 30px; width: 30px; padding: 0;
  border-radius: 6px; border: 1px solid var(--border);
  background: var(--card); color: var(--fg2);
  font-size: 15px; cursor: pointer; transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.btn-theme:hover { border-color: var(--muted); color: var(--fg); }

/* ── SIDEBAR ── */
.sidebar {
  grid-column: 1; grid-row: 2;
  border-right: 1px solid var(--border);
  background: var(--bg);
  overflow-y: auto; overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
  transition: background 0.2s, border-color 0.2s;
}
.sidebar-inner { padding: 16px; }

/* ── MAIN ── */
.main {
  grid-column: 2; grid-row: 2;
  overflow-y: auto; overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
  padding: 20px 24px;
  background: var(--bg);
  transition: background 0.2s;
}

/* ── SECTION HEADER ── */
.sec-head {
  font-size: 11px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: .08em;
  padding-bottom: 12px; margin-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

/* ── KPI STRIP ── */
.kpi-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
.kpi-cell { background: var(--card); padding: 16px 18px; transition: background 0.2s; }
.kpi-cell-label { font-size: 11px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 8px; }
.kpi-cell-val { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 500; color: var(--fg); line-height: 1; }
.kpi-cell-sub { font-size: 11px; color: var(--muted); margin-top: 5px; }

/* ── CARD ── */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: background 0.2s, border-color 0.2s;
}
.card-pad { padding: 16px 18px; }
.card-title { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 14px; }

/* ── CHART HEADER ── */
.chart-top { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 18px 0; gap: 12px; flex-wrap: wrap; }
.price-big { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 500; color: var(--fg); line-height: 1; }
.price-chip {
  display: inline-block; padding: 3px 8px; border-radius: 5px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500;
}
.chip-up { color: var(--accent); background: var(--accent-bg); }
.chip-dn { color: var(--red); background: var(--red-bg); }
.chart-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.tab-row { display: flex; gap: 2px; background: var(--card2); border-radius: 7px; padding: 2px; }
.t-btn {
  padding: 5px 12px; border-radius: 5px; border: none;
  background: transparent; color: var(--muted);
  font-size: 12px; font-weight: 500; cursor: pointer; transition: all .12s;
}
.t-btn.on { background: var(--card); color: var(--fg); box-shadow: var(--shadow); }
.t-btn:hover:not(.on) { color: var(--fg2); }
.range-row { display: flex; gap: 2px; }
.r-btn {
  padding: 4px 9px; border-radius: 5px; border: 1px solid transparent;
  background: transparent; color: var(--muted);
  font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 500;
  cursor: pointer; transition: all .12s;
}
.r-btn.on { border-color: var(--border); color: var(--accent); background: var(--accent-bg); }
.r-btn:hover:not(.on) { color: var(--fg2); }

/* ── LEGEND ── */
.leg-row { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 18px 0; }
.leg-it { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; color: var(--muted); cursor: pointer; user-select: none; transition: opacity .12s; }
.leg-it.dim { opacity: .3; }
.leg-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.chart-area { padding: 12px 0 0; }

/* ── CHART EMPTY ── */
.chart-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 220px; gap: 8px; color: var(--border); text-align: center; }
.chart-empty .e-icon { font-size: 36px; margin-bottom: 4px; }
.chart-empty p { font-size: 12px; line-height: 1.6; max-width: 280px; color: var(--muted); }

/* ── BOTTOM GRID ── */
.bot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }

/* ── STATS MINI GRID ── */
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
.stat-cell { background: var(--card); padding: 12px 14px; transition: background 0.2s; }
.stat-label { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 5px; }
.stat-val { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 500; }

/* ── PERF LIST ── */
.perf-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); }
.perf-item:last-child { border-bottom: none; }
.perf-rank { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); width: 18px; flex-shrink: 0; }
.perf-name { font-size: 12px; font-weight: 500; color: var(--fg2); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.perf-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; }

/* ── SKIN LIST ── */
.skin-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: background .12s; border: 1px solid transparent; }
.skin-item:hover { background: var(--hover-bg); border-color: var(--border); }
.skin-item.dim { opacity: .3; }
.skin-item-info { flex: 1; min-width: 0; }
.skin-item-name { font-size: 12px; font-weight: 500; color: var(--fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skin-item-sub { font-size: 10px; color: var(--muted); margin-top: 2px; }
.skin-item-price { text-align: right; flex-shrink: 0; }
.skin-price-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; color: var(--fg2); }
.skin-price-delta { font-family: 'JetBrains Mono', monospace; font-size: 10px; }
.skin-del { width: 24px; height: 24px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; transition: all .12s; }
.skin-del:hover { border-color: var(--red); color: var(--red); background: var(--red-bg); }

/* ── FILTER PILLS ── */
.f-pills { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
.f-pill { padding: 3px 10px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-size: 11px; font-weight: 500; cursor: pointer; transition: all .12s; }
.f-pill.on { border-color: var(--border); color: var(--accent); background: var(--accent-bg); }
.f-pill:hover:not(.on) { color: var(--fg2); border-color: var(--muted); }

/* ── ADD FORM ── */
.steps-bar { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
.step-c { background: var(--card); padding: 8px; text-align: center; font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; transition: all .15s; }
.step-c.done { color: var(--accent); background: var(--accent-bg); }
.step-c.active { color: var(--fg); background: var(--card2); }
.step-n { display: block; font-size: 15px; font-weight: 700; margin-bottom: 2px; }

.f-label { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 5px; }
.f-inp {
  width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 8px 11px; color: var(--fg); font-family: 'Inter', sans-serif; font-size: 13px;
  outline: none; transition: border-color .15s;
}
.f-inp:focus { border-color: var(--muted); }
.f-inp::placeholder { color: var(--muted); }

/* ── DROPDOWN ── */
.dd { position: relative; width: 100%; margin-bottom: 14px; }
.dd-trigger {
  width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 8px 11px; color: var(--muted); font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
  transition: border-color .15s; text-align: left;
}
.dd-trigger.has-val { color: var(--fg); }
.dd-trigger:hover, .dd-trigger.open { border-color: var(--muted); }
.dd-arrow { font-size: 10px; color: var(--muted); transition: transform .2s; flex-shrink: 0; }
.dd-arrow.open { transform: rotate(180deg); }
.dd-menu {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--card); border: 1px solid var(--border); border-radius: 10px;
  z-index: 200; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  animation: fadeIn .12s ease;
}
@keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
.dd-search { padding: 8px; border-bottom: 1px solid var(--border); }
.dd-search input {
  width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
  padding: 7px 10px; color: var(--fg); font-size: 12px; outline: none;
  transition: border-color .15s;
}
.dd-search input:focus { border-color: var(--muted); }
.dd-search input::placeholder { color: var(--muted); }
.dd-list { max-height: 200px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
.dd-opt { padding: 8px 12px; font-size: 12px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all .1s; }
.dd-opt:hover { background: var(--hover-bg); color: var(--fg); }
.dd-opt.sel { color: var(--accent); }
.dd-empty { padding: 14px; text-align: center; font-size: 11px; color: var(--muted); }

/* ── SKIN OPTS ── */
.skin-opts { max-height: 200px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; overflow-x: hidden; }
.sk-opt { display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer; transition: background .1s; border-bottom: 1px solid var(--border); }
.sk-opt:last-child { border-bottom: none; }
.sk-opt:hover { background: var(--hover-bg); }
.sk-opt img { width: 44px; height: 30px; object-fit: contain; flex-shrink: 0; }
.sk-opt-name { font-size: 12px; font-weight: 500; color: var(--fg2); }
.sk-opt-rare { font-size: 10px; margin-top: 1px; }

/* ── WEAR ── */
.wear-row { display: grid; grid-template-columns: repeat(5,1fr); gap: 4px; margin-bottom: 12px; }
.w-btn { padding: 8px 2px; border-radius: 6px; border: 1px solid var(--border); background: var(--card); color: var(--muted); font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 500; cursor: pointer; text-align: center; transition: all .12s; }
.w-btn:hover:not(.na) { border-color: var(--muted); color: var(--fg2); }
.w-btn.sel { border-color: var(--border); background: var(--accent-bg); color: var(--accent); }
.w-btn.na { opacity: .2; cursor: not-allowed; }

/* ── PRICE BOXES ── */
.p-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.p-box { background: var(--card2); border: 1px solid var(--border); border-radius: 8px; padding: 11px 13px; }
.p-box-lbl { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 7px; }
.p-box-val { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 500; }

/* ── COMPARE BAR ── */
.cmp { background: var(--card2); border: 1px solid var(--border); border-radius: 8px; padding: 11px 13px; margin-bottom: 12px; }
.cmp-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px; }
.cmp-lbl { color: var(--muted); }
.cmp-track { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
.cmp-fill { height: 100%; border-radius: 2px; transition: width .5s; }
.cmp-labs { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10px; }

/* ── BTN ADD ── */
.btn-add {
  width: 100%; padding: 10px; border-radius: 8px; border: none;
  background: var(--accent); color: #0a0a0a;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: opacity .15s;
  letter-spacing: -.01em;
}
.btn-add:hover:not(:disabled) { opacity: .85; }
.btn-add:disabled { opacity: .3; cursor: not-allowed; }

.btn-lnk { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 10px; text-decoration: underline; padding: 0; }
.btn-lnk:hover { color: var(--fg2); }
.spin { width: 12px; height: 12px; border: 1.5px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.err-txt { font-size: 11px; color: var(--red); margin-top: 4px; }
.muted { font-size: 11px; color: var(--muted); }
.mb8 { margin-bottom: 8px; }
.mb12 { margin-bottom: 12px; }
.mb16 { margin-bottom: 16px; }
.divider { height: 1px; background: var(--border); margin: 14px 0; }

/* ── RECHARTS ── */
.recharts-wrapper { background: transparent !important; }
.recharts-surface { overflow: visible; background: transparent !important; }
.recharts-tooltip-cursor { fill: rgba(128,128,128,0.05) !important; stroke: none !important; }
.recharts-area-area { fill-opacity: 1; }
.recharts-cartesian-grid rect { display: none !important; }
`;

// ── DROPDOWN ─────────────────────────────────────────────────────────────────
function WeaponDropdown({ weapons, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const inp = useRef(null);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (open) setTimeout(() => inp.current?.focus(), 60); }, [open]);

  const list = q ? weapons.filter(w => w.name.toLowerCase().includes(q.toLowerCase())) : weapons;

  return (
    <div className="dd" ref={ref}>
      <button className={`dd-trigger${value?" has-val":""}${open?" open":""}`}
        onClick={() => { setOpen(o => !o); setQ(""); }}>
        <span>{value?.name || "Sélectionner une arme..."}</span>
        <span className={`dd-arrow${open?" open":""}`}>▾</span>
      </button>
      {open && (
        <div className="dd-menu">
          <div className="dd-search">
            <input ref={inp} placeholder="AK-47, AWP, Glock..." value={q} onChange={e => setQ(e.target.value)} onClick={e => e.stopPropagation()} />
          </div>
          <div className="dd-list">
            {list.length === 0 && <div className="dd-empty">Aucun résultat</div>}
            {list.map(w => (
              <div key={w.id} className={`dd-opt${value?.id === w.id ? " sel" : ""}`}
                onClick={() => { onChange(w); setOpen(false); setQ(""); }}>
                {w.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TOOLTIP ───────────────────────────────────────────────────────────────────
const Tip = ({ active, payload, label, theme }) => {
  if (!active || !payload?.length) return null;
  const isDark = theme === "dark";
  return (
    <div style={{
      background: isDark ? "#111" : "#fff",
      border: `1px solid ${isDark ? "#222" : "#e4e4e7"}`,
      borderRadius: 8, padding: "9px 12px",
      fontFamily: "'JetBrains Mono',monospace",
      boxShadow: isDark ? "0 12px 40px rgba(0,0,0,.8)" : "0 4px 20px rgba(0,0,0,0.1)"
    }}>
      <p style={{ color: isDark ? "#555" : "#71717a", fontSize: 10, marginBottom: 6, fontFamily: "'Inter',sans-serif", fontWeight: 500 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke || (isDark ? "#ccc" : "#3f3f46"), fontSize: 11, margin: "2px 0" }}>
          {p.name}: {Number(p.value).toFixed(2)} €
        </p>
      ))}
    </div>
  );
};

// ── ADD PANEL ─────────────────────────────────────────────────────────────────
function AddPanel({ onAdd, allSkins, loadingDB, dbError }) {
  const [selW, setSelW]         = useState(null);
  const [skinQ, setSkinQ]       = useState("");
  const [selS, setSelS]         = useState(null);
  const [selWr, setSelWr]       = useState(null);
  const [buy, setBuy]           = useState("");
  const [mktP, setMktP]         = useState(null);
  const [fetching, setFetching] = useState(false);
  const [pErr, setPErr]         = useState(null);
  const [rawN, setRawN]         = useState("");

  const weapons = [...new Map(allSkins.map(s => [s.weapon.name, s.weapon])).values()].sort((a,b) => a.name.localeCompare(b.name));
  const skins4W = selW ? allSkins.filter(s => s.weapon.name === selW.name && (skinQ === "" || s.name.toLowerCase().includes(skinQ.toLowerCase()))) : [];

  useEffect(() => {
    if (!selS || !selWr) { setMktP(null); setPErr(null); return; }
    const name = `${selS.name} (${selWr})`;
    setRawN(name); setFetching(true); setPErr(null); setMktP(null);
    fetchSteamPrice(name).then(p => setMktP(p)).catch(e => setPErr(e.message)).finally(() => setFetching(false));
  }, [selS, selWr]);

  const step = !selW ? 1 : !selS ? 2 : !selWr ? 3 : 4;
  const resetW = (w) => { setSelW(w); setSelS(null); setSelWr(null); setSkinQ(""); setMktP(null); setBuy(""); setPErr(null); };
  const buyN = parseFloat(buy) || 0;
  const profit = mktP != null ? mktP - buyN : null;
  const pct = buyN > 0 && profit != null ? (profit / buyN) * 100 : null;
  const canAdd = selS && selWr && buyN > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ weapon: selW.name, name: `${selS.name.split("|")[1]?.trim() ?? selS.name} ${WEAR_MAP[selWr] ?? ""}`.trim(), fullName: rawN, buy: buyN, marketPrice: mktP, image: selS.image, rarity: selS.rarity, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    resetW(null);
  };

  return (
    <>
      <div className="sec-head">Ajouter un skin</div>
      <div className="steps-bar">
        {["Arme","Skin","Usure","Prix"].map((s,i) => (
          <div key={s} className={`step-c${step>i+1?" done":step===i+1?" active":""}`}>
            <span className="step-n">{step>i+1?"✓":i+1}</span>{s}
          </div>
        ))}
      </div>

      {loadingDB && <div style={{ display:"flex",alignItems:"center",gap:8 }}><div className="spin"/><span className="muted">Chargement...</span></div>}
      {dbError && <p className="err-txt">{dbError}</p>}
      {!loadingDB && !dbError && <>
        <div className="f-label">
          {selW ? <span style={{ color:"var(--accent)" }}>✓ {selW.name} <button className="btn-lnk" onClick={() => resetW(null)}>changer</button></span> : "Arme"}
        </div>
        {!selW && <WeaponDropdown weapons={weapons} value={selW} onChange={resetW} />}
        {selW && <div style={{ padding:"7px 11px",background:"var(--input-bg)",border:"1px solid var(--border)",borderRadius:8,fontSize:13,color:"var(--fg)",marginBottom:14 }}>{selW.name}</div>}

        {selW && <>
          <div className="f-label mb8">
            {selS ? <span style={{ color:"var(--accent)" }}>✓ {selS.name.split("|")[1]?.trim()} <button className="btn-lnk" onClick={() => { setSelS(null); setSelWr(null); setMktP(null); }}>changer</button></span> : `Skin (${skins4W.length})`}
          </div>
          {!selS && <>
            <input className="f-inp mb8" placeholder="Rechercher un skin..." value={skinQ} onChange={e => setSkinQ(e.target.value)} />
            <div className="skin-opts">
              {skins4W.map(s => (
                <div key={s.id} className="sk-opt" onClick={() => { setSelS(s); setSelWr(null); setMktP(null); }}>
                  {s.image && <img src={s.image} alt="" />}
                  <div>
                    <div className="sk-opt-name">{s.name.split("|")[1]?.trim()}</div>
                    <div className="sk-opt-rare" style={{ color:s.rarity?.color??"var(--muted)" }}>{s.rarity?.name}</div>
                  </div>
                </div>
              ))}
              {skins4W.length === 0 && <div style={{ padding:12,textAlign:"center",fontSize:11,color:"var(--muted)" }}>Aucun résultat</div>}
            </div>
          </>}
          {selS && <div style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"var(--input-bg)",borderRadius:8,border:"1px solid var(--border)",marginBottom:14 }}>
            {selS.image && <img src={selS.image} style={{ width:40,height:27,objectFit:"contain",borderRadius:4 }} alt=""/>}
            <span style={{ fontSize:12,fontWeight:500,color:"var(--fg2)" }}>{selS.name.split("|")[1]?.trim()}</span>
          </div>}
        </>}

        {selS && <>
          <div className="f-label mb8">
            {selWr ? <span style={{ color:"var(--accent)" }}>✓ {selWr} <button className="btn-lnk" onClick={() => setSelWr(null)}>changer</button></span> : "Usure"}
          </div>
          {!selWr && <div className="wear-row">
            {WEAR_ORDER.map(w => {
              const ok = selS.wears?.some(sw => sw.name === w);
              return <button key={w} className={`w-btn${!ok?" na":""}`} onClick={() => ok && setSelWr(w)}><div style={{ fontSize:13,fontWeight:700 }}>{WEAR_MAP[w]}</div></button>;
            })}
          </div>}
          {selWr && <div style={{ padding:"7px 11px",background:"var(--input-bg)",border:"1px solid var(--border)",borderRadius:8,fontSize:13,color:"var(--fg2)",marginBottom:14 }}>{selWr}</div>}
        </>}

        {selWr && <>
          <div className="p-boxes">
            <div className="p-box">
              <div className="p-box-lbl">Ton achat</div>
              <input className="f-inp" type="number" step="0.01" placeholder="0.00" value={buy} onChange={e => setBuy(e.target.value)} style={{ fontSize:14 }}/>
              {buyN > 0 && <div className="p-box-val" style={{ color:"var(--accent)",marginTop:6,fontSize:16 }}>{buyN.toFixed(2)} €</div>}
            </div>
            <div className="p-box">
              <div className="p-box-lbl">Steam</div>
              {fetching && <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:6 }}><div className="spin"/><span className="muted">...</span></div>}
              {!fetching && mktP != null && <div className="p-box-val" style={{ color:"var(--accent)",marginTop:6,fontSize:16 }}>{mktP.toFixed(2)} €</div>}
              {!fetching && pErr && <p className="err-txt">{pErr}</p>}
              <div style={{ fontSize:9,color:"var(--border)",marginTop:4,wordBreak:"break-all" }}>{rawN}</div>
            </div>
          </div>
          {buyN > 0 && mktP != null && (
            <div className="cmp">
              <div className="cmp-top">
                <span className="cmp-lbl">Achat vs marché</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:500,color:profit>=0?"var(--accent)":"var(--red)" }}>
                  {profit>=0?"+":""}{profit.toFixed(2)} € ({pct>=0?"+":""}{pct.toFixed(1)}%)
                </span>
              </div>
              <div className="cmp-track"><div className="cmp-fill" style={{ width:`${Math.min(100,(Math.min(buyN,mktP)/Math.max(buyN,mktP))*100)}%`,background:profit>=0?"var(--accent)":"var(--red)" }}/></div>
              <div className="cmp-labs">
                <span style={{ color:"var(--muted)" }}>Achat {buyN.toFixed(2)} €</span>
                <span style={{ color:"var(--accent)" }}>Marché {mktP.toFixed(2)} €</span>
              </div>
            </div>
          )}
          <button className="btn-add" disabled={!canAdd} onClick={handleAdd}>
            {canAdd ? "Ajouter au portefeuille" : "Saisissez un prix d'achat"}
          </button>
        </>}
      </>}
    </>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function CS2Dashboard() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [portfolio, setPortfolio] = useState([]);
  const [tab, setTab]             = useState("valeur");
  const [range, setRange]         = useState("all");
  const [wFilter, setWFilter]     = useState("Tout");
  const [hidden, setHidden]       = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory]     = useState({});
  const [lastRef, setLastRef]     = useState(null);
  const [allSkins, setAllSkins]   = useState([]);
  const [loadDB, setLoadDB]       = useState(false);
  const [dbErr, setDbErr]         = useState(null);
  const injected = useRef(false);
  const timerRef = useRef(null);

  // Inject CSS once
  useEffect(() => {
    if (injected.current) return;
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    injected.current = true;
  }, []);

  useEffect(() => {
    setLoadDB(true);
    fetch(SKINS_API).then(r => r.json())
      .then(d => setAllSkins(d.filter(s => s.name && s.weapon?.name)))
      .catch(() => setDbErr("Impossible de charger la base."))
      .finally(() => setLoadDB(false));
  }, []);

  const loadHistory = useCallback(async () => {
    try { const r = await fetch(HIST_URL()); if (r.ok) setHistory(await r.json()); } catch {}
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const recordPrices = useCallback(async () => {
    if (!portfolio.length) return;
    setRefreshing(true);
    try {
      const r = await fetch(RECORD_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ skins:portfolio.map(s => s.fullName) }) });
      if (r.ok) {
        const d = await r.json();
        setPortfolio(p => p.map(s => { const rr = d.recorded[s.fullName]; return rr?.success ? {...s,marketPrice:rr.price} : s; }));
        await loadHistory();
        setLastRef(new Date());
      }
    } catch {}
    setRefreshing(false);
  }, [portfolio, loadHistory]);

  useEffect(() => {
    if (!portfolio.length) return;
    timerRef.current = setInterval(recordPrices, AUTO_MS);
    return () => clearInterval(timerRef.current);
  }, [portfolio.length, recordPrices]);

  const addSkin = useCallback((skin) => {
    setPortfolio(p => [...p, {...skin, id:Date.now()}]);
    setTimeout(loadHistory, 600);
  }, [loadHistory]);
  const delSkin = (id) => {
    setPortfolio(p => p.filter(s => s.id !== id));
    setHidden(h => { const n={...h}; delete n[id]; return n; });
  };
  const toggleHide = (id) => setHidden(h => ({...h,[id]:!h[id]}));

  // ── Derived ──────────────────────────────────────────────────────────────────
  const weapons = ["Tout", ...Array.from(new Set(portfolio.map(s => s.weapon)))];
  const active  = wFilter === "Tout" ? portfolio : portfolio.filter(s => s.weapon === wFilter);
  const totalBuy    = active.reduce((a,s) => a+s.buy, 0);
  const totalMarket = active.reduce((a,s) => a+(s.marketPrice??s.buy), 0);
  const profit  = totalMarket - totalBuy;
  const pct     = totalBuy > 0 ? (profit/totalBuy)*100 : 0;

  // ── Timeline ──────────────────────────────────────────────────────────────────
  const now = Date.now();
  const rangeMs = RANGES.find(r => r.key === range)?.ms ?? Infinity;
  const cutoff  = rangeMs === Infinity ? 0 : now - rangeMs;

  const buildTimeline = () => {
    const allTs = new Set();
    active.forEach(s => { (history[s.fullName]||[]).forEach(p => { if(p.t >= cutoff) allTs.add(p.t); }); });
    const sorted = [...allTs].sort((a,b) => a-b);

  // Si un seul point ou pas de points, on crée une timeline avec 2 points
  // pour que Recharts puisse tracer les lignes
    const base = () => {
      const pt = { time: Date.now(), label: fmtTime(Date.now(), range) };
      let tot = 0, ref = 0;
      active.forEach(s => {
        if (hidden[s.id]) return;
        const p = s.marketPrice ?? s.buy;
        tot += p; ref += s.buy; pt[s.name] = p;
      });
      pt.valeur = tot; pt.profit = tot - ref; pt.ref = ref;
      return pt;
    };

    if (!sorted.length) {
      const now2 = base();
      const earlier = { ...now2, time: Date.now() - 3600000, label: fmtTime(Date.now() - 3600000, range) };
      return [earlier, now2];
    }

    const result = sorted.map(t => {
      const pt = { time:t, label:fmtTime(t, range) };
      let tot=0, ref=0;
      active.forEach(s => {
        if (hidden[s.id]) return;
        const h = history[s.fullName]||[];
        const before = h.filter(p => p.t <= t);
        const p = before.length ? before[before.length-1].p : (s.marketPrice??s.buy);
        tot += p; ref += s.buy; pt[s.name] = p;
      });
      pt.valeur = tot; pt.profit = tot - ref; pt.ref = ref;
      return pt;
    });

    // Si un seul point, on duplique avec un décalage pour forcer l'affichage
    if (result.length === 1) {
      const earlier = { ...result[0], time: result[0].time - 3600000, label: fmtTime(result[0].time - 3600000, range) };
      return [earlier, result[0]];
    }

    return result;
  };

  const timeline  = buildTimeline();
  const hasHist   = timeline.length >= 1;
  const firstVal  = timeline.length ? timeline[0].valeur : totalMarket;
  const lastVal   = timeline.length ? timeline[timeline.length-1].valeur : totalMarket;
  const chgAbs    = lastVal - firstVal;
  const chgPct    = firstVal > 0 ? (chgAbs/firstVal)*100 : 0;
  const isUp      = chgAbs >= 0;

  const compData = active.filter(s => !hidden[s.id]).map(s => ({
    name: s.name.length > 13 ? s.name.slice(0,11)+"…" : s.name,
    achat: s.buy, marche: s.marketPrice??s.buy,
    profit: (s.marketPrice??s.buy)-s.buy, color:s.color,
  }));

  const totalPts = Object.values(history).reduce((a,h) => a+h.length, 0);

  // ── Chart colors based on theme ───────────────────────────────────────────────
  const isDark    = theme === "dark";
  const accentCol = isDark ? "#00ff87" : "#00cc6a";
  const redCol    = isDark ? "#ff4d4d" : "#ef4444";
  const gridCol   = isDark ? "#141414" : "#f0f0f0";
  const tickCol   = isDark ? "#555" : "#71717a";

  const TipWithTheme = (props) => <Tip {...props} theme={theme} />;

  return (
    <div className="shell">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-mark">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="7" style={{ fill:"var(--card)",stroke:"var(--border)",strokeWidth:1 }}/>
              <path d="M14 5L19 11H9L14 5Z" style={{ fill:"var(--accent)" }}/>
              <path d="M14 23L9 17H19L14 23Z" style={{ fill:"var(--accent)",opacity:0.5 }}/>
              <rect x="11" y="11" width="6" height="6" rx="1" style={{ fill:"var(--accent)",opacity:0.9 }}/>
            </svg>
          </div>
          CS2 Tracker
        </div>
        <div className="topbar-sep"/>
        <span className="topbar-label">Portfolio</span>
        <div className="ms-left" style={{ display:"flex",alignItems:"center",gap:8 }}>
          {lastRef && <span className="muted" style={{ fontSize:11 }}>màj {lastRef.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>}
          <div className="badge-live"><div className="dot-live"/>LIVE · auto {AUTO_MS/60000}min</div>
          <button className="btn-top" onClick={recordPrices} disabled={refreshing}>
            {refreshing ? "..." : "↻ Actualiser"}
          </button>
          <button className="btn-theme" onClick={toggleTheme} title="Changer le thème">
            {mounted ? (isDark ? "☀️" : "🌙") : null}
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-inner">
          <AddPanel onAdd={addSkin} allSkins={allSkins} loadingDB={loadDB} dbError={dbErr} />
          {portfolio.length > 0 && <>
            <div className="divider"/>
            <div className="sec-head">Mes skins</div>
            {weapons.length > 2 && (
              <div className="f-pills mb12">
                {weapons.map(w => <button key={w} className={`f-pill${wFilter===w?" on":""}`} onClick={() => setWFilter(w)}>{w}</button>)}
              </div>
            )}
            <div>
              {active.map(s => {
                const curr = s.marketPrice ?? s.buy;
                const d = curr - s.buy;
                const dp = s.buy > 0 ? (d/s.buy)*100 : 0;
                const col = d >= 0 ? accentCol : redCol;
                return (
                  <div key={s.id} className={`skin-item${hidden[s.id]?" dim":""}`} onClick={() => toggleHide(s.id)}>
                    <div style={{ width:3,height:32,background:s.color,borderRadius:2,flexShrink:0 }}/>
                    {s.image ? <img src={s.image} style={{ width:44,height:30,objectFit:"contain",flexShrink:0 }} alt=""/> : <div style={{ width:44,height:30,background:"var(--card2)",borderRadius:4,flexShrink:0 }}/>}
                    <div className="skin-item-info">
                      <div className="skin-item-name">{s.name}</div>
                      <div className="skin-item-sub">{s.weapon} · {s.buy.toFixed(2)} €</div>
                    </div>
                    <div className="skin-item-price">
                      <div className="skin-price-val">{curr.toFixed(2)} €</div>
                      <div className="skin-price-delta" style={{ color:col }}>{d>=0?"+":""}{dp.toFixed(1)}%</div>
                    </div>
                    <button className="skin-del" onClick={e => { e.stopPropagation(); delSkin(s.id); }}>×</button>
                  </div>
                );
              })}
            </div>
          </>}
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        {portfolio.length === 0 ? (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12,textAlign:"center" }}>
            <div style={{ fontSize:56 }}>🎯</div>
            <div style={{ fontSize:20,fontWeight:600,color:"var(--fg)" }}>Aucun skin</div>
            <p style={{ fontSize:13,color:"var(--muted)",maxWidth:340,lineHeight:1.7 }}>Ajoutez vos premiers skins via le panneau de gauche. Les courbes d'évolution se construiront automatiquement.</p>
          </div>
        ) : <>
          {/* KPI STRIP */}
          <div className="kpi-strip">
            <div className="kpi-cell">
              <div className="kpi-cell-label">Investi</div>
              <div className="kpi-cell-val">{fmt(totalBuy)} €</div>
              <div className="kpi-cell-sub">{active.length} skin{active.length!==1?"s":""}</div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-cell-label">Valeur marché</div>
              <div className="kpi-cell-val">{fmt(totalMarket)} €</div>
              <div className="kpi-cell-sub">Steam lowest price</div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-cell-label">Profit / Perte</div>
              <div className="kpi-cell-val" style={{ color:profit>=0?accentCol:redCol }}>{profit>=0?"+":""}{fmt(profit)} €</div>
              <div className="kpi-cell-sub">{pct>=0?"+":""}{fmt(pct,1)} % depuis l'achat</div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-cell-label">Points de données</div>
              <div className="kpi-cell-val">{totalPts}</div>
              <div className="kpi-cell-sub">enregistrés par le proxy</div>
            </div>
          </div>

          {/* CHART CARD */}
          <div className="card mb12" style={{ marginBottom:12 }}>
            <div className="chart-top">
              <div>
                <div className="card-title" style={{ marginBottom:8 }}>Évolution du portefeuille</div>
                {hasHist && (
                  <div style={{ display:"flex",alignItems:"baseline",gap:10 }}>
                    <span className="price-big">{fmt(lastVal)} €</span>
                    <span className={`price-chip ${isUp?"chip-up":"chip-dn"}`}>
                      {isUp?"+":""}{fmt(chgAbs)} € ({isUp?"+":""}{fmt(chgPct,2)}%)
                    </span>
                  </div>
                )}
              </div>
              <div className="chart-controls">
                <div className="tab-row">
                  {["valeur","profit","skins","comparaison"].map(t => (
                    <button key={t} className={`t-btn${tab===t?" on":""}`} onClick={() => setTab(t)}>
                      {t.charAt(0).toUpperCase()+t.slice(1)}
                    </button>
                  ))}
                </div>
                {tab !== "comparaison" && (
                  <div className="range-row">
                    {RANGES.map(r => <button key={r.key} className={`r-btn${range===r.key?" on":""}`} onClick={() => setRange(r.key)}>{r.label}</button>)}
                  </div>
                )}
              </div>
            </div>

            {tab === "skins" && (
              <div className="leg-row">
                {active.map(s => (
                  <span key={s.id} className={`leg-it${hidden[s.id]?" dim":""}`} onClick={() => toggleHide(s.id)}>
                    <span className="leg-dot" style={{ background:hidden[s.id]?"var(--border)":s.color }}/>
                    {s.name}
                  </span>
                ))}
              </div>
            )}

            <div className="chart-area">
              {tab === "comparaison" ? (
                compData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(200, compData.length*44+30)}>
                    <BarChart data={compData} layout="vertical" margin={{ top:4,right:16,bottom:0,left:0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke={gridCol} horizontal={false}/>
                      <XAxis type="number" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:tickCol }} tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)+"€"}/>
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily:"'Inter',sans-serif",fontSize:11,fill:tickCol }} tickLine={false} axisLine={false}/>
                      <Tooltip content={<TipWithTheme/>} cursor={{ fill:"rgba(128,128,128,0.05)" }}/>
                      <Bar dataKey="marche" name="Marché" fill={accentCol} barSize={9} radius={[0,3,3,0]} fillOpacity={0.85}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="chart-empty"><p>Aucun skin visible.</p></div>
              ) : !hasHist ? (
                <div className="chart-empty">
                  <div className="e-icon">📈</div>
                  <p>Cliquez "↻ Actualiser" pour enregistrer le premier point de données. Les courbes se construiront au fil du temps.</p>
                </div>
              ) : tab === "valeur" ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={timeline} margin={{ top:4,right:16,bottom:0,left:0 }}>
                    <defs>
                      <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accentCol} stopOpacity={0.15}/>
                        <stop offset="100%" stopColor={accentCol} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke={gridCol}/>
                    <XAxis dataKey="label" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:tickCol }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                    <YAxis
                      tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:tickCol }}
                      tickLine={false} axisLine={false}
                      tickFormatter={v=>v.toFixed(0)+"€"}
                      width={50} orientation="right"
                      domain={[
                        (dataMin) => Math.min(dataMin, totalBuy) - 3,
                        (dataMax) => dataMax + 3
                      ]}
                    />
                    <Tooltip content={<TipWithTheme/>} cursor={{ stroke:"rgba(128,128,128,0.1)", strokeWidth:1, fill:"transparent" }}/>
                    <ReferenceLine
                      y={totalBuy}
                      stroke={redCol}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      opacity={0.7}
                      label={{
                        value: `Investi ${totalBuy.toFixed(2)}€`,
                        position: "insideTopRight",
                        fill: redCol,
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono',monospace"
                      }}
                    />
                    <Area type="monotone" dataKey="valeur" name="Valeur" stroke={accentCol} strokeWidth={1.5} fill="url(#gV)" dot={false} activeDot={{ r:3,fill:accentCol,strokeWidth:0 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : tab === "profit" ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={timeline} margin={{ top:4,right:16,bottom:0,left:0 }}>
                    <defs>
                      <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accentCol} stopOpacity={0.12}/>
                        <stop offset="100%" stopColor={accentCol} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke={gridCol}/>
                    <XAxis dataKey="label" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:tickCol }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:tickCol }} tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)+"€"} width={50} orientation="right"/>
                    <Tooltip content={<TipWithTheme/>} cursor={{ stroke:"rgba(128,128,128,0.1)", strokeWidth:1, fill:"transparent" }}/>
                    <ReferenceLine y={0} stroke={isDark?"#222":"#ddd"} strokeDasharray="3 3"/>
                    <Area type="monotone" dataKey="profit" name="Profit" stroke={accentCol} strokeWidth={1.5} fill="url(#gP)" dot={false} activeDot={{ r:3,fill:accentCol,strokeWidth:0 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={timeline} margin={{ top:4,right:16,bottom:0,left:0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke={gridCol}/>
                    <XAxis dataKey="label" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:tickCol }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:tickCol }} tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)+"€"} width={50} orientation="right" domain={["dataMin - 2","dataMax + 2"]}/>
                    <Tooltip content={<TipWithTheme/>} cursor={{ stroke:"rgba(128,128,128,0.1)", strokeWidth:1, fill:"transparent" }}/>
                    {active.map(s => !hidden[s.id] && <Line key={s.id} type="monotone" dataKey={s.name} name={s.name} stroke={s.color} strokeWidth={1.5} dot={false} activeDot={{ r:3,strokeWidth:0 }} connectNulls/>)}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* BOTTOM */}
          <div className="bot-grid">
            <div className="card">
              <div className="card-pad">
                <div className="card-title">Profit par skin</div>
                {compData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(160, compData.length*42+20)}>
                    <BarChart data={compData} layout="vertical" margin={{ top:0,right:16,bottom:0,left:0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke={gridCol} horizontal={false}/>
                      <XAxis type="number" tick={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fill:tickCol }} tickLine={false} axisLine={false} tickFormatter={v=>(v>=0?"+":"")+v.toFixed(0)+"€"}/>
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily:"'Inter',sans-serif",fontSize:11,fill:tickCol }} tickLine={false} axisLine={false}/>
                      <Tooltip content={<TipWithTheme/>} cursor={{ fill:"rgba(128,128,128,0.05)" }}/>
                      <ReferenceLine x={0} stroke={isDark?"#1e1e1e":"#e4e4e7"}/>
                      <Bar dataKey="profit" name="Profit" barSize={11} radius={[0,3,3,0]}>
                        {compData.map((e,i) => <Cell key={i} fill={e.profit>=0?accentCol:redCol} fillOpacity={0.8}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="chart-empty" style={{ height:160 }}><p>Aucun skin</p></div>}
              </div>
            </div>

            <div className="card card-pad">
              <div className="card-title">Récapitulatif</div>
              <div className="stat-grid mb16">
                {[
                  { label:"Investi",       val:`${fmt(totalBuy)} €`,    color:"var(--fg)" },
                  { label:"Valeur marché", val:`${fmt(totalMarket)} €`, color:accentCol },
                  { label:"Profit total",  val:`${profit>=0?"+":""}${fmt(profit)} €`, color:profit>=0?accentCol:redCol },
                  { label:"Performance",   val:`${pct>=0?"+":""}${fmt(pct,1)} %`,     color:pct>=0?accentCol:redCol },
                ].map(item => (
                  <div key={item.label} className="stat-cell">
                    <div className="stat-label">{item.label}</div>
                    <div className="stat-val" style={{ color:item.color }}>{item.val}</div>
                  </div>
                ))}
              </div>
              {active.length > 0 && <>
                <div className="card-title" style={{ marginBottom:10 }}>Top performances</div>
                {[...active].sort((a,b) => {
                  const pa = a.buy>0?((a.marketPrice??a.buy)-a.buy)/a.buy:0;
                  const pb = b.buy>0?((b.marketPrice??b.buy)-b.buy)/b.buy:0;
                  return pb - pa;
                }).slice(0,4).map((s,i) => {
                  const d = (s.marketPrice??s.buy) - s.buy;
                  const dp = s.buy>0?(d/s.buy)*100:0;
                  return (
                    <div key={s.id} className="perf-item">
                      <span className="perf-rank">#{i+1}</span>
                      {s.image && <img src={s.image} style={{ width:30,height:21,objectFit:"contain",borderRadius:3,marginRight:6 }} alt=""/>}
                      <span className="perf-name">{s.name}</span>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <div className="perf-val" style={{ color:dp>=0?accentCol:redCol }}>{dp>=0?"+":""}{dp.toFixed(1)}%</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--muted)" }}>{d>=0?"+":""}{d.toFixed(2)} €</div>
                      </div>
                    </div>
                  );
                })}
              </>}
            </div>
          </div>
        </>}
      </main>
    </div>
  );
}