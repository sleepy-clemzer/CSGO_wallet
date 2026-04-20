// server.js — Proxy Steam + Price History Store
// Usage: node server.js

require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const https   = require("https");
const fs      = require("fs");
const path    = require("path");

const app  = express();
const PORT = 3001;
const HISTORY_FILE = path.join(__dirname, "price_history.json");

app.use(cors());
app.use(express.json());

// ── Load/save history ─────────────────────────────────────────────────────────
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveHistory(data) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data), "utf-8");
}

// ── Fetch current price from Steam ────────────────────────────────────────────
function fetchSteamPrice(name) {
  return new Promise((resolve, reject) => {
    const reqPath =
      "/market/priceoverview/?appid=730&currency=3&market_hash_name=" +
      encodeURIComponent(name);

    const req = https.request({
      hostname: "steamcommunity.com",
      path: reqPath,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    }, (res) => {
      if (res.statusCode === 429) return reject(new Error("Rate limit Steam"));
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error("Parse error")); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// ── Fetch full price history from Steam ───────────────────────────────────────
function fetchSteamFullHistory(name) {
  return new Promise((resolve, reject) => {
    const cookie = process.env.STEAM_COOKIE;
    if (!cookie) return reject(new Error("STEAM_COOKIE manquant dans .env"));

    const reqPath =
      "/market/pricehistory/?appid=730&market_hash_name=" +
      encodeURIComponent(name);

    const req = https.request({
      hostname: "steamcommunity.com",
      path: reqPath,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
        "Cookie": `steamLoginSecure=${cookie}`,
      },
    }, (res) => {
      if (res.statusCode === 429) return reject(new Error("Rate limit Steam"));
      if (res.statusCode === 400) return reject(new Error("Cookie invalide ou expiré"));
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          if (!data.success) return reject(new Error("Steam: historique introuvable"));
          // data.prices = [["Nov 14 2013 01: +0", "11.00", "1234"], ...]
          resolve(data.prices || []);
        } catch {
          reject(new Error("Parse error"));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function parseSteamPrice(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(".", "").replace(",", ".")
    : cleaned.replace(",", ".");
  return parseFloat(normalized) || null;
}

// ── Parse Steam date string ───────────────────────────────────────────────────
// Steam format: "Nov 14 2013 01: +0"
function parseSteamDate(str) {
  try {
    // Nettoie le format Steam : "Nov 14 2013 01: +0" → "Nov 14 2013 01:00 +0000"
    const clean = str.replace(/(\d+): \+0/, "$1:00 +0000");
    const d = new Date(clean);
    if (isNaN(d.getTime())) return null;
    return d.getTime();
  } catch {
    return null;
  }
}

// ── GET /steam-price ──────────────────────────────────────────────────────────
app.get("/steam-price", async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: "Paramètre 'name' manquant" });

  try {
    const data = await fetchSteamPrice(name);
    if (data.success) {
      const price = parseSteamPrice(data.lowest_price || data.median_price);
      if (price) {
        const history = loadHistory();
        if (!history[name]) history[name] = [];
        history[name].push({ t: Date.now(), p: price });
        saveHistory(history);
      }
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /price-history ────────────────────────────────────────────────────────
app.get("/price-history", (req, res) => {
  const name = req.query.name;
  const history = loadHistory();
  if (name) {
    res.json({ name, history: history[name] || [] });
  } else {
    res.json(history);
  }
});

// ── GET /steam-full-history ───────────────────────────────────────────────────
// Récupère l'historique complet Steam depuis la première vente
// Paramètres: ?name=... & addedAt=timestamp (optionnel, filtre depuis cette date)
app.get("/steam-full-history", async (req, res) => {
  const name = req.query.name;
  const addedAt = req.query.addedAt ? parseInt(req.query.addedAt) : 0;

  if (!name) return res.status(400).json({ error: "Paramètre 'name' manquant" });

  try {
    const rawPrices = await fetchSteamFullHistory(name);

    // Convertit le format Steam en { t, p } et filtre depuis addedAt
    const points = rawPrices
      .map(([dateStr, priceStr]) => ({
        t: parseSteamDate(dateStr),
        p: parseFloat(priceStr),
      }))
      .filter(pt => pt.t !== null && !isNaN(pt.p) && pt.t >= addedAt);

    // Fusionne avec l'historique local existant
    const history = loadHistory();
    const local = history[name] || [];

    // Merge: on garde tous les points Steam + les points locaux non dupliqués
    const allPoints = [...points];
    local.forEach(lp => {
      if (!allPoints.find(p => Math.abs(p.t - lp.t) < 3600000)) {
        allPoints.push(lp);
      }
    });

    // Trie par timestamp
    allPoints.sort((a, b) => a.t - b.t);

    // Sauvegarde le merge dans l'historique local
    history[name] = allPoints;
    saveHistory(history);

    res.json({ name, points: allPoints });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /record-prices ───────────────────────────────────────────────────────
app.post("/record-prices", async (req, res) => {
  const { skins } = req.body;
  if (!skins || !Array.isArray(skins)) {
    return res.status(400).json({ error: "Body doit contenir { skins: [...] }" });
  }

  const history = loadHistory();
  const results = {};
  const now = Date.now();

  for (let i = 0; i < skins.length; i++) {
    const name = skins[i];
    try {
      if (i > 0) await new Promise(r => setTimeout(r, 1500));
      const data = await fetchSteamPrice(name);
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

  saveHistory(history);
  res.json({ recorded: results, timestamp: now });
});

// ── DELETE /price-history ─────────────────────────────────────────────────────
app.delete("/price-history", (req, res) => {
  saveHistory({});
  res.json({ cleared: true });
});

app.listen(PORT, () => {
  console.log("======================================");
  console.log("  CS2 Steam Proxy + Price History");
  console.log("  http://localhost:" + PORT);
  console.log("======================================");
  console.log("");
  console.log("Endpoints:");
  console.log("  GET  /steam-price?name=...          Relay Steam API");
  console.log("  GET  /price-history?name=...        Historique local d'un skin");
  console.log("  GET  /price-history                 Tout l'historique local");
  console.log("  GET  /steam-full-history?name=...   Historique complet Steam");
  console.log("  POST /record-prices                 Enregistrer tous les prix");
  console.log("");
  const history = loadHistory();
  const count = Object.keys(history).length;
  const points = Object.values(history).reduce((a, h) => a + h.length, 0);
  console.log("  " + count + " skin(s) en historique, " + points + " points de données");
  console.log("");
});