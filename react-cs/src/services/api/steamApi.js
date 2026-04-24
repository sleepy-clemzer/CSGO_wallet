/**
 * Steam Market API service.
 *
 * Wraps HTTP calls to backend endpoints that proxy Steam Market data.
 * The backend handles authentication, rate limiting, and caching.
 */
const BASE = "http://localhost:3001";

/**
 * Fetches the current lowest listing and median price for a skin.
 * Proxied through the backend to avoid CORS issues.
 *
 * @param {string} name - Steam market hash name (e.g. "AK-47 | Redline (Field-Tested)")
 * @returns {Promise<Object>} Raw Steam price overview response
 * @throws {Error} If the request fails or returns a non-OK status
 */
export async function fetchSteamPrice(name) {
  const r = await fetch(`${BASE}/steam-price?name=${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error(`fetchSteamPrice failed with status ${r.status}`);
  return r.json();
}

/**
 * Fetches the full price history for a skin from Steam Market.
 * Requires the user to be authenticated (Steam cookie is handled server-side).
 *
 * @param {string} name - Steam market hash name
 * @returns {Promise<{ name: string, points: { t: number, p: number }[] }>}
 * @throws {Error} If the request fails or returns a non-OK status
 */
export async function fetchSteamHistory(name) {
  const r = await fetch(
    `${BASE}/steam-full-history?name=${encodeURIComponent(name)}`,
    { credentials: "include" }
  );
  if (!r.ok) throw new Error(`fetchSteamHistory failed with status ${r.status}`);
  return r.json();
}