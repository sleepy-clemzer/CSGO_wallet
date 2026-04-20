import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { fmt } from "../utils/index.js";

export function RecapCard({ compData, active, totalBuy, totalMarket, profit, pct, accentCol, redCol, gridCol, tickCol, isDark, theme }) {
  const Tip = (props) => <ChartTooltip {...props} theme={theme} />;

  return (
    <div className="bot-grid">
      {/* Profit par skin */}
      <div className="card">
        <div className="card-pad">
          <div className="card-title">Profit par skin</div>
          {compData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(160, compData.length * 42 + 20)}>
              <BarChart data={compData} layout="vertical" margin={{ top:0, right:16, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={gridCol} horizontal={false}/>
                <XAxis type="number" tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fill:tickCol }} tickLine={false} axisLine={false} tickFormatter={v => (v >= 0 ? "+" : "") + v.toFixed(0) + "€"}/>
                <YAxis type="category" dataKey="name" width={100} tick={{ fontFamily:"'Inter',sans-serif", fontSize:11, fill:tickCol }} tickLine={false} axisLine={false}/>
                <Tooltip content={<Tip/>} cursor={{ fill:"rgba(128,128,128,0.05)" }}/>
                <ReferenceLine x={0} stroke={isDark ? "#1e1e1e" : "#e4e4e7"}/>
                <Bar dataKey="profit" name="Profit" barSize={11} radius={[0,3,3,0]}>
                  {compData.map((e, i) => (
                    <Cell key={i} fill={e.profit >= 0 ? accentCol : redCol} fillOpacity={0.8}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty" style={{ height:160 }}><p>Aucun skin</p></div>
          )}
        </div>
      </div>

      {/* Récapitulatif */}
      <div className="card card-pad">
        <div className="card-title">Récapitulatif</div>
        <div className="stat-grid mb16">
          {[
            { label:"Investi",       val:`${fmt(totalBuy)} €`,    color:"var(--fg)" },
            { label:"Valeur marché", val:`${fmt(totalMarket)} €`, color:accentCol },
            { label:"Profit total",  val:`${profit >= 0 ? "+" : ""}${fmt(profit)} €`, color:profit >= 0 ? accentCol : redCol },
            { label:"Performance",   val:`${pct >= 0 ? "+" : ""}${fmt(pct, 1)} %`,    color:pct >= 0 ? accentCol : redCol },
          ].map(item => (
            <div key={item.label} className="stat-cell">
              <div className="stat-label">{item.label}</div>
              <div className="stat-val" style={{ color:item.color }}>{item.val}</div>
            </div>
          ))}
        </div>

        {active.length > 0 && <>
          <div className="card-title" style={{ marginBottom:10 }}>Top performances</div>
          {[...active].sort((a, b) => {
            const pa = a.buy > 0 ? ((a.marketPrice ?? a.buy) - a.buy) / a.buy : 0;
            const pb = b.buy > 0 ? ((b.marketPrice ?? b.buy) - b.buy) / b.buy : 0;
            return pb - pa;
          }).slice(0, 4).map((s, i) => {
            const d  = (s.marketPrice ?? s.buy) - s.buy;
            const dp = s.buy > 0 ? (d / s.buy) * 100 : 0;
            return (
              <div key={s.id} className="perf-item">
                <span className="perf-rank">#{i+1}</span>
                {s.image && <img src={s.image} style={{ width:30, height:21, objectFit:"contain", borderRadius:3, marginRight:6 }} alt=""/>}
                <span className="perf-name">{s.name}</span>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div className="perf-val" style={{ color: dp >= 0 ? accentCol : redCol }}>{dp >= 0 ? "+" : ""}{dp.toFixed(1)}%</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"var(--muted)" }}>{d >= 0 ? "+" : ""}{d.toFixed(2)} €</div>
                </div>
              </div>
            );
          })}
        </>}
      </div>
    </div>
  );
}