// server.js — CS2 Wallet Backend
require("dotenv/config");
const { requireAuth } = require("./middleware/auth");
const { portfolios, history, historyCache } = require("./store"); // ✅

const express  = require("express");
const cors     = require("cors");
const session  = require("express-session");
const passport = require("passport");
const Steam    = require("passport-steam").Strategy;
const vault    = require("node-vault");
const https    = require("https");

const app  = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────────────────────
// 1) CORS
// ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  next();
});

// ─────────────────────────────────────────────────────────────
// 2) ROUTES IMPORTÉES
// ─────────────────────────────────────────────────────────────
const portfolioRoute = require("./routes/portfolio");

// ─────────────────────────────────────────────────────────────
// 3) Secrets
// ─────────────────────────────────────────────────────────────
const CACHE_TTL = 24 * 60 * 60 * 1000;
let STEAM_API_KEY  = "";
let SESSION_SECRET = "fallback_secret_change_me";

async function loadSecrets() {
  if (process.env.NODE_ENV === "production") {
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
      process.exit(1);
    }
  } else {
    STEAM_API_KEY  = process.env.STEAM_API_KEY;
    SESSION_SECRET = process.env.SESSION_SECRET || "fallback_secret_change_me";
    console.log("Secrets chargés depuis .env (mode local)");
  }
}

// ─────────────────────────────────────────────────────────────
// 4) Helpers Steam
// ─────────────────────────────────────────────────────────────
function steamRequest(reqPath, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "steamcommunity.com",
      path:     reqPath,
      method:   "GET",
      headers:  {
        "User-Agent":      "Mozilla/5.0",
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

function downsampleBackend(points, max = 2000) {
  if (points.length <= max) return points;
  const step = Math.floor(points.length / max);
  return points.filter((_, i) => i % step === 0);
}

// ─────────────────────────────────────────────────────────────
// 5) Démarrage serveur
// ─────────────────────────────────────────────────────────────
async function startServer() {
  await loadSecrets();

  console.log("STEAM_API_KEY:", STEAM_API_KEY ? "définie" : "VIDE");
  console.log("STEAM_COOKIE:", process.env.STEAM_COOKIE ? "défini" : "MANQUANT ⚠️");

  const openid = require("openid");
  openid.RelyingParty.prototype._getAssociation = function(endpoint, callback) {
    callback(null, null);
  };

  const BASE_URL     = process.env.BASE_URL     || `http://localhost:${PORT}`;
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

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

  passport.use(new Steam(
    {
      returnURL: `${BASE_URL}/auth/steam/return`,
      realm:     `${BASE_URL}/`,
      apiKey:    STEAM_API_KEY,
      profile:   true,
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

  // ─────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // INVENTAIRE
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // PORTFOLIO EN MÉMOIRE
  // ─────────────────────────────────────────────────────────────
  app.get("/api/portfolio", requireAuth, (req, res) => {
    res.json(portfolios[req.user.steamId] || []);
  });

  app.post("/api/portfolio", requireAuth, (req, res) => {
    const { portfolio } = req.body;
    if (!Array.isArray(portfolio)) {
      return res.status(400).json({ error: "portfolio doit être un tableau" });
    }
    portfolios[req.user.steamId] = portfolio;
    res.json({ saved: true });
  });

  // ─────────────────────────────────────────────────────────────
  // PRIX STEAM
  // ─────────────────────────────────────────────────────────────
  app.get("/steam-price", async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Paramètre 'name' manquant" });
    try {
      const data = await steamRequest(
        `/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(name)}`
      );
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // HISTORIQUE COMPLET
  // ─────────────────────────────────────────────────────────────
  app.get("/steam-full-history", requireAuth, async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Paramètre 'name' manquant" });

    const cookie = process.env.STEAM_COOKIE;
    if (!cookie) return res.status(500).json({ error: "STEAM_COOKIE manquant" });

    try {
      const data = await steamRequest(
        `/market/pricehistory/?appid=730&market_hash_name=${encodeURIComponent(name)}`,
        { Cookie: `steamLoginSecure=${cookie}` }
      );

      if (!data.success) {
        return res.status(500).json({ error: "Historique introuvable — cookie expiré ?" });
      }

      const points = (data.prices || [])
        .map(([dateStr, priceStr]) => ({
          t: parseSteamDate(dateStr),
          p: parseFloat(priceStr),
        }))
        .filter(pt => pt.t && !isNaN(pt.p));

      res.json({ name, points });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // RECORD PRICES
  // ─────────────────────────────────────────────────────────────
  app.post("/record-prices", async (req, res) => {
    const { skins } = req.body;
    if (!skins || !Array.isArray(skins)) {
      return res.status(400).json({ error: "Body doit contenir { skins: [...] }" });
    }

    const results     = {};
    const now         = Date.now();
    const maxPerCycle = 5;
    const slice       = skins.slice(0, maxPerCycle);

    for (let i = 0; i < slice.length; i++) {
      const name = slice[i];
      try {
        if (i > 0) await new Promise(r => setTimeout(r, 1000));
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

    res.json({ recorded: results, timestamp: now });
  });

  // ─────────────────────────────────────────────────────────────
  // ROUTE /portfolio
  // ─────────────────────────────────────────────────────────────
  app.use("/portfolio", portfolioRoute);

  // ─────────────────────────────────────────────────────────────
  // Lancement
  // ─────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log("======================================");
    console.log("  CS2 Wallet Backend (in-memory)");
    console.log(`  http://localhost:${PORT}`);
    console.log("======================================");
    console.log(`  Auth Steam  : http://localhost:${PORT}/auth/steam`);
    console.log(`  API me      : http://localhost:${PORT}/api/me`);
    console.log(`  Portfolio   : http://localhost:${PORT}/api/portfolio`);
    console.log(`  Inventaire  : http://localhost:${PORT}/api/inventory`);
  });
}

startServer();