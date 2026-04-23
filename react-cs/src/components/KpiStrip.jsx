import { fmt } from "../utils/index.js";

export function KpiStrip({
  totalBuy,
  totalMarket,
  profit,
  pct,
  totalPts,
  activeCount,
  accentCol,
  redCol
}) {
  return (
    <div className="kpi-strip">
      
      {/* Investi */}
      <div className="kpi-cell">
        <div className="kpi-cell-label">Investi</div>
        <div className="kpi-cell-val">{fmt(totalBuy)} €</div>
        <div className="kpi-cell-sub">
          {activeCount} skin{activeCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Valeur marché */}
      <div className="kpi-cell">
        <div className="kpi-cell-label">Valeur marché</div>
        <div className="kpi-cell-val">{fmt(totalMarket)} €</div>
        <div className="kpi-cell-sub">Steam lowest listing</div>
      </div>

      {/* Profit / Perte */}
      <div className="kpi-cell">
        <div className="kpi-cell-label">Profit / Perte</div>
        <div
          className="kpi-cell-val"
          style={{ color: profit >= 0 ? accentCol : redCol }}
        >
          {profit >= 0 ? "+" : ""}
          {fmt(profit)} €
        </div>
        <div className="kpi-cell-sub">
          {pct >= 0 ? "+" : ""}{fmt(pct, 1)} % depuis l'achat
        </div>
        <div className="kpi-cell-sub" style={{ opacity: 0.55 }}>
          Basé sur le lowest listing actuel
        </div>
      </div>

      {/* Points de données */}
      <div className="kpi-cell">
        <div className="kpi-cell-label">Points de données</div>
        <div className="kpi-cell-val">{totalPts}</div>
        <div className="kpi-cell-sub">timeline Steam (backend)</div>
      </div>

    </div>
  );
}
