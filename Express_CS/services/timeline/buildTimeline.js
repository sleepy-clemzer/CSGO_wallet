/**
 * Construit une timeline agrégée basée sur les ventes réelles
 * @param {Array} skins
 * @param {string} range - "1h" | "24h" | "7d" | "30d" | "1y" | "all"
 */
function buildTimeline(skins = [], range = "30d") {
  const now = Date.now();

  let minTime = Infinity;
  let maxTime = -Infinity;

  skins.forEach(s => {
    if (!s.history || !s.history.length) return;
    const first = s.history[0].t;
    const last  = s.history[s.history.length - 1].t;
    if (first < minTime) minTime = first;
    if (last  > maxTime) maxTime = last;
  });

  if (!isFinite(minTime)) {
    return [{ time: now, valeur: 0 }];
  }

  switch (range) {
    case "1h":  minTime = now - 1   * 60 * 60 * 1000;        break;
    case "24h": minTime = now - 24  * 60 * 60 * 1000;        break;
    case "7d":  minTime = now - 7   * 24 * 60 * 60 * 1000;   break;
    case "30d": minTime = now - 30  * 24 * 60 * 60 * 1000;   break;
    case "1y":  minTime = now - 365 * 24 * 60 * 60 * 1000;   break;
    case "all":
    default: break;
  }

  const interval = 5 * 60 * 1000;
  const pivot = [];
  for (let t = minTime; t <= maxTime; t += interval) {
    pivot.push(t);
  }

  const timeline = pivot.map(t => {
    let sum = 0;
    const point = { time: t };

    skins.forEach(s => {
      const hist = s.history;

      // ✅ Pas d'historique → valeur constante = marketPrice
      if (!hist || !hist.length) {
        const fallback = s.marketPrice ?? s.buyPrice ?? 0;
        point[s.name] = fallback;
        sum += fallback;
        return;
      }

      let i = 0;
      while (i < hist.length - 1 && hist[i + 1].t < t) {
        i++;
      }

      const a = hist[i];
      const b = hist[i + 1];
      let price = a.p;

      if (b && b.t >= t) {
        const ratio = (t - a.t) / (b.t - a.t);
        price = a.p + (b.p - a.p) * ratio;
      }

      sum += price;
      point[s.name] = parseFloat(price.toFixed(2));
    });

    point.valeur = parseFloat(sum.toFixed(2));
    return point;
  });

  return timeline;
}

module.exports = { buildTimeline };
