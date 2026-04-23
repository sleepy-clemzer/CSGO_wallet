const { parsePriceHistory, getLastSale } = require("./parseHistory");
const { parseLowestListing } = require("./parseListing");

function buildSkin(steamHistoryRaw, steamListingRaw, userData) {
  // ✅ Utilise l'historique déjà parsé dans userData si disponible
  const history = (userData.history?.length)
    ? parsePriceHistory(userData.history)  // gère {t,p} déjà parsé
    : parsePriceHistory(steamHistoryRaw);

  const { lastSalePrice } = getLastSale(history);
  const { price: lowestListingPrice } = parseLowestListing(steamListingRaw);

  const marketPrice =
    lowestListingPrice ??
    lastSalePrice ??
    userData.marketPrice ??
    userData.buyPrice ??
    0;

  const skin = {
    id:     userData.id,
    name:   userData.fullName ?? userData.name ?? "Inconnu",
    weapon: userData.weapon ?? "Unknown",
    image:  userData.image ?? null,
    color:  userData.color ?? "#888",

    buy:        userData.buyPrice ?? userData.buy ?? 0,
    marketPrice,

    buyPrice:           userData.buyPrice ?? userData.buy ?? 0,
    buyDate:            userData.buyDate ?? null,
    lowestListingPrice: lowestListingPrice ?? null,
    lastSalePrice:      lastSalePrice ?? null,
    history
  };

  console.log("🧱 buildSkin OUTPUT :", {
    ...skin,
    history: `[${skin.history.length} points]`
  });

  return skin;
}

module.exports = { buildSkin };