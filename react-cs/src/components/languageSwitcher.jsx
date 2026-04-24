/**
 * Language switcher button.
 *
 * Toggles between French and English.
 * Persists the selection to localStorage via i18next-browser-languagedetector.
 */
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const isFr = i18n.language?.startsWith("fr") ?? true;

  const toggle = () => {
    i18n.changeLanguage(isFr ? "en" : "fr");
  };

  return (
    <button
      onClick={toggle}
      title={isFr ? "Switch to English" : "Passer en français"}
      style={{
        background:    "var(--input-bg)",
        border:        "1px solid var(--border)",
        borderRadius:  6,
        padding:       "4px 10px",
        fontSize:      12,
        fontWeight:    600,
        color:         "var(--fg)",
        cursor:        "pointer",
        fontFamily:    "'JetBrains Mono', monospace",
        letterSpacing: 1
      }}
    >
      {isFr ? "EN" : "FR"}
    </button>
  );
}