"use client";

import Link from "next/link";
import { useLanguage } from "./i18n/LanguageContext";
import { Button } from "./components/ui/button";
import Navbar from "./components/Navbar";
import { Upload, FileSpreadsheet, Bell, Zap } from "lucide-react";

function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6">
          {t.homeHeroTitle}
        </h1>
        <p className="text-muted-foreground text-lg max-w-lg mb-8">
          {t.homeHeroSubtitle}
        </p>
        <Link href="/upload">
          <Button className="h-12 px-8 text-base font-semibold">
            {t.homeHeroCta}
          </Button>
        </Link>
      </section>

      {/* Divider */}
      <div className="border-t" />

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-black tracking-tight mb-10">{t.homeFeatureTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-bold">{t.homeFeature1Title}</h3>
            <p className="text-sm text-muted-foreground">{t.homeFeature1Desc}</p>
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="font-bold">{t.homeFeature2Title}</h3>
            <p className="text-sm text-muted-foreground">{t.homeFeature2Desc}</p>
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <h3 className="font-bold">{t.homeFeature3Title}</h3>
            <p className="text-sm text-muted-foreground">{t.homeFeature3Desc}</p>
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="font-bold">{t.homeFeature4Title}</h3>
            <p className="text-sm text-muted-foreground">{t.homeFeature4Desc}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <p className="text-center text-xs text-muted-foreground">
          © 2026 Pakorn Sukmankong. All rights reserved.
        </p>
      </footer>
    </>
  );
}

export default function Home() {
  return <HomePage />;
}
