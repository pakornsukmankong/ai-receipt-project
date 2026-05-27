"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, type Language, type TranslationStrings } from "./translations";

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: TranslationStrings;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "th" ? "en" : "th"));
  }, []);

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
