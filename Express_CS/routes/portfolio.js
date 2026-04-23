const express = require("express");
const router  = express.Router();

const { requireAuth }         = require("../middleware/auth");
const { portfolios }          = require("../store");

const { buildSkin }           = require("../services/steam/buildSkin");
const { buildPortfolio }      = require("../services/portfolio/buildPortfolio");
const { buildTimeline }       = require("../services/timeline/buildTimeline");
const { getUserSkinsRawData } = require("../services/user/getUserSkinsRawData");

router.get("/", requireAuth, async (req, res) => {
  try {
    console.log("ROUTE /portfolio appelée !");
    console.log("Utilisateur :", req.user);

    const range = req.query.range || "30d";

    const rawSkins = await getUserSkinsRawData(req.user.steamId, portfolios);
    console.log("RAW SKINS REÇUS :", rawSkins.map(s => ({
      name:           s.name,
      steamHistoryLen: s.steamHistory?.length,
      historyLen:     s.history?.length
    })));

    const skins = rawSkins.map(s =>
      buildSkin(
        s.steamHistory ?? [],  // ✅ uniquement steamHistory — pas de fallback sur s.history
        s.steamListing  ?? {},
        s                      // ✅ userData contient s.history si déjà parsé
      )
    );

    const portfolio = buildPortfolio(skins);
    const timeline  = buildTimeline(skins, range);

    const currentLowest = skins.reduce(
      (sum, s) => sum + (s.lowestListingPrice ?? 0),
      0
    );

    res.json({
      portfolio,
      timeline,
      current: { lowestListing: currentLowest },
      skins,
      meta: {
        range,
        updatedAt:  Date.now(),
        skinsCount: skins.length
      }
    });

  } catch (err) {
    console.error("Erreur /portfolio :", err);
    res.status(500).json({ error: "Erreur interne serveur" });
  }
});

module.exports = router;