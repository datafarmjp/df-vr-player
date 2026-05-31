import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { LANGUAGE_STORAGE_KEY, languageLabels, localeByLanguage, translations, type Language } from "./translations";

type TranslationParams = Record<string, string | number | boolean | null | undefined>;

type I18nContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const isLanguage = (value: string | null | undefined): value is Language => value === "ja" || value === "en";

const detectInitialLanguage = (): Language => {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(storedLanguage)) {
    return storedLanguage;
  }

  const preferredLanguage = navigator.languages?.[0] ?? navigator.language;
  return preferredLanguage.toLowerCase().startsWith("en") ? "en" : "ja";
};

const interpolate = (template: string, params: TranslationParams = {}) =>
  template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(params[key] ?? ""));

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => detectInitialLanguage());

  const value = useMemo<I18nContextValue>(() => {
    const setLanguage = (nextLanguage: Language) => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      setLanguageState(nextLanguage);
    };

    const t = (key: string, params?: TranslationParams) => {
      const template = translations[language][key] ?? translations.ja[key] ?? key;
      return interpolate(template, params);
    };

    return {
      language,
      locale: localeByLanguage[language],
      setLanguage,
      t
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return value;
}

export { languageLabels, type Language };
