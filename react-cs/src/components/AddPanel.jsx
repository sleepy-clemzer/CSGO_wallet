import { useState, useEffect } from "react";
import { WeaponDropdown } from "./WeaponDropdown.jsx";
import { STEAM_URL, WEAR_MAP, WEAR_ORDER, COLORS } from "../constants/index.js";
import { parseSteamPrice } from "../utils/index.js";

async function fetchSteamPrice(name) {
  const r = await fetch(STEAM_URL(name));
  if (!r.ok) throw new Error(`Proxy ${r.status}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  if (!d.success) throw new Error("Introuvable.");
  return parseSteamPrice(d.lowest_price ?? d.median_price);
}

export function AddPanel({ onAdd, allSkins, loadingDB, dbError }) {
  const [selW, setSelW]         = useState(null);
  const [skinQ, setSkinQ]       = useState("");
  const [selS, setSelS]         = useState(null);
  const [selWr, setSelWr]       = useState(null);
  const [buy, setBuy]           = useState("");
  const [mktP, setMktP]         = useState(null);
  const [fetching, setFetching] = useState(false);
  const [pErr, setPErr]         = useState(null);
  const [rawN, setRawN]         = useState("");

  const weapons = [...new Map(allSkins.map(s => [s.weapon.name, s.weapon])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));

  const skins4W = selW
    ? allSkins.filter(s =>
        s.weapon.name === selW.name &&
        (skinQ === "" || s.name.toLowerCase().includes(skinQ.toLowerCase()))
      )
    : [];

  useEffect(() => {
    if (!selS || !selWr) { setMktP(null); setPErr(null); return; }
    const name = `${selS.name} (${selWr})`;
    setRawN(name); setFetching(true); setPErr(null); setMktP(null);
    fetchSteamPrice(name)
      .then(p => setMktP(p))
      .catch(e => setPErr(e.message))
      .finally(() => setFetching(false));
  }, [selS, selWr]);

  const step = !selW ? 1 : !selS ? 2 : !selWr ? 3 : 4;
  const resetW = (w) => { setSelW(w); setSelS(null); setSelWr(null); setSkinQ(""); setMktP(null); setBuy(""); setPErr(null); };
  const buyN   = parseFloat(buy) || 0;
  const profit = mktP != null ? mktP - buyN : null;
  const pct    = buyN > 0 && profit != null ? (profit / buyN) * 100 : null;
  const canAdd = selS && selWr && buyN > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      weapon:      selW.name,
      name:        `${selS.name.split("|")[1]?.trim() ?? selS.name} ${WEAR_MAP[selWr] ?? ""}`.trim(),
      fullName:    rawN,
      buy:         buyN,
      marketPrice: mktP,
      image:       selS.image,
      rarity:      selS.rarity,
      color:       COLORS[Math.floor(Math.random() * COLORS.length)],
      addedAt:     Date.now(),
    });
    resetW(null);
  };

  return (
    <>
      <div className="sec-head">Ajouter un skin</div>

      {/* Steps */}
      <div className="steps-bar">
        {["Arme","Skin","Usure","Prix"].map((s, i) => (
          <div key={s} className={`step-c${step > i+1 ? " done" : step === i+1 ? " active" : ""}`}>
            <span className="step-n">{step > i+1 ? "✓" : i+1}</span>{s}
          </div>
        ))}
      </div>

      {loadingDB && (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div className="spin"/>
          <span className="muted">Chargement...</span>
        </div>
      )}
      {dbError && <p className="err-txt">{dbError}</p>}

      {!loadingDB && !dbError && <>
        {/* Arme */}
        <div className="f-label">
          {selW
            ? <span style={{ color:"var(--accent)" }}>✓ {selW.name} <button className="btn-lnk" onClick={() => resetW(null)}>changer</button></span>
            : "Arme"
          }
        </div>
        {!selW && <WeaponDropdown weapons={weapons} value={selW} onChange={resetW} />}
        {selW && (
          <div style={{ padding:"7px 11px", background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:8, fontSize:13, color:"var(--fg)", marginBottom:14 }}>
            {selW.name}
          </div>
        )}

        {/* Skin */}
        {selW && <>
          <div className="f-label mb8">
            {selS
              ? <span style={{ color:"var(--accent)" }}>✓ {selS.name.split("|")[1]?.trim()} <button className="btn-lnk" onClick={() => { setSelS(null); setSelWr(null); setMktP(null); }}>changer</button></span>
              : `Skin (${skins4W.length})`
            }
          </div>
          {!selS && <>
            <input className="f-inp mb8" placeholder="Rechercher un skin..." value={skinQ} onChange={e => setSkinQ(e.target.value)} />
            <div className="skin-opts">
              {skins4W.map(s => (
                <div key={s.id} className="sk-opt" onClick={() => { setSelS(s); setSelWr(null); setMktP(null); }}>
                  {s.image && <img src={s.image} alt="" />}
                  <div>
                    <div className="sk-opt-name">{s.name.split("|")[1]?.trim()}</div>
                    <div className="sk-opt-rare" style={{ color: s.rarity?.color ?? "var(--muted)" }}>{s.rarity?.name}</div>
                  </div>
                </div>
              ))}
              {skins4W.length === 0 && <div style={{ padding:12, textAlign:"center", fontSize:11, color:"var(--muted)" }}>Aucun résultat</div>}
            </div>
          </>}
          {selS && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"var(--input-bg)", borderRadius:8, border:"1px solid var(--border)", marginBottom:14 }}>
              {selS.image && <img src={selS.image} style={{ width:40, height:27, objectFit:"contain", borderRadius:4 }} alt=""/>}
              <span style={{ fontSize:12, fontWeight:500, color:"var(--fg2)" }}>{selS.name.split("|")[1]?.trim()}</span>
            </div>
          )}
        </>}

        {/* Usure */}
        {selS && <>
          <div className="f-label mb8">
            {selWr
              ? <span style={{ color:"var(--accent)" }}>✓ {selWr} <button className="btn-lnk" onClick={() => setSelWr(null)}>changer</button></span>
              : "Usure"
            }
          </div>
          {!selWr && (
            <div className="wear-row">
              {WEAR_ORDER.map(w => {
                const ok = selS.wears?.some(sw => sw.name === w);
                return (
                  <button key={w} className={`w-btn${!ok ? " na" : ""}`} onClick={() => ok && setSelWr(w)}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{WEAR_MAP[w]}</div>
                  </button>
                );
              })}
            </div>
          )}
          {selWr && (
            <div style={{ padding:"7px 11px", background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:8, fontSize:13, color:"var(--fg2)", marginBottom:14 }}>
              {selWr}
            </div>
          )}
        </>}

        {/* Prix */}
        {selWr && <>
          <div className="p-boxes">
            <div className="p-box">
              <div className="p-box-lbl">Ton achat</div>
              <input className="f-inp" type="number" step="0.01" placeholder="0.00" value={buy} onChange={e => setBuy(e.target.value)} style={{ fontSize:14 }}/>
              {buyN > 0 && <div className="p-box-val" style={{ color:"var(--accent)", marginTop:6, fontSize:16 }}>{buyN.toFixed(2)} €</div>}
            </div>
            <div className="p-box">
              <div className="p-box-lbl">Steam</div>
              {fetching && <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}><div className="spin"/><span className="muted">...</span></div>}
              {!fetching && mktP != null && <div className="p-box-val" style={{ color:"var(--accent)", marginTop:6, fontSize:16 }}>{mktP.toFixed(2)} €</div>}
              {!fetching && pErr && <p className="err-txt">{pErr}</p>}
              <div style={{ fontSize:9, color:"var(--border)", marginTop:4, wordBreak:"break-all" }}>{rawN}</div>
            </div>
          </div>

          {buyN > 0 && mktP != null && (
            <div className="cmp">
              <div className="cmp-top">
                <span className="cmp-lbl">Achat vs marché</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:500, color:profit >= 0 ? "var(--accent)" : "var(--red)" }}>
                  {profit >= 0 ? "+" : ""}{profit.toFixed(2)} € ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
                </span>
              </div>
              <div className="cmp-track">
                <div className="cmp-fill" style={{ width:`${Math.min(100,(Math.min(buyN,mktP)/Math.max(buyN,mktP))*100)}%`, background:profit >= 0 ? "var(--accent)" : "var(--red)" }}/>
              </div>
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