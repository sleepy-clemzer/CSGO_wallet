import { useState, useEffect, useRef } from "react";

export function WeaponDropdown({ weapons, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const inp = useRef(null);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inp.current?.focus(), 60);
  }, [open]);

  const list = q
    ? weapons.filter(w => w.name.toLowerCase().includes(q.toLowerCase()))
    : weapons;

  return (
    <div className="dd" ref={ref}>
      <button
        className={`dd-trigger${value ? " has-val" : ""}${open ? " open" : ""}`}
        onClick={() => { setOpen(o => !o); setQ(""); }}
      >
        <span>{value?.name || "Sélectionner une arme..."}</span>
        <span className={`dd-arrow${open ? " open" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="dd-menu">
          <div className="dd-search">
            <input
              ref={inp}
              placeholder="AK-47, AWP, Glock..."
              value={q}
              onChange={e => setQ(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="dd-list">
            {list.length === 0 && <div className="dd-empty">Aucun résultat</div>}
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