import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { RANGES } from "../constants/index.js";
import { fmt } from "../utils/index.js";

function cleanTimeline(timeline) {
  return timeline
    .filter(p => p.time && !isNaN(p.time))
    .sort((a, b) => a.time - b.time);
}

function getTicks(timeline, range) {
  if (!timeline.length) return [];

  const start = timeline[0].time;
  const end   = timeline[timeline.length - 1].time;

  const ticks = [];
  const addTicks = (stepMs) => {
    for (let t = start; t <= end; t += stepMs) ticks.push(t);
  };

  if (range === "1h" || range === "24h") {
    addTicks(30 * 60 * 1000);
    return ticks;
  }
  if (range === "7d") {
    addTicks(24 * 60 * 60 * 1000);
    return ticks;
  }
  if (range === "30d") {
    addTicks(2 * 24 * 60 * 60 * 1000);
    return ticks;
  }
  if (range === "1y") {
    const d = new Date(start);
    d.setHours(0,0,0,0);
    while (d.getTime() <= end) {
      ticks.push(d.getTime());
      d.setMonth(d.getMonth() + 1);
    }
    return ticks;
  }
  if (range === "all") {
    const d = new Date(start);
    d.setHours(0,0,0,0);
    while (d.getTime() <= end) {
      ticks.push(d.getTime());
      d.setMonth(d.getMonth() + 2);
    }
    return ticks;
  }

  return ticks;
}

export function PortfolioChart({
  tab, setTab, range, setRange,
  timeline, active, hidden, onToggleHide,
  compData,
  portfolio,
  accentCol, redCol, gridCol, tickCol, isDark,
  theme,
}) {

  timeline = cleanTimeline(timeline);

  const lastVal = portfolio?.marketValue    ?? 0;
  const chgAbs  = portfolio?.unrealizedPnL  ?? 0;
  const chgPct  = portfolio?.unrealizedPnLPct ?? 0;
  const isUp    = chgAbs >= 0;

  const profitTimeline = timeline.map(p => ({
    time:   p.time,
    profit: p.valeur - (portfolio?.totalBuy ?? 0)
  }));

  const Tip = (props) => <ChartTooltip {...props} theme={theme} />;

  const xAxis = (
    <XAxis
      dataKey="time"
      type="number"
      scale="time"
      domain={[timeline[0]?.time, timeline[timeline.length - 1]?.time]}
      ticks={getTicks(timeline, range)}
      allowDataOverflow={false}
      allowDuplicatedCategory={false}
      tickLine={false}
      axisLine={false}
      tick={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, fill:tickCol }}
      tickFormatter={(t) => {
        const d = new Date(t);
        if (range === "1h" || range === "24h") {
          const isStartOfDay = d.getHours() === 0 && d.getMinutes() < 30;
          if (isStartOfDay)
            return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
          return d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
        }
        if (range === "7d")
          return d.toLocaleDateString("fr-FR", { weekday:"short", day:"numeric" });
        if (range === "30d")
          return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
        if (range === "all")
          return d.toLocaleDateString("fr-FR", { month:"short", year:"2-digit" });
        return d.toLocaleDateString("fr-FR", { month:"short" });
      }}
    />
  );

  // ✅ Tous les skins pour la légende (pas juste active)
  // On a besoin de tous pour pouvoir réactiver un skin masqué
  const allSkinsForLegend = [...active, ...Object.keys(hidden)
    .filter(id => hidden[id])
    .map(id => active.find(s => s.id === id))
    .filter(Boolean)
  ];

  return (
    <div className="card mb12" style={{ marginBottom:12 }}>

      {/* HEADER */}
      <div className="chart-top">
        <div>
          <div className="card-title" style={{ marginBottom:8 }}>Évolution du portefeuille</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
            <span className="price-big">{fmt(lastVal)} €</span>
            <span className={`price-chip ${isUp ? "chip-up" : "chip-dn"}`}>
              {isUp ? "+" : ""}{fmt(chgAbs)} € ({isUp ? "+" : ""}{fmt(chgPct, 2)}%)
            </span>
          </div>
        </div>

        <div className="chart-controls">
          <div className="tab-row">
            {["valeur","profit","skins","comparaison"].map(t => (
              <button key={t} className={`t-btn${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {tab !== "comparaison" && (
            <div className="range-row">
              {RANGES.map(r => (
                <button key={r.key} className={`r-btn${range === r.key ? " on" : ""}`} onClick={() => setRange(r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LEGEND SKINS — ✅ passe par tous les skins du portfolio */}
      {tab === "skins" && (
        <div className="leg-row">
          {active.map(s => (
            <span
              key={s.id}
              className={`leg-it${hidden[s.id] ? " dim" : ""}`}
              onClick={() => onToggleHide(s.id)}
            >
              <span className="leg-dot" style={{ background: hidden[s.id] ? "var(--border)" : s.color }}/>
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* CHARTS */}
      <div className="chart-area">

        {tab === "comparaison" ? (
          compData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, compData.length * 44 + 30)}>
              <BarChart data={compData} layout="vertical" margin={{ top:4, right:16, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={gridCol} horizontal={false}/>
                <XAxis type="number" tick={{ fontFamily:"'JetBrains Mono'", fontSize:10, fill:tickCol }} tickLine={false} axisLine={false} tickFormatter={v => (v ?? 0).toFixed(0) + "€"}/>
                <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily:"'Inter'", fontSize:11, fill:tickCol }} tickLine={false} axisLine={false}/>
                <Tooltip content={<Tip/>} cursor={{ fill:"rgba(128,128,128,0.05)" }}/>
                <Bar dataKey="marche" name="Marché" fill={accentCol} barSize={9} radius={[0,3,3,0]} fillOpacity={0.85}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty"><p>Aucun skin visible.</p></div>

        ) : tab === "valeur" ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timeline} margin={{ top:4, right:16, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentCol} stopOpacity={0.15}/>
                  <stop offset="100%" stopColor={accentCol} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke={gridCol}/>
              {xAxis}
              <YAxis
                tick={{ fontFamily:"'JetBrains Mono'", fontSize:10, fill:tickCol }}
                tickLine={false} axisLine={false}
                tickFormatter={v => (v ?? 0).toFixed(0) + "€"}
                width={50} orientation="right"
                domain={[
                  (dataMin) => Math.min(dataMin, portfolio?.totalBuy ?? 0) - 3,
                  (dataMax) => dataMax + 3
                ]}
              />
              <Tooltip content={<Tip/>}/>
              <ReferenceLine
                y={portfolio?.totalBuy ?? 0}
                stroke={redCol}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                opacity={0.7}
                label={{
                  value: `Investi ${(portfolio?.totalBuy ?? 0).toFixed(2)}€`,
                  position: "insideTopRight",
                  fill: redCol,
                  fontSize: 10
                }}
              />
              <Area
                type="monotone"
                dataKey="valeur"
                stroke={accentCol}
                strokeWidth={1.5}
                fill="url(#gV)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>

        ) : tab === "profit" ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={profitTimeline} margin={{ top:4, right:16, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentCol} stopOpacity={0.12}/>
                  <stop offset="100%" stopColor={accentCol} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke={gridCol}/>
              {xAxis}
              <YAxis
                tick={{ fontFamily:"'JetBrains Mono'", fontSize:10, fill:tickCol }}
                tickLine={false} axisLine={false}
                tickFormatter={v => (v ?? 0).toFixed(0) + "€"}
                width={50} orientation="right"
              />
              <Tooltip content={<Tip/>}/>
              <ReferenceLine y={0} stroke={isDark ? "#222" : "#ddd"} strokeDasharray="3 3"/>
              <Area
                type="monotone"
                dataKey="profit"
                stroke={accentCol}
                strokeWidth={1.5}
                fill="url(#gP)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>

        ) : (
          /* ✅ SKINS — active est déjà filtré, pas besoin de !hidden[s.id] */
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeline} margin={{ top:4, right:16, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke={gridCol}/>
              {xAxis}
              <YAxis
                tick={{ fontFamily:"'JetBrains Mono'", fontSize:10, fill:tickCol }}
                tickLine={false} axisLine={false}
                tickFormatter={v => (v ?? 0).toFixed(0) + "€"}
                width={50} orientation="right"
              />
              <Tooltip content={<Tip/>}/>
              {active.map(s => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.name}
                  stroke={s.color}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

      </div>
    </div>
  );
}