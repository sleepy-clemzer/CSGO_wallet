/**
 * Authentication API service.
 *
 * Wraps Steam OpenID authentication and session management calls.
 */
const BASE = "http://localhost:3001";

/**
 * Fetches the current session user from the backend.
 * Used on app load to restore authentication state.
 *
 * @returns {Promise<{ authenticated: boolean, user: Object|null }>}
 * @throws {Error} If the request fails or returns a non-OK status
 */
export async function fetchMe() {
  const r = await fetch(`${BASE}/api/me`, {
    credentials: "include"
  });
  if (!r.ok) throw new Error(`fetchMe failed with status ${r.status}`);
  return r.json();
}

/**
 * Redirects the browser to the Steam OpenID login page.
 * Navigation is handled server-side via passport-steam.
 */
export function loginWithSteam() {
  window.location.href = `${BASE}/auth/steam`;
}

/**
 * Destroys the current session and redirects to the frontend.
 */
export function logoutSteam() {
  window.location.href = `${BASE}/auth/logout`;
}