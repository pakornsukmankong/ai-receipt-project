"use client";

import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "./ui/button";

export default function LanguageSwitch() {
  const { lang, toggleLang } = useLanguage();

  return (
    <Button variant="ghost" size="sm" onClick={toggleLang} className="text-xs font-semibold gap-1 px-2">
      <span className={lang === "th" ? "text-foreground" : "text-muted-foreground"}>TH</span>
      <span className="text-muted-foreground">/</span>
      <span className={lang === "en" ? "text-foreground" : "text-muted-foreground"}>EN</span>
    </Button>
  );
}
