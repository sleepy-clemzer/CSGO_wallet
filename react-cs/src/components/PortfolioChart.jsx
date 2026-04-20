import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { RANGES } from "../constants/index.js";
import { fmt, xTickFormatter } from "../utils/index.js";

export function PortfolioChart({
  tab, setTab, range, setRange,
  timeline, active, hidden, onToggleHide,
  compData, totalBuy,
  accentCol, redCol, gridCol, tickCol, isDark,
  theme,
}) {
  const hasHist  = timeline.length >= 2;
  const firstVal = timeline.length ? timeline[0].valeur : 0;
  const lastVal  = timeline.length ? timeline[timeline.length - 1].valeur : 0;
  const chgAbs   = lastVal - firstVal;
  const chgPct   = firstVal > 0 ? (chgAbs / firstVal) * 100 : 0;
  const isUp     = chgAbs >= 0;

  const Tip = (props) => <ChartTooltip {...props} theme={theme} />;

  const xAxis = (
    <XAxis
      dataKey="time"
      type="number"
      scale="time"
      domain={["dataMin", "dataMax"]}
      tickLine={false}
      axisLine={false}
      tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fill:tickCol }}
      tickFormatter={(t) => xTickFormatter(t, range)}
      interval="preserveStartEnd"
    />
  );

  return (
    <div className="card mb12" style={{ marginBottom:12 }}>
      {/* Header */}
      <div className="chart-top">
        <div>
          <div className="card-title" style={{ marginBottom:8 }}>Évolution du portefeuille</div>
          {hasHist && (
            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
              <span className="price-big">{fmt(lastVal)} €</span>
              <span className={`price-chip ${isUp ? "chip-up" : "chip-dn"}`}>
                {isUp ? "+" : ""}{fmt(chgAbs)} € ({isUp ? "+" : ""}{fmt(chgPct, 2)}%)
              </span>
            </div>
          )}
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

      {/* Legend for skins tab */}
      {tab === "skins" && (
        <div className="leg-row">
          {active.map(s => (
            <span key={s.id} className={`leg-it${hidden[s.id] ? " dim" : ""}`} onClick={() => onToggleHide(s.id)}>
              <span className="leg-dot" style={{ background: hidden[s.id] ? "var(--border)" : s.color }}/>
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="chart-area">
        {tab === "comparaison" ? (
          compData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, compData.length * 44 + 30)}>
              <BarChart data={compData} layout="vertical" margin={{ top:4, right:16, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={gridCol} horizontal={false}/>
                <XAxis type="number" tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fill:tickCol }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(0) + "€"}/>
                <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily:"'Inter',sans-serif", fontSize:11, fill:tickCol }} tickLine={false} axisLine={false}/>
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
                tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fill:tickCol }}
                tickLine={false} axisLine={false}
                tickFormatter={v => v.toFixed(0) + "€"}
                width={50} orientation="right"
                domain={[(dataMin) => Math.min(dataMin, totalBuy) - 3, (dataMax) => dataMax + 3]}
              />
              <Tooltip content={<Tip/>} cursor={{ stroke:"rgba(128,128,128,0.1)", strokeWidth:1, fill:"transparent" }}/>
              <ReferenceLine
                y={totalBuy}
                stroke={redCol}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                opacity={0.7}
                label={{ value:`Investi ${totalBuy.toFixed(2)}€`, position:"insideTopRight", fill:redCol, fontSize:10, fontFamily:"'JetBrains Mono',monospace" }}
              />
              <Area type="monotone" dataKey="valeur" name="Valeur" stroke={accentCol} strokeWidth={1.5} fill="url(#gV)" dot={false} activeDot={{ r:3, fill:accentCol, strokeWidth:0 }}/>
            </AreaChart>
          </ResponsiveContainer>

        ) : tab === "profit" ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timeline} margin={{ top:4, right:16, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentCol} stopOpacity={0.12}/>
                  <stop offset="100%" stopColor={accentCol} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke={gridCol}/>
              {xAxis}
              <YAxis tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fill:tickCol }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(0) + "€"} width={50} orientation="right"/>
              <Tooltip content={<Tip/>} cursor={{ stroke:"rgba(128,128,128,0.1)", strokeWidth:1, fill:"transparent" }}/>
              <ReferenceLine y={0} stroke={isDark ? "#222" : "#ddd"} strokeDasharray="3 3"/>
              <Area type="monotone" dataKey="profit" name="Profit" stroke={accentCol} strokeWidth={1.5} fill="url(#gP)" dot={false} activeDot={{ r:3, fill:accentCol, strokeWidth:0 }}/>
            </AreaChart>
          </ResponsiveContainer>

        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeline} margin={{ top:4, right:16, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke={gridCol}/>
              {xAxis}
              <YAxis tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fill:tickCol }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(0) + "€"} width={50} orientation="right" domain={["dataMin - 2","dataMax + 2"]}/>
              <Tooltip content={<Tip/>} cursor={{ stroke:"rgba(128,128,128,0.1)", strokeWidth:1, fill:"transparent" }}/>
              {active.map(s => !hidden[s.id] && (
                <Line key={s.id} type="monotone" dataKey={s.name} name={s.name} stroke={s.color} strokeWidth={1.5} dot={false} activeDot={{ r:3, strokeWidth:0 }} connectNulls/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}