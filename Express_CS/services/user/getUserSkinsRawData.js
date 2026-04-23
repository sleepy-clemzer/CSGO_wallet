const https = require("https");
const {
  getCachedHistory, setCachedHistory,
  getCachedListing, setCachedListing
} = require("../steam/steamCache");

function steamRequest(path, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "steamcommunity.com",
      path,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "fr-FR,fr;q=0.9",
        ...extraHeaders
      }
    }, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error("Parse error")); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getUserSkinsRawData(steamId, portfolios) {
  console.log("getUserSkinsRawData() — steamId :", steamId);

  const portfolio = portfolios[steamId] ?? [];

  if (portfolio.length === 0) {
    console.log("Portfolio vide pour", steamId);
    return [];
  }

  const cookie = process.env.STEAM_COOKIE;
  const result = [];

  console.log("PORTFOLIO REÇU :", portfolio.map(s => s.marketHashName));

  for (const s of portfolio) {
    console.log("SKIN :", s.marketHashName);
    let steamHistory = [];
    let steamListing = {};

    // ─── HISTORIQUE ────────────────────────────────────────
    const cachedHistory = getCachedHistory(s.marketHashName);
    console.log(`Cache pour ${s.marketHashName}:`, cachedHistory ? `${cachedHistory.length} points` : "MISS");

    if (cachedHistory) {
      // ✅ Cache HIT — pas de requête Steam
      steamHistory = cachedHistory;
    } else {
      // ❌ Cache MISS — on fetch Steam
      await wait(2000);
      try {
        const hist = await steamRequest(
          `/market/pricehistory/?appid=730&market_hash_name=${encodeURIComponent(s.marketHashName)}`,
          cookie ? { Cookie: `steamLoginSecure=${cookie}` } : {}
        );
        if (hist.success && Array.isArray(hist.prices)) {
          steamHistory = hist.prices;
          setCachedHistory(s.marketHashName, steamHistory); // ✅ Sauvegarde
          console.log(`📦 Cache history sauvegardé pour ${s.marketHashName}`);
        }
      } catch (e) {
        console.error("Erreur pricehistory:", e.message);
      }
    }

    // ─── LISTING ───────────────────────────────────────────
    const cachedListing = getCachedListing(s.marketHashName);

    if (cachedListing) {
      // ✅ Cache HIT
      steamListing = cachedListing;
    } else {
      // ❌ Cache MISS — on fetch Steam
      await wait(1500);
      try {
        const overview = await steamRequest(
          `/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(s.marketHashName)}`
        );
        steamListing = {
          lowest_price: overview.lowest_price || null,
          median_price: overview.median_price || null
        };
        if (steamListing.lowest_price || steamListing.median_price) {
          setCachedListing(s.marketHashName, steamListing); // ✅ Sauvegarde
          console.log(`📦 Cache listing sauvegardé pour ${s.marketHashName}`);
        }
      } catch (e) {
        console.error("Erreur priceoverview:", e.message);
      }
    }

    result.push({ ...s, steamHistory, steamListing });
  }

  return result;
}

module.exports = { getUserSkinsRawData };