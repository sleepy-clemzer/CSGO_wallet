const { parsePriceHistory, getLastSale } = require("../services/steam/parseHistory");
const { parseLowestListing } = require("../services/steam/parseListing");
const { buildSkin } = require("../services/steam/buildSkin");

// --- Données Steam simulées (comme si elles venaient de l'API) ---
const fakeHistory = [
  ["Apr 20 2026 12:00", "412,00", "3"],
  ["Apr 21 2026 13:00", "415,00", "1"]
];

const fakeListing = {
  lowest_price: "429,15€"
};

const fakeUserData = {
  id: "ak_oligarch_fn",
  fullName: "AK-47 | The Oligarch (FN)",
  buyPrice: 400,
  buyDate: Date.now() - 86400000
};

// --- TEST 1 : parsePriceHistory ---
console.log("=== TEST parsePriceHistory ===");
console.log(parsePriceHistory(fakeHistory));

// --- TEST 2 : getLastSale ---
console.log("=== TEST getLastSale ===");
console.log(getLastSale(parsePriceHistory(fakeHistory)));

// --- TEST 3 : parseLowestListing ---
console.log("=== TEST parseLowestListing ===");
console.log(parseLowestListing(fakeListing));

// --- TEST 4 : buildSkin ---
console.log("=== TEST buildSkin ===");
console.log(buildSkin(fakeHistory, fakeListing, fakeUserData));
