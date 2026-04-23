// timelineEngine.js — pivot + reprojection + EMA + LTTB (valeur uniquement)

function lttb(data, threshold) {
  if (data.length <= threshold) return data;

  const sampled = [];
  const bucketSize = (data.length - 2) / (threshold - 2);

  let a = 0;
  sampled.push(data[a]);

  for (let i = 0; i < threshold - 2; i++) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const range = data.slice(rangeStart, rangeEnd);

    let maxArea = -1;
    let maxAreaPoint = null;

    for (let j = 0; j < range.length; j++) {
      const p = range[j];
      const area = Math.abs(
        (data[a].time - p.time) *
        (data[a].valeur - p.valeur)
      );

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = p;
      }
    }

    if (maxAreaPoint) {
      sampled.push(maxAreaPoint);
      a = data.indexOf(maxAreaPoint);
    }
  }

  sampled.push(data[data.length - 1]);
  return sampled;
}

export function buildTimeline(active, history, hidden, range) {
  const visible = active.filter(s => !hidden[s.id]);
  if (!visible.length) return [];

  const now = Date.now();

  const totalMarket = visible.reduce(
    (a, s) => a + (s.marketPrice ?? s.buy),
    0
  );

  const interval = 5 * 60 * 1000;
  let minTime = Infinity;
  let maxTime = -Infinity;

  visible.forEach(s => {
    const hist = history[s.fullName];
    if (!hist || !hist.length) return;
    minTime = Math.min(minTime, hist[0].t);
    maxTime = Math.max(maxTime, hist[hist.length - 1].t);
  });

  if (!isFinite(minTime)) {
    return [{
      time: now,
      valeur: totalMarket,
    }];
  }

  switch (range) {
    case "1h":  minTime = now - 1 * 60 * 60 * 1000; break;
    case "24h": minTime = now - 24 * 60 * 60 * 1000; break;
    case "7d":  minTime = now - 7 * 24 * 60 * 60 * 1000; break;
    case "30d": minTime = now - 30 * 24 * 60 * 60 * 1000; break;
    case "1y":  minTime = now - 365 * 24 * 60 * 60 * 1000; break;
    case "all":
    default:    break;
  }

  const pivot = [];
  for (let t = minTime; t <= maxTime; t += interval) {
    pivot.push(t);
  }

  let base = pivot.map(t => {
    let sum = 0;

    visible.forEach(s => {
      const hist = history[s.fullName];
      if (!hist || !hist.length) return;

      let i = 0;
      while (i < hist.length - 1 && hist[i + 1].t < t) i++;

      const a = hist[i];
      const b = hist[i + 1];

      let price = a.p;
      if (b && b.t >= t) {
        const ratio = (t - a.t) / (b.t - a.t);
        price = a.p + (b.p - a.p) * ratio;
      }

      sum += price;
    });

    return { time: t, valeur: sum };
  });

  if (base.length > 1500) {
    base = lttb(base, 800);
  }

  if (base.length >= 2) {
    const alpha = 0.2;
    let ema = base[0].valeur;

    base = base.map((pt, i) => {
      if (i === 0) return { ...pt, valeur: ema };
      ema = alpha * pt.valeur + (1 - alpha) * ema;
      return { ...pt, valeur: ema };
    });
  }

  // ❌ IMPORTANT : on NE touche PLUS au dernier point
  // ❌ On NE remplace PLUS par totalMarket
  // ❌ Le graph reste basé sur les ventes réelles

  return base;
}
