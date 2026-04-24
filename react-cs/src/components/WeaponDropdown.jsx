/**
 * Searchable weapon dropdown component.
 *
 * Renders a custom dropdown with an inline search input.
 * Closes automatically when the user clicks outside.
 * Auto-focuses the search input when opened.
 *
 * @param {Object[]}      weapons  - List of weapon objects { id, name }
 * @param {Object|null}   value    - Currently selected weapon
 * @param {Function}      onChange - Callback fired when a weapon is selected
 */
import { useState, useEffect, useRef } from "react";

export function WeaponDropdown({ weapons, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const ref             = useRef(null);
  const inp             = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inp.current?.focus(), 60);
  }, [open]);

  // Filter weapons by search query
  const list = q
    ? weapons.filter(w => w.name.toLowerCase().includes(q.toLowerCase()))
    : weapons;

  return (
    <div className="dd" ref={ref}>

      {/* Trigger button */}
      <button
        className={`dd-trigger${value ? " has-val" : ""}${open ? " open" : ""}`}
        onClick={() => { setOpen(o => !o); setQ(""); }}
      >
        <span>{value?.name || "Select a weapon..."}</span>
        <span className={`dd-arrow${open ? " open" : ""}`}>▾</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="dd-menu">

          {/* Search input */}
          <div className="dd-search">
            <input
              ref={inp}
              placeholder="AK-47, AWP, Glock..."
              value={q}
              onChange={e => setQ(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Weapon list */}
          <div className="dd-list">
            {list.length === 0 && (
              <div className="dd-empty">No results</div>
            )}
            {list.map(w => (
              <div
                key={w.id}
                className={`dd-opt${value?.id === w.id ? " sel" : ""}`}
                onClick={() => { onChange(w); setOpen(false); setQ(""); }}
              >
                {w.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}