const fs   = require("fs");
const path = require("path");

const CACHE_FILE    = path.join(__dirname, "../../cache/steam-cache.json");
const TTL_HISTORY   = 24 * 60 * 60 * 1000;  // 24h pour l'historique
const TTL_LISTING   = 30 * 60 * 1000;        // 30min pour le prix actuel

// ─── Lecture du cache ───────────────────────────────────────
function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ─── Écriture du cache ──────────────────────────────────────
function writeCache(cache) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch (e) {
    console.error("Erreur écriture cache :", e.message);
  }
}

// ─── Récupère l'historique depuis le cache ──────────────────
function getCachedHistory(marketHashName) {
  const cache = readCache();
  const key   = `history:${marketHashName}`;
  const entry = cache[key];

  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_HISTORY) {
    console.log(`Cache history expiré pour ${marketHashName}`);
    return null;
  }

  console.log(`✅ Cache history HIT pour ${marketHashName}`);
  return entry.data;
}

// ─── Sauvegarde l'historique dans le cache ──────────────────
function setCachedHistory(marketHashName, data) {
  const cache = readCache();
  cache[`history:${marketHashName}`] = { ts: Date.now(), data };
  writeCache(cache);
}

// ─── Récupère le listing depuis le cache ────────────────────
function getCachedListing(marketHashName) {
  const cache = readCache();
  const key   = `listing:${marketHashName}`;
  const entry = cache[key];

  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_LISTING) {
    console.log(`Cache listing expiré pour ${marketHashName}`);
    return null;
  }

  console.log(`✅ Cache listing HIT pour ${marketHashName}`);
  return entry.data;
}

// ─── Sauvegarde le listing dans le cache ────────────────────
function setCachedListing(marketHashName, data) {
  const cache = readCache();
  cache[`listing:${marketHashName}`] = { ts: Date.now(), data };
  writeCache(cache);
}

module.exports = {
  getCachedHistory,
  setCachedHistory,
  getCachedListing,
  setCachedListing
};