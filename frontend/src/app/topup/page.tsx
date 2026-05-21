"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";
import AuthGuard from "../components/AuthGuard";
import { Receipt, ArrowLeft, Zap, CreditCard } from "lucide-react";
import api from "../lib/api";
import type { ApiError } from "../lib/api";
import type { UsageData, TopUpPackage } from "../types";

function TopUpPage() {
  const { t } = useLanguage();
  const [packages, setPackages] = useState<TopUpPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pkgRes, usageRes] = await Promise.all([
        api.get("/api/topup/packages"),
        api.get("/api/usage"),
      ]);

      setPackages(pkgRes.data.data);
      setUsage(usageRes.data.data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.code === "NETWORK_ERROR" ? t.networkError : apiErr.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    setError(null);

    try {
      const { data } = await api.post("/api/topup/create-session", { packageId });
      window.location.href = data.data.url;
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        setError(t.authSessionExpired);
      } else {
        setError(apiErr.message);
      }
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-3 border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Receipt Scanner AI
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t.topupBackHome}
          </Button>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 pb-20">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">{t.topupTitle}</h1>
          <p className="text-muted-foreground">{t.topupSubtitle}</p>
        </div>

        {usage && (
          <div className="mb-8 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t.usageLabel}</span>
              <span className="text-sm font-bold">
                {t.usageCount.replace("{used}", String(usage.currentUsage)).replace("{limit}", String(usage.limit))}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usage.currentUsage >= usage.limit ? "bg-red-500" : usage.currentUsage >= usage.limit * 0.8 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${Math.min(100, (usage.currentUsage / usage.limit) * 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                {t.usageFreeQuota}: {usage.freeLimit} {t.usageUnit}
              </span>
              {usage.bonusQuota > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                  {t.usageBonusQuota}: {usage.bonusQuota} {t.usageUnit}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={`relative overflow-hidden transition-all hover:shadow-md ${pkg.id === "50_scans" ? "border-primary ring-1 ring-primary/20" : ""}`}>
              {pkg.id === "50_scans" && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">{t.topupPopular}</div>
              )}
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{pkg.quota} {t.topupScans}</h3>
                    <p className="text-sm text-muted-foreground">฿{pkg.pricePerScan} / {t.topupPerScan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">฿{pkg.priceThb}</p>
                    <Button size="sm" className="mt-2" onClick={() => handlePurchase(pkg.id)} disabled={purchasing !== null}>
                      {purchasing === pkg.id ? <Spinner className="h-4 w-4 mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
                      {purchasing === pkg.id ? t.topupProcessing : t.topupBuyBtn}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-lg bg-muted/30 border">
          <h4 className="font-medium text-sm mb-2">{t.topupInfoTitle}</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• {t.topupInfo1}</li>
            <li>• {t.topupInfo2}</li>
            <li>• {t.topupInfo3}</li>
            <li>• {t.topupInfo4}</li>
          </ul>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">❌ {error}</div>
        )}
      </div>
    </>
  );
}

export default function TopUp() {
  return (
    <AuthGuard>
      <TopUpPage />
    </AuthGuard>
  );
}
