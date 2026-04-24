/**
 * Client-side timeline engine.
 *
 * Builds a time-series of aggregated portfolio values from individual skin
 * price histories. Applies LTTB downsampling and EMA smoothing for
 * performant and visually clean chart rendering.
 *
 * Note: This engine operates on client-side history data.
 * The backend equivalent (buildTimeline.js) uses the same logic
 * but runs server-side on Steam price data.
 */

// ---------------------------------------------------------------------------
// LTTB downsampling
// ---------------------------------------------------------------------------

/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm.
 *
 * Reduces a time-series to a target number of points while preserving
 * the visual shape of the data. Prioritizes points with the largest
 * triangle area relative to their neighbors.
 *
 * @param {{ time: number, valeur: number }[]} data      - Input time-series
 * @param {number}                             threshold - Target point count
 * @returns {{ time: number, valeur: number }[]} Downsampled series
 */
function lttb(data, threshold) {
  if (data.length <= threshold) return data;

  const sampled    = [];
  const bucketSize = (data.length - 2) / (threshold - 2);

  let a = 0;
  sampled.push(data[a]);

  for (let i = 0; i < threshold - 2; i++) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const rangeEnd   = Math.floor((i + 2) * bucketSize) + 1;
    const range      = data.slice(rangeStart, rangeEnd);

    let maxArea      = -1;
    let maxAreaPoint = null;

    for (let j = 0; j < range.length; j++) {
      const p    = range[j];
      const area = Math.abs(
        (data[a].time - p.time) * (data[a].valeur - p.valeur)
      );

      if (area > maxArea) {
        maxArea      = area;
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

// ---------------------------------------------------------------------------
// Timeline builder
// ---------------------------------------------------------------------------

/**
 * Builds a time-series timeline for visible skins over a given range.
 *
 * Steps:
 *   1. Filter to visible (non-hidden) skins with history data
 *   2. Determine global time bounds across all histories
 *   3. Apply range filter to set the lower time bound
 *   4. Generate pivot timestamps at 5-minute intervals
 *   5. Interpolate each skin's price at each pivot timestamp
 *   6. Apply LTTB downsampling if the series exceeds 1500 points
 *   7. Apply EMA smoothing (alpha = 0.2)
 *
 * @param {Object[]} active  - All skins in the portfolio
 * @param {Object}   history - Price history map: { [fullName]: PricePoint[] }
 * @param {Object}   hidden  - Hidden skin IDs: { [skinId]: boolean }
 * @param {string}   range   - Active time range key (e.g. "30d")
 * @returns {{ time: number, valeur: number }[]} Processed timeline
 */
export function buildTimeline(active, history, hidden, range) {
  const visible = active.filter(s => !hidden[s.id]);

  if (!visible.length) return [];

  const now         = Date.now();
  const INTERVAL_MS = 5 * 60 * 1000;

  // Flat market price sum — used as fallback when no history is available
  const totalMarket = visible.reduce(
    (a, s) => a + (s.marketPrice ?? s.buy),
    0
  );

  // --- Find global time bounds ---
  let minTime = Infinity;
  let maxTime = -Infinity;

  visible.forEach(s => {
    const hist = history[s.fullName];
    if (!hist?.length) return;
    minTime = Math.min(minTime, hist[0].t);
    maxTime = Math.max(maxTime, hist[hist.length - 1].t);
  });

  // No history data — return a single point at current value
  if (!isFinite(minTime)) {
    return [{ time: now, valeur: totalMarket }];
  }

  // --- Apply range lower bound ---
  const rangeBounds = {
    "1h":  now - 1   * 60 * 60 * 1000,
    "24h": now - 24  * 60 * 60 * 1000,
    "7d":  now - 7   * 24 * 60 * 60 * 1000,
    "30d": now - 30  * 24 * 60 * 60 * 1000,
    "1y":  now - 365 * 24 * 60 * 60 * 1000,
  };

  if (rangeBounds[range]) {
    minTime = Math.max(minTime, rangeBounds[range]);
  }

  // --- Generate pivot timestamps ---
  const pivot = [];
  for (let t = minTime; t <= maxTime; t += INTERVAL_MS) {
    pivot.push(t);
  }

  // --- Interpolate prices at each pivot ---
  let base = pivot.map(t => {
    let sum = 0;

    visible.forEach(s => {
      const hist = history[s.fullName];
      if (!hist?.length) return;

      // Find the last known price point before or at time t
      let i = 0;
      while (i < hist.length - 1 && hist[i + 1].t < t) i++;

      const a = hist[i];
      const b = hist[i + 1];
      let price = a.p;

      // Linear interpolation between surrounding points
      if (b && b.t >= t) {
        const ratio = (t - a.t) / (b.t - a.t);
        price = a.p + (b.p - a.p) * ratio;
      }

      sum += price;
    });

    return { time: t, valeur: sum };
  });

  // --- LTTB downsampling — limit to 800 points for performance ---
  if (base.length > 1500) {
    base = lttb(base, 800);
  }

  // --- EMA smoothing (alpha = 0.2) ---
  if (base.length >= 2) {
    const ALPHA = 0.2;
    let ema = base[0].valeur;

    base = base.map((pt, i) => {
      if (i === 0) return { ...pt, valeur: ema };
      ema = ALPHA * pt.valeur + (1 - ALPHA) * ema;
      return { ...pt, valeur: ema };
    });
  }

  return base;
}