export const SKINS_API = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
export const PROXY     = import.meta.env.VITE_STEAM_PROXY_URL || "http://localhost:3001";

export const STEAM_URL     = (n) => `${PROXY}/steam-price?name=${encodeURIComponent(n)}`;
export const HIST_URL      = (n) => n ? `${PROXY}/price-history?name=${encodeURIComponent(n)}` : `${PROXY}/price-history`;
export const FULL_HIST_URL = (n) => `${PROXY}/steam-full-history?name=${encodeURIComponent(n)}&addedAt=0`;
export const RECORD_URL    = `${PROXY}/record-prices`;

export const AUTO_MS = 30 * 60 * 1000;

export const WEAR_MAP = {
  "Factory New":   "FN",
  "Minimal Wear":  "MW",
  "Field-Tested":  "FT",
  "Well-Worn":     "WW",
  "Battle-Scarred":"BS",
};
export const WEAR_ORDER = ["Factory New","Minimal Wear","Field-Tested","Well-Worn","Battle-Scarred"];

export const COLORS = [
  "#00cc6a","#3b82f6","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#ec4899","#10b981","#f97316","#a78bfa",
];

export const RANGES = [
  { key:"1h",  label:"1H",  ms:3600000 },
  { key:"24h", label:"24H", ms:86400000 },
  { key:"7d",  label:"7J",  ms:604800000 },
  { key:"30d", label:"30J", ms:2592000000 },
  { key:"all", label:"MAX", ms:Infinity },
];