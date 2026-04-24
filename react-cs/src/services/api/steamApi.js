const BASE = "http://localhost:3001";

export async function fetchSteamPrice(name) {
  const r = await fetch(`${BASE}/steam-price?name=${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error(`fetchSteamPrice ${r.status}`);
  return r.json();
}

export async function fetchSteamHistory(name) {
  const r = await fetch(
    `${BASE}/steam-full-history?name=${encodeURIComponent(name)}`,
    { credentials: "include" }
  );
  if (!r.ok) throw new Error(`fetchSteamHistory ${r.status}`);
  return r.json();
}