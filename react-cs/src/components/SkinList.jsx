import React, { memo, useMemo, useCallback } from "react";

const SkinRow = memo(function SkinRow({
  s, hidden, loading, accentCol, redCol, onToggleHide, onDelete
}) {
  const curr = s.marketPrice ?? s.buy;
  const d    = curr - s.buy;
  const dp   = s.buy > 0 ? (d / s.buy) * 100 : 0;
  const col  = d >= 0 ? accentCol : redCol;

  return (
    <div
      className={`skin-item${hidden ? " dim" : ""}`}
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
          {loading && <span style={{ marginLeft:6, color:"var(--accent)" }}>⟳</span>}
        </div>
      </div>

      <div className="skin-item-price">
        <div className="skin-price-val">{curr.toFixed(2)} €</div>
        <div className="skin-price-delta" style={{ color:col }}>
          {d >= 0 ? "+" : ""}{dp.toFixed(1)}%
        </div>
      </div>

      <button
        className="skin-del"
        onClick={e => { e.stopPropagation(); onDelete(s.id); }}
      >
        ×
      </button>
    </div>
  );
});

export const SkinList = memo(function SkinList({
  active, hidden, loadingHist, accentCol, redCol,
  onToggleHide, onDelete, weapons, wFilter, onFilterChange
}) {

  const handleFilter = useCallback((w) => onFilterChange(w), [onFilterChange]);
  const handleToggle = useCallback((id) => onToggleHide(id), [onToggleHide]);
  const handleDelete = useCallback((id) => onDelete(id), [onDelete]);

  const rows = useMemo(() => {
    return active.map(s => (
      <SkinRow
        key={s.id}
        s={s}
        hidden={hidden[s.id]}
        loading={loadingHist[s.fullName]}
        accentCol={accentCol}
        redCol={redCol}
        onToggleHide={handleToggle}
        onDelete={handleDelete}
      />
    ));
  }, [active, hidden, loadingHist, accentCol, redCol, handleToggle, handleDelete]);

  return (
    <>
      {weapons.length > 2 && (
        <div className="f-pills mb12">
          {weapons.map(w => (
            <button
              key={w}
              className={`f-pill${wFilter === w ? " on" : ""}`}
              onClick={() => handleFilter(w)}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      <div>{rows}</div>
    </>
  );
});
