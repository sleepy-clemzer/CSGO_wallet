export const PRICING_RULES = {
  // Valeur du portefeuille
  // → somme des Steam lowest listings
  portfolioValue: "lowest_listing",

  // P&L non réalisé
  // → basé sur cette même valeur
  unrealizedPnL: "lowest_listing",

  // Graph d’évolution
  // → basé sur les ventes réelles
  timelineSource: "last_sales",

  // On ne corrige jamais le dernier point du graph
  overrideLastPoint: false,
};
