/**
 * Portfolio API service.
 *
 * Wraps all HTTP calls related to the user's portfolio.
 * All requests include credentials (session cookie).
 */
const BASE = "http://localhost:3001";

/**
 * Fetches the full portfolio data for the authenticated user.
 * Includes skin metrics, timeline, and portfolio-level KPIs.
 *
 * @param {string} range - Time range key (default: "30d")
 * @returns {Promise<Object>} Portfolio response from the backend
 * @throws {Error} If the request fails or returns a non-OK status
 */
export async function fetchPortfolio(range = "30d") {
  const r = await fetch(`${BASE}/portfolio?range=${range}`, {
    credentials: "include"
  });
  if (!r.ok) throw new Error(`fetchPortfolio failed with status ${r.status}`);
  return r.json();
}

/**
 * Saves the user's portfolio to the backend (in-memory store).
 * Overwrites the existing portfolio for the authenticated user.
 *
 * @param {Object[]} skins - Array of skin objects to save
 * @returns {Promise<{ saved: boolean }>}
 * @throws {Error} If the request fails or returns a non-OK status
 */
export async function savePortfolio(skins) {
  const r = await fetch(`${BASE}/api/portfolio`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ portfolio: skins })
  });
  if (!r.ok) throw new Error(`savePortfolio failed with status ${r.status}`);
  return r.json();
}