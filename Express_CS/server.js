// server.js — Proxy Steam + Price History Store
// Usage: node server.js
// Endpoints:
//   GET /steam-price?name=...        → relay Steam priceoverview
//   GET /price-history?name=...      → retourne l'historique stocké pour ce skin
//   POST /record-prices              → body: { skins: ["name1","name2",...] } → fetch + store tous les prix

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
// Format: { "AK-47 | Redline (FT)": [ { t: 1698234000000, p: 52.23 }, ... ] }
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

// ── Fetch price from Steam ────────────────────────────────────────────────────
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
        try {
          const data = JSON.parse(body);
          resolve(data);
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

// ── GET /steam-price ──────────────────────────────────────────────────────────
app.get("/steam-price", async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: "Paramètre 'name' manquant" });

  try {
    const data = await fetchSteamPrice(name);
    
    // Also store in history
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
    // Single skin history
    res.json({ name, history: history[name] || [] });
  } else {
    // All skins history
    res.json(history);
  }
});

// ── POST /record-prices ───────────────────────────────────────────────────────
// Fetch + store prices for all provided skins (called by auto-refresh)
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
      if (i > 0) await new Promise(r => setTimeout(r, 1500)); // Rate limit
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
  console.log("  GET  /steam-price?name=...     Relay Steam API");
  console.log("  GET  /price-history?name=...   Historique d'un skin");
  console.log("  GET  /price-history            Tout l'historique");
  console.log("  POST /record-prices            Enregistrer tous les prix");
  console.log("");
  const history = loadHistory();
  const count = Object.keys(history).length;
  const points = Object.values(history).reduce((a, h) => a + h.length, 0);
  console.log("  " + count + " skin(s) en historique, " + points + " points de données");
  console.log("");
});