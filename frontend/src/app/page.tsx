"use client";

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { useLanguage } from "./i18n/LanguageContext";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Card, CardContent } from "./components/ui/card";
import { Spinner } from "./components/ui/spinner";
import { Skeleton } from "./components/ui/skeleton";
import LanguageSwitch from "./components/LanguageSwitch";
import AuthGuard from "./components/AuthGuard";
import UserMenu from "./components/UserMenu";
import { Upload, Receipt, Settings } from "lucide-react";
import api from "./lib/api";
import type { ApiError } from "./lib/api";
import type { UsageData, ReceiptData, ServicesStatus, WarningItem } from "./types";
import { compressImage } from "./lib/imageCompression";

function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-2 font-bold text-lg">
        <Receipt className="h-5 w-5 text-primary" />
        Receipt Scanner AI
      </div>
      <div className="flex items-center gap-2">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <LanguageSwitch />
        <UserMenu />
      </div>
    </nav>
  );
}

function ReceiptScanner() {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReceiptData | null>(null);
  const [services, setServices] = useState<ServicesStatus | null>(null);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const { data } = await api.get("/api/usage");
      setUsage(data.data);
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith("image/")) {
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
      setResult(null);
      setError(null);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setServices(null);
    setWarnings([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setServices(null);
    setWarnings([]);

    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("receipt", compressedFile);

      const { data } = await api.post("/api/upload-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(data.data);
      setServices(data.services);
      setWarnings(data.warnings || []);
      fetchUsage();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === "NETWORK_ERROR") {
        setError(t.networkError);
      } else if (apiErr.status === 401) {
        setError(t.authSessionExpired);
      } else {
        setError(apiErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10 pb-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Upload Usage */}
        {usageLoading && (
          <div className="mb-6 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="flex items-center gap-3 mt-2.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        )}

        {!usageLoading && usage && (
          <div className={`mb-6 p-4 rounded-lg border ${usage.isAllowed ? "bg-muted/30 border-border" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t.usageLabel}</span>
              <span className={`text-sm font-bold ${usage.isAllowed ? "text-foreground" : "text-red-600"}`}>
                {t.usageCount.replace("{used}", String(usage.currentUsage)).replace("{limit}", String(usage.limit))}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  usage.currentUsage >= usage.limit
                    ? "bg-red-500"
                    : usage.currentUsage >= usage.limit * 0.8
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(100, (usage.currentUsage / usage.limit) * 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
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
            <div className="flex items-center justify-between mt-2">
              {usage.isAllowed ? (
                <span className="text-xs text-muted-foreground">
                  {t.usageRemaining.replace("{remaining}", String(usage.remaining))}
                </span>
              ) : (
                <span className="text-xs text-red-600 font-medium">{t.usageExceeded}</span>
              )}
              <Link href="/topup">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                  {t.topupBtn}
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div
          className={`relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-accent/50 ${
            file ? "border-green-500 bg-green-50" : "border-border"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {preview ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">{t.fileSelected} {file?.name}</p>
              <img src={preview} alt="Preview" className="max-h-48 rounded-lg shadow-md" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">{t.dropzone}</p>
              <p className="text-sm text-muted-foreground">{t.dropzoneHint}</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>

        <div className="flex flex-col gap-2 mt-5">
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!file || loading || (usage !== null && !usage.isAllowed)}>
            {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {loading ? t.analyzing : (usage && !usage.isAllowed) ? t.usageExceeded : t.analyzeBtn}
          </Button>

          {(file || result || error) && !loading && (
            <Button variant="outline" size="lg" className="w-full" onClick={handleClear}>
              {t.clearBtn}
            </Button>
          )}
        </div>

        {usage && !usage.isAllowed && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm text-center">
            <p className="font-medium">{t.usageExceededMessage.replace("{limit}", String(usage.limit))}</p>
            <Link href="/topup" className="block mt-2">
              <Button size="sm" variant="outline" className="text-amber-800 border-amber-300 hover:bg-amber-100">
                {t.topupBtn}
              </Button>
            </Link>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            ❌ {error}
          </div>
        )}

        {result && (
          <Card className="mt-6">
            <CardContent className="pt-6 space-y-4">
              <div>
                <h3 className="font-bold text-lg">{t.resultTitle}</h3>
                <p className="font-semibold mt-2">🏪 {result.storeName}</p>
                <p className="text-sm text-muted-foreground">📅 {result.date}</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">{t.colItem}</th>
                      <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">{t.colQty}</th>
                      <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">{t.colPrice}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2.5 px-3">{item.name}</td>
                        <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right">฿{item.price}</td>
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/30 font-bold">
                      <td className="py-3 px-3" colSpan={2}>{t.total}</td>
                      <td className="py-3 px-3 text-right text-green-600">฿{result.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                {services?.sheetSaved ? <Badge variant="success">{t.sheetSaved}</Badge> : <Badge variant="warning">{t.sheetFailed}</Badge>}
                {services?.lineSent ? <Badge variant="success">{t.lineSent}</Badge> : <Badge variant="warning">{t.lineFailed}</Badge>}
                {services?.telegramSent ? <Badge variant="success">{t.telegramSent}</Badge> : <Badge variant="warning">{t.telegramFailed}</Badge>}
              </div>

              {warnings.length > 0 && (
                <div className="space-y-2">
                  {warnings.map((w, i) => (
                    <div key={i} className="p-2.5 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
                      ⚠️ {w.message}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 py-2.5 bg-background/80 backdrop-blur-md border-t z-50">
        <p className="text-center text-xs text-muted-foreground">
          © 2026 Pakorn Sukmankong. All rights reserved.
        </p>
      </footer>
    </>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <ReceiptScanner />
    </AuthGuard>
  );
}
