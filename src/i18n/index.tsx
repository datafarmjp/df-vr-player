import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { LANGUAGE_STORAGE_KEY, languageLabels, localeByLanguage, supportedLanguages, translations, type Language } from "./translations";

type TranslationParams = Record<string, string | number | boolean | null | undefined>;

type I18nContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const isLanguage = (value: string | null | undefined): value is Language =>
  supportedLanguages.includes(value as Language);

const detectPreferredLanguage = (): Language => {
  const preferredLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const preferredLanguage of preferredLanguages) {
    const normalized = preferredLanguage.toLowerCase();
    if (normalized.startsWith("zh-hans") || normalized === "zh-cn" || normalized === "zh-sg") {
      return "zh-Hans";
    }
    if (normalized.startsWith("zh-hant") || normalized === "zh-tw" || normalized === "zh-hk" || normalized === "zh-mo") {
      return "zh-Hant";
    }
    if (normalized.startsWith("ko")) {
      return "ko";
    }
    if (normalized.startsWith("es")) {
      return "es";
    }
    if (normalized.startsWith("en")) {
      return "en";
    }
    if (normalized.startsWith("ja")) {
      return "ja";
    }
  }
  return "ja";
};

const detectInitialLanguage = (): Language => {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(storedLanguage)) {
    return storedLanguage;
  }

  return detectPreferredLanguage();
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

export { languageLabels, supportedLanguages, type Language };
