/**
 * Skin list component.
 *
 * Renders the sidebar list of skins in the user's portfolio.
 * Supports:
 *   - Weapon type filtering (pill buttons)
 *   - Toggle visibility per skin (click on row)
 *   - Delete skin (click on × button)
 *
 * Heavily memoized to avoid unnecessary re-renders on
 * unrelated state changes (theme, range, etc.).
 */
import React, { memo, useMemo, useCallback } from "react";

/**
 * Individual skin row.
 * Memoized to prevent re-renders unless its own props change.
 *
 * @param {Object}   s            - Normalized skin object
 * @param {boolean}  hidden       - Whether this skin is hidden in charts
 * @param {boolean}  loading      - Whether history is still loading for this skin
 * @param {string}   accentCol    - Accent color token (theme-dependent)
 * @param {string}   redCol       - Red color token (theme-dependent)
 * @param {Function} onToggleHide - Callback to toggle visibility
 * @param {Function} onDelete     - Callback to delete the skin
 */
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
      {/* Rarity color indicator */}
      <div style={{ width:3, height:32, background:s.color, borderRadius:2, flexShrink:0 }}/>

      {/* Skin image */}
      {s.image
        ? <img src={s.image} style={{ width:44, height:30, objectFit:"contain", flexShrink:0 }} alt=""/>
        : <div style={{ width:44, height:30, background:"var(--card2)", borderRadius:4, flexShrink:0 }}/>
      }

      {/* Skin name and purchase info */}
      <div className="skin-item-info">
        <div className="skin-item-name">{s.name}</div>
        <div className="skin-item-sub">
          {s.weapon} · {s.buy.toFixed(2)} €
          {loading && <span style={{ marginLeft:6, color:"var(--accent)" }}>⟳</span>}
        </div>
      </div>

      {/* Current price and delta */}
      <div className="skin-item-price">
        <div className="skin-price-val">{curr.toFixed(2)} €</div>
        <div className="skin-price-delta" style={{ color:col }}>
          {d >= 0 ? "+" : ""}{dp.toFixed(1)}%
        </div>
      </div>

      {/* Delete button — stops click propagation to avoid toggling hide */}
      <button
        className="skin-del"
        onClick={e => { e.stopPropagation(); onDelete(s.id); }}
      >
        ×
      </button>
    </div>
  );
});

/**
 * Skin list container.
 * Renders weapon filter pills and the list of SkinRow components.
 *
 * @param {Object[]}  active         - All skins to display (unfiltered by hidden)
 * @param {Object}    hidden         - Map of hidden skin IDs { [id]: boolean }
 * @param {Object}    loadingHist    - Map of loading states { [fullName]: boolean }
 * @param {string}    accentCol      - Accent color token
 * @param {string}    redCol         - Red color token
 * @param {Function}  onToggleHide   - Toggle visibility callback
 * @param {Function}  onDelete       - Delete skin callback
 * @param {string[]}  weapons        - Available weapon filter options
 * @param {string}    wFilter        - Currently active weapon filter
 * @param {Function}  onFilterChange - Filter change callback
 */
export const SkinList = memo(function SkinList({
  active, hidden, loadingHist, accentCol, redCol,
  onToggleHide, onDelete, weapons, wFilter, onFilterChange
}) {
  const handleFilter = useCallback(w => onFilterChange(w), [onFilterChange]);
  const handleToggle = useCallback(id => onToggleHide(id), [onToggleHide]);
  const handleDelete = useCallback(id => onDelete(id), [onDelete]);

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
      {/* Weapon filter pills — only shown if more than one weapon type */}
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