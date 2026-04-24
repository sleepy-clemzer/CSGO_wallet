/**
 * Shared utility functions used across the frontend.
 */

/**
 * Parses a localized Steam price string into a plain float.
 * Handles EU format (e.g. "1.234,56€" → 1234.56, "56,26€" → 56.26).
 *
 * @param {string} raw - Raw price string from Steam API
 * @returns {number|null} Parsed price, or null if input is falsy
 */
export function parseSteamPrice(raw) {
  if (!raw) return null;
  const c = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  const n = c.includes(",") && c.includes(".")
    ? c.replace(".", "").replace(",", ".")
    : c.replace(",", ".");
  return parseFloat(n) || null;
}

/**
 * Formats a number to a fixed number of decimal places.
 * Returns "—" if the value is null or undefined.
 *
 * @param {number|null} n        - Value to format
 * @param {number}      decimals - Number of decimal places (default: 2)
 * @returns {string}
 */
export function fmt(n, decimals = 2) {
  return n != null ? n.toFixed(decimals) : "—";
}

/**
 * Formats a Unix timestamp (ms) as a short date string.
 * Uses French locale format: DD/MM/YY
 *
 * @param {number} ts - Unix timestamp in milliseconds
 * @returns {string}
 */
export function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("fr-FR", {
    day:   "2-digit",
    month: "2-digit",
    year:  "2-digit"
  });
}

/**
 * Formats a Unix timestamp for chart axis display.
 * Output format depends on the active time range.
 *
 * @param {number} ts    - Unix timestamp in milliseconds
 * @param {string} range - Active time range key (e.g. "24h", "7d")
 * @returns {string}
 */
export function fmtTime(ts, range) {
  const d = new Date(ts);
  if (range === "1h" || range === "24h")
    return d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
  if (range === "7d")
    return d.toLocaleDateString("fr-FR", { weekday:"short", day:"numeric" });
  return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit" });
}

/**
 * Formats a timestamp for XAxis tick display in Recharts.
 * Handles day boundary labels and sparse tick rendering for long ranges.
 *
 * @param {number} ts    - Unix timestamp in milliseconds
 * @param {string} range - Active time range key
 * @returns {string} Formatted label, or empty string to skip the tick
 */
export function xTickFormatter(ts, range) {
  const d = new Date(ts);

  if (range === "1h" || range === "24h") {
    const isStartOfDay = d.getHours() === 0 && d.getMinutes() < 30;
    if (isStartOfDay)
      return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
    return d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
  }

  if (range === "7d")
    return d.toLocaleDateString("fr-FR", { weekday:"short", day:"numeric" });

  // Render every other day for 30d to avoid label crowding
  if (range === "30d")
    return d.getDate() % 2 === 0
      ? d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })
      : "";

  // Render every other month for all/1y
  if (range === "all")
    return d.getMonth() % 2 === 0
      ? d.toLocaleDateString("fr-FR", { month:"short", year:"2-digit" })
      : "";

  return d.getMonth() % 2 === 0
    ? d.toLocaleDateString("fr-FR", { month:"short" })
    : "";
}