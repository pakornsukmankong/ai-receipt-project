"use client";

import Link from "next/link";
import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import Navbar from "../components/Navbar";
import { Check } from "lucide-react";

export default function PricingPage() {
  const { t } = useLanguage();

  const freeFeatures = [
    t.pricingFree1,
    t.pricingFree2,
    t.pricingFree3,
    t.pricingFree4,
    t.pricingFree5,
  ];

  const packages = [
    { scans: 10, price: 20 },
    { scans: 50, price: 100 },
    { scans: 100, price: 200 },
  ];

  return (
    <>
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">{t.pricingTitle}</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">{t.pricingSubtitle}</p>
        </div>

        {/* Free Tier */}
        <div className="mb-12">
          <Card className="border-2">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black mb-1">{t.pricingFreeTitle}</h2>
                  <p className="text-muted-foreground text-sm">{t.pricingFreeDesc}</p>
                  <ul className="mt-4 space-y-2">
                    {freeFeatures.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-center sm:text-right shrink-0">
                  <p className="text-4xl font-black">฿0</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.pricingPerMonth}</p>
                  <Link href="/upload" className="block mt-4">
                    <Button variant="outline" className="w-full sm:w-auto">{t.pricingGetStarted}</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top-up Packages */}
        <div className="mb-8">
          <h2 className="text-2xl font-black tracking-tight mb-2">{t.pricingTopupTitle}</h2>
          <p className="text-muted-foreground text-sm mb-6">{t.pricingTopupDesc}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.scans} className={pkg.scans === 50 ? "border-2 border-foreground" : ""}>
              <CardContent className="p-6 text-center">
                {pkg.scans === 50 && (
                  <span className="inline-block text-xs font-semibold bg-foreground text-background px-2 py-0.5 rounded mb-3">
                    {t.pricingPopular}
                  </span>
                )}
                <p className="text-3xl font-black">฿{pkg.price}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {pkg.scans} {t.pricingScans}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ฿2 / {t.pricingPerScan}
                </p>
                <Link href="/topup" className="block mt-4">
                  <Button className="w-full" variant={pkg.scans === 50 ? "default" : "outline"}>
                    {t.pricingBuyBtn}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          {t.pricingNote}
        </p>
      </div>

      <footer className="border-t py-6">
        <p className="text-center text-xs text-muted-foreground">
          © 2026 Pakorn Sukmankong. All rights reserved.
        </p>
      </footer>
    </>
  );
}
