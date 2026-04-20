// server.js — CS2 Wallet Backend
// Auth Steam + Historique prix + Portfolio par user + Vault HCP
// npm install express cors express-session passport passport-steam node-vault dotenv node-fetch@2

require("dotenv/config");

const express  = require("express");
const cors     = require("cors");
const session  = require("express-session");
const passport = require("passport");
const Steam    = require("passport-steam").Strategy;
const vault    = require("node-vault");
const fetch    = require("node-fetch");
const https    = require("https");
const fs       = require("fs");
const path     = require("path");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Fichiers de données ───────────────────────────────────────────────────────
const HISTORY_FILE   = path.join(__dirname, "price_history.json");
const PORTFOLIO_FILE = path.join(__dirname, "portfolios.json");

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return {}; }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ── Vault HCP ─────────────────────────────────────────────────────────────────
let STEAM_API_KEY  = "";
let SESSION_SECRET = "fallback_secret_change_me";

async function loadSecrets() {
  console.log("VAULT_ADDR:", process.env.VAULT_ADDR);
  console.log("VAULT_TOKEN:", process.env.VAULT_TOKEN ? "défini" : "undefined");
  console.log("VAULT_NAMESPACE:", process.env.VAULT_NAMESPACE);
  try {
    const vc = vault({
      apiVersion: "v1",
      endpoint:   process.env.VAULT_ADDR,
      token:      process.env.VAULT_TOKEN,
      namespace:  process.env.VAULT_NAMESPACE || "admin",
    });
    const result  = await vc.read("secret/data/csgo-wallet");
    const secrets = result.data.data;
    STEAM_API_KEY  = secrets.STEAM_API_KEY;
    SESSION_SECRET = secrets.SESSION_SECRET;
    console.log("Secrets chargés depuis Vault HCP");
  } catch (err) {
    console.error("Erreur Vault :", err.message);
    process.exit(1); // Arrête le serveur si Vault est inaccessible
  }
}

// ── Helpers Steam HTTP ────────────────────────────────────────────────────────
function steamRequest(reqPath, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "steamcommunity.com",
      path:     reqPath,
      method:   "GET",
      headers:  {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "fr-FR,fr;q=0.9",
        ...extraHeaders,
      },
    }, (res) => {
      if (res.statusCode === 429) return reject(new Error("Rate limit Steam"));
      if (res.statusCode === 400) return reject(new Error("Requête invalide (cookie expiré ?)"));
      let body = "";
      res.on("data", c => { body += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error("Parse error")); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function parseSteamPrice(raw) {
  if (!raw) return null;
  const c = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  const n = c.includes(",") && c.includes(".")
    ? c.replace(".", "").replace(",", ".")
    : c.replace(",", ".");
  return parseFloat(n) || null;
}

function parseSteamDate(str) {
  try {
    const clean = str.replace(/(\d+): \+0/, "$1:00 +0000");
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch { return null; }
}

// ── Démarrage serveur ─────────────────────────────────────────────────────────
async function startServer() {
  await loadSecrets();
  console.log("STEAM_API_KEY:", STEAM_API_KEY ? "définie" : "VIDE");
  
  // Petit délai pour laisser le temps à la découverte OpenID
  await new Promise(r => setTimeout(r, 500));
  const BASE_URL     = process.env.BASE_URL     || `http://localhost:${PORT}`;
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  // Middlewares
  app.use(cors({ origin: FRONTEND_URL, credentials: true }));
  app.use(express.json());
  app.use(session({
    secret:            SESSION_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie: {
      secure:   process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge:   7 * 24 * 60 * 60 * 1000,
    },
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  // ── Passport Steam ──────────────────────────────────────────────────────────
  passport.use(new Steam(
    {
      returnURL: `${BASE_URL}/auth/steam/return`,
      realm:     `${BASE_URL}/`,
      apiKey:    STEAM_API_KEY,
    },
    (identifier, profile, done) => done(null, {
      steamId:     profile.id,
      displayName: profile.displayName,
      avatar:      profile.photos?.[2]?.value || profile.photos?.[0]?.value || null,
      profileUrl:  profile._json?.profileurl  || null,
    })
  ));

  passport.serializeUser((user, done)   => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  const requireAuth = (req, res, next) =>
    req.isAuthenticated() ? next() : res.status(401).json({ error: "Non authentifié" });

  // ── AUTH ────────────────────────────────────────────────────────────────────
  app.get("/auth/steam",
    passport.authenticate("steam", { failureRedirect: "/" })
  );

  app.get("/auth/steam/return",
    passport.authenticate("steam", { failureRedirect: `${FRONTEND_URL}/?error=auth` }),
    (req, res) => res.redirect(FRONTEND_URL)
  );

  app.get("/api/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ authenticated: true, user: req.user });
    } else {
      res.json({ authenticated: false, user: null });
    }
  });

  app.get("/auth/logout", (req, res) => {
    req.logout(() => res.redirect(FRONTEND_URL));
  });

  // ── INVENTAIRE STEAM ────────────────────────────────────────────────────────
  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const data = await steamRequest(
        `/inventory/${req.user.steamId}/730/2?l=french&count=200`
      );
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── PORTFOLIO PAR USER ──────────────────────────────────────────────────────
  app.get("/api/portfolio", requireAuth, (req, res) => {
    const portfolios = loadJSON(PORTFOLIO_FILE);
    res.json(portfolios[req.user.steamId] || []);
  });

  app.post("/api/portfolio", requireAuth, (req, res) => {
    const { portfolio } = req.body;
    if (!Array.isArray(portfolio)) return res.status(400).json({ error: "portfolio doit être un tableau" });
    const portfolios = loadJSON(PORTFOLIO_FILE);
    portfolios[req.user.steamId] = portfolio;
    saveJSON(PORTFOLIO_FILE, portfolios);
    res.json({ saved: true });
  });

  // ── PRIX STEAM ──────────────────────────────────────────────────────────────
  app.get("/steam-price", async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Paramètre 'name' manquant" });
    try {
      const data = await steamRequest(
        `/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(name)}`
      );
      if (data.success) {
        const price = parseSteamPrice(data.lowest_price || data.median_price);
        if (price) {
          const history = loadJSON(HISTORY_FILE);
          if (!history[name]) history[name] = [];
          history[name].push({ t: Date.now(), p: price });
          saveJSON(HISTORY_FILE, history);
        }
      }
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── HISTORIQUE LOCAL ────────────────────────────────────────────────────────
  app.get("/price-history", (req, res) => {
    const history = loadJSON(HISTORY_FILE);
    const { name } = req.query;
    res.json(name ? { name, history: history[name] || [] } : history);
  });

  // ── HISTORIQUE COMPLET STEAM ────────────────────────────────────────────────
  app.get("/steam-full-history", async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Paramètre 'name' manquant" });

    const cookie = process.env.STEAM_COOKIE;
    if (!cookie) return res.status(500).json({ error: "STEAM_COOKIE manquant dans .env" });

    try {
      const data = await steamRequest(
        `/market/pricehistory/?appid=730&market_hash_name=${encodeURIComponent(name)}`,
        { Cookie: `steamLoginSecure=${cookie}` }
      );

      if (!data.success) return res.status(500).json({ error: "Historique introuvable" });

      const points = (data.prices || [])
        .map(([dateStr, priceStr]) => ({ t: parseSteamDate(dateStr), p: parseFloat(priceStr) }))
        .filter(pt => pt.t !== null && !isNaN(pt.p));

      const history = loadJSON(HISTORY_FILE);
      const local   = history[name] || [];
      const merged  = [...points];
      local.forEach(lp => {
        if (!merged.find(p => Math.abs(p.t - lp.t) < 3600000)) merged.push(lp);
      });
      merged.sort((a, b) => a.t - b.t);

      history[name] = merged;
      saveJSON(HISTORY_FILE, history);

      res.json({ name, points: merged });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── RECORD PRICES ───────────────────────────────────────────────────────────
  app.post("/record-prices", async (req, res) => {
    const { skins } = req.body;
    if (!skins || !Array.isArray(skins)) {
      return res.status(400).json({ error: "Body doit contenir { skins: [...] }" });
    }

    const history = loadJSON(HISTORY_FILE);
    const results = {};
    const now     = Date.now();

    for (let i = 0; i < skins.length; i++) {
      const name = skins[i];
      try {
        if (i > 0) await new Promise(r => setTimeout(r, 1500));
        const data = await steamRequest(
          `/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(name)}`
        );
        if (data.success) {
          const price = parseSteamPrice(data.lowest_price || data.median_price);
          if (price) {
            if (!history[name]) history[name] = [];
            history[name].push({ t: now, p: price });
            results[name] = { success: true, price };
          }
        } else {
          results[name] = { success: false, error: "Not found on Steam" };
        }
      } catch (e) {
        results[name] = { success: false, error: e.message };
      }
    }

    saveJSON(HISTORY_FILE, history);
    res.json({ recorded: results, timestamp: now });
  });

  // ── Démarrage ───────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log("======================================");
    console.log("  CS2 Wallet Backend");
    console.log(`  http://localhost:${PORT}`);
    console.log("======================================");
    console.log(`  Auth Steam  : http://localhost:${PORT}/auth/steam`);
    console.log(`  API me      : http://localhost:${PORT}/api/me`);
    console.log(`  Portfolio   : http://localhost:${PORT}/api/portfolio`);
    console.log(`  Inventaire  : http://localhost:${PORT}/api/inventory`);
    console.log("");
    const history = loadJSON(HISTORY_FILE);
    const count   = Object.keys(history).length;
    const points  = Object.values(history).reduce((a, h) => a + h.length, 0);
    console.log(`  ${count} skin(s) en historique, ${points} points`);
  });
}

startServer();