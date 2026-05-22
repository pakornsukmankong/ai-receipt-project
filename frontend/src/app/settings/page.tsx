"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";
import LanguageSwitch from "../components/LanguageSwitch";
import UserMenu from "../components/UserMenu";
import AuthGuard from "../components/AuthGuard";
import { Receipt, ArrowLeft, Save } from "lucide-react";
import api from "../lib/api";
import type { ApiError } from "../lib/api";
import type { UserSettings } from "../types";
import { Tooltip } from "../components/ui/tooltip";
import { Toggle } from "../components/ui/toggle";

function SettingsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    googleSheetId: "",
    lineChannelAccessToken: "",
    lineUserId: "",
    telegramBotToken: "",
    telegramChatId: "",
    enableGoogleSheets: true,
    enableLine: true,
    enableTelegram: true,
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const { data } = await api.get("/api/settings");
      if (data.success) setSettings(data.data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.put("/api/settings", settings);
      setSuccess(t.settingsSaved);
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
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UserSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-3 border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-70 transition-opacity">
          <Receipt className="h-5 w-5 text-primary" />
          Receipt Scanner AI
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <UserMenu />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">⚙️ {t.settingsTitle}</h1>
          <p className="text-muted-foreground">{t.settingsSubtitle}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">📊 Google Sheets</CardTitle>
                <Toggle
                  checked={settings.enableGoogleSheets}
                  onChange={(v) => setSettings((prev) => ({ ...prev, enableGoogleSheets: v }))}
                  label={settings.enableGoogleSheets ? t.toggleOn : t.toggleOff}
                />
              </div>
            </CardHeader>
            {settings.enableGoogleSheets && (
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Tooltip content={t.tooltipSheetId}>
                      {t.settingsSheetId}
                    </Tooltip>
                  </label>
                  <Input value={settings.googleSheetId} onChange={handleChange("googleSheetId")} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
                  <p className="text-xs text-muted-foreground">{t.settingsSheetIdHint}</p>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">💬 LINE</CardTitle>
                <Toggle
                  checked={settings.enableLine}
                  onChange={(v) => setSettings((prev) => ({ ...prev, enableLine: v }))}
                  label={settings.enableLine ? t.toggleOn : t.toggleOff}
                />
              </div>
            </CardHeader>
            {settings.enableLine && (
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Tooltip content={t.tooltipLineToken}>
                      {t.settingsLineToken}
                    </Tooltip>
                  </label>
                  <Input type="password" value={settings.lineChannelAccessToken} onChange={handleChange("lineChannelAccessToken")} placeholder="Channel Access Token" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Tooltip content={t.tooltipLineUserId}>
                      {t.settingsLineUserId}
                    </Tooltip>
                  </label>
                  <Input value={settings.lineUserId} onChange={handleChange("lineUserId")} placeholder="U1234567890abcdef..." />
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">📨 Telegram</CardTitle>
                <Toggle
                  checked={settings.enableTelegram}
                  onChange={(v) => setSettings((prev) => ({ ...prev, enableTelegram: v }))}
                  label={settings.enableTelegram ? t.toggleOn : t.toggleOff}
                />
              </div>
            </CardHeader>
            {settings.enableTelegram && (
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Tooltip content={t.tooltipTelegramToken}>
                      {t.settingsTelegramToken}
                    </Tooltip>
                  </label>
                  <Input type="password" value={settings.telegramBotToken} onChange={handleChange("telegramBotToken")} placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Tooltip content={t.tooltipTelegramChatId}>
                      {t.settingsTelegramChatId}
                    </Tooltip>
                  </label>
                  <Input value={settings.telegramChatId} onChange={handleChange("telegramChatId")} placeholder="123456789" />
                </div>
              </CardContent>
            )}
          </Card>

          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">❌ {error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">✅ {success}</div>}

          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t.settingsSaveBtn}
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.settingsBackHome}
          </Link>
        </div>
      </div>
    </>
  );
}

export default function Settings() {
  return (
    <AuthGuard>
      <SettingsPage />
    </AuthGuard>
  );
}
