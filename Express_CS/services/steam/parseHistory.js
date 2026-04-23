function parseSteamDate(str) {
  try {
    const clean = str.replace(/(\d+): \+0/, "$1:00 +0000");
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
}

function parsePriceHistory(raw = []) {
  if (!Array.isArray(raw)) return [];
  if (!raw.length) return [];

  // ✅ Déjà parsé {t, p} — retourne directement sans reparsing
  if (typeof raw[0] === "object" && !Array.isArray(raw[0]) && "t" in raw[0]) {
    return raw.filter(p => p && p.t && !isNaN(p.p));
  }

  // Format brut Steam [dateStr, price, volume]
  return raw
    .map(row => {
      if (!Array.isArray(row) || row.length < 2) return null;

      const dateStr  = row[0];
      const priceRaw = row[1];

      const t = parseSteamDate(dateStr);
      if (!t) return null;

      let p = null;

      if (typeof priceRaw === "number") {
        p = priceRaw;
      }

      if (typeof priceRaw === "string") {
        const cleaned = priceRaw.replace(/[^\d.,]/g, "");
        if (cleaned.includes(",") && cleaned.includes(".")) {
          p = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
        } else if (cleaned.includes(",")) {
          p = parseFloat(cleaned.replace(",", "."));
        } else {
          p = parseFloat(cleaned);
        }
      }

      if (p === null || isNaN(p) || p <= 0) return null;

      return { t, p };
    })
    .filter(Boolean);
}

function getLastSale(history = []) {
  if (!history.length) return { lastSalePrice: null, lastSaleTs: null };
  const last = history[history.length - 1];
  return {
    lastSalePrice: last.p,
    lastSaleTs:    last.t
  };
}

module.exports = { parsePriceHistory, getLastSale };