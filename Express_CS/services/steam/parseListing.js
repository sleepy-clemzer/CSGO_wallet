/**
 * Parse le lowest listing Steam
 * @param {Object} raw
 * @returns {{ price: number|null, ts: number|null }}
 */
function parseLowestListing(raw) {
  if (!raw) return { price: null, ts: null };

  const str = raw.lowest_price || raw.median_price;
  if (!str) return { price: null, ts: null };

  const cleaned = str
    .replace(/[^\d.,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const price = parseFloat(cleaned);
  return {
    price: isNaN(price) ? null : price,
    ts: Date.now()
  };
}

module.exports = { parseLowestListing };
