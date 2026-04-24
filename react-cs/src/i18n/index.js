/**
 * i18n configuration.
 *
 * Uses i18next with:
 *   - Browser language detection (localStorage > navigator)
 *   - Persistent language preference (stored in localStorage)
 *   - French as fallback language
 *
 * Translation files:
 *   - src/i18n/locales/fr.json
 *   - src/i18n/locales/en.json
 */
import i18n             from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import fr from "./locales/fr.json";
import en from "./locales/en.json";

i18n
  .use(LanguageDetector)   // Detects language from localStorage or browser settings
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en }
    },
    fallbackLng:   "fr",           // Default language if detection fails
    supportedLngs: ["fr", "en"],
    interpolation: {
      escapeValue: false           // React handles XSS escaping
    },
    detection: {
      order:  ["localStorage", "navigator"],
      caches: ["localStorage"]     // Persist user language choice
    }
  });

export default i18n;