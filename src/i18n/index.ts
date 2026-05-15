import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr";
import en from "./en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    // Uniquement la clé Afrilex : évite d’hériter EN/FR du site NUMAFRIQ (`numafriq_lang`) par erreur.
    lng: localStorage.getItem("afrilex_lang") ?? "fr",
    fallbackLng: "fr",
    interpolation: { escapeValue: false },
  });

export default i18n;
