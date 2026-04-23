/**
 * @typedef {Object} PricePoint
 * @property {number} t - timestamp en ms
 * @property {number} p - prix
 */

/**
 * @typedef {Object} Skin
 * @property {string} id - id interne
 * @property {string} fullName - ex: "AK-47 | The Oligarch (FN)"
 *
 * @property {number} buyPrice - prix payé par l'utilisateur
 * @property {number} buyDate - timestamp d'achat
 *
 * @property {number|null} lowestListingPrice - Steam lowest listing
 * @property {number|null} lowestListingTs - timestamp de récupération
 *
 * @property {number|null} lastSalePrice - dernière vente réelle
 * @property {number|null} lastSaleTs - timestamp de la dernière vente
 *
 * @property {PricePoint[]} history - historique des ventes réelles
 */

module.exports = {};
