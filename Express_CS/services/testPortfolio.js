const { buildPortfolio } = require("../services/portfolio/buildPortfolio");

const fakeSkins = [
  {
    id: "ak_oligarch_fn",
    buyPrice: 400,
    lowestListingPrice: 429.15,
    lastSalePrice: 412,
    history: []
  }
];

console.log("=== TEST buildPortfolio ===");
console.log(buildPortfolio(fakeSkins));
