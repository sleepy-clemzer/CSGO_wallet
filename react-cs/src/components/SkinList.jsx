export function SkinList({ active, hidden, loadingHist, accentCol, redCol, onToggleHide, onDelete, weapons, wFilter, onFilterChange }) {
  return (
    <>
      {weapons.length > 2 && (
        <div className="f-pills mb12">
          {weapons.map(w => (
            <button key={w} className={`f-pill${wFilter === w ? " on" : ""}`} onClick={() => onFilterChange(w)}>
              {w}
            </button>
          ))}
        </div>
      )}
      <div>
        {active.map(s => {
          const curr = s.marketPrice ?? s.buy;
          const d    = curr - s.buy;
          const dp   = s.buy > 0 ? (d / s.buy) * 100 : 0;
          const col  = d >= 0 ? accentCol : redCol;
          return (
            <div
              key={s.id}
              className={`skin-item${hidden[s.id] ? " dim" : ""}`}
              onClick={() => onToggleHide(s.id)}
            >
              <div style={{ width:3, height:32, background:s.color, borderRadius:2, flexShrink:0 }}/>
              {s.image
                ? <img src={s.image} style={{ width:44, height:30, objectFit:"contain", flexShrink:0 }} alt=""/>
                : <div style={{ width:44, height:30, background:"var(--card2)", borderRadius:4, flexShrink:0 }}/>
              }
              <div className="skin-item-info">
                <div className="skin-item-name">{s.name}</div>
                <div className="skin-item-sub">
                  {s.weapon} · {s.buy.toFixed(2)} €
                  {loadingHist[s.fullName] && <span style={{ marginLeft:6, color:"var(--accent)" }}>⟳</span>}
                </div>
              </div>
              <div className="skin-item-price">
                <div className="skin-price-val">{curr.toFixed(2)} €</div>
                <div className="skin-price-delta" style={{ color:col }}>{d >= 0 ? "+" : ""}{dp.toFixed(1)}%</div>
              </div>
              <button className="skin-del" onClick={e => { e.stopPropagation(); onDelete(s.id); }}>×</button>
            </div>
          );
        })}
      </div>
    </>
  );
}