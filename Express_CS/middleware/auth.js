// middleware/auth.js
const requireAuth = (req, res, next) =>
  req.isAuthenticated() ? next() : res.status(401).json({ error: "Non authentifié" });

module.exports = { requireAuth };