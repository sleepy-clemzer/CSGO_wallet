/**
 * Construit les métriques du portefeuille à partir d'une liste de skins
 * @param {Array} skins
 * @returns {{
 *   totalBuy: number,
 *   marketValue: number,
 *   unrealizedPnL: number,
 *   unrealizedPnLPct: number
 * }}
 */
function buildPortfolio(skins) {
  if (!skins || !skins.length) {
    return {
      totalBuy: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPct: 0
    };
  }

  // ✅ accepte buy OU buyPrice selon la source
  const totalBuy = skins.reduce((sum, s) => sum + (s.buyPrice ?? s.buy ?? 0), 0);

  const marketValue = skins.reduce((sum, s) => {
    const ref = s.lowestListingPrice ?? s.lastSalePrice ?? s.buyPrice ?? s.buy ?? 0;
    return sum + ref;
  }, 0);

  const unrealizedPnL    = marketValue - totalBuy;
  const unrealizedPnLPct = totalBuy > 0 ? (unrealizedPnL / totalBuy) * 100 : 0;

  return {
    totalBuy,
    marketValue,
    unrealizedPnL,
    unrealizedPnLPct
  };
}

module.exports = { buildPortfolio };
