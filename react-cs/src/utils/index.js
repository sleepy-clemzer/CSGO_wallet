export function parseSteamPrice(raw) {
  if (!raw) return null;
  const c = raw.replace(/\s/g,"").replace(/[^\d.,]/g,"");
  const n = c.includes(",") && c.includes(".") ? c.replace(".","").replace(",",".") : c.replace(",",".");
  return parseFloat(n) || null;
}

export function fmt(n, decimals = 2) {
  return n != null ? n.toFixed(decimals) : "—";
}

export function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function fmtTime(ts, range) {
  const d = new Date(ts);
  if (range === "1h" || range === "24h") return d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
  if (range === "7d") return d.toLocaleDateString("fr-FR", { weekday:"short", day:"numeric" });
  return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit" });
}

export function xTickFormatter(ts, range) {
  const d = new Date(ts);
  if (range === "1h" || range === "24h") {
    const isStartOfDay = d.getHours() === 0 && d.getMinutes() < 30;
    if (isStartOfDay) return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
    return d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
  }
  if (range === "7d") return d.toLocaleDateString("fr-FR", { weekday:"short", day:"numeric" });
  if (range === "30d") return d.getDate() % 2 === 0 ? d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" }) : "";
  if (range === "all") return d.getMonth() % 2 === 0 ? d.toLocaleDateString("fr-FR", { month:"short", year:"2-digit" }) : "";
  return d.getMonth() % 2 === 0 ? d.toLocaleDateString("fr-FR", { month:"short" }) : "";
}