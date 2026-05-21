"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";
import LanguageSwitch from "../components/LanguageSwitch";
import { Receipt } from "lucide-react";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) { setError(t.authRequiredFields); return; }
    if (!isLogin && password !== confirmPassword) { setError(t.authPasswordMismatch); return; }
    if (!isLogin && password.length < 6) { setError(t.authPasswordTooShort); return; }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message === "Invalid login credentials" ? t.authInvalidCredentials : error.message);
        }
      } else {
        const { data, error } = await signUp(email, password);
        if (error) { setError(error.message); }
        else if ((data as { user?: { identities?: unknown[] } })?.user?.identities?.length === 0) { setError(t.authEmailExists); }
        else { setSuccess(t.authCheckEmail); setEmail(""); setPassword(""); setConfirmPassword(""); }
      }
    } catch { setError(t.unknownError); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-3 border-b">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Receipt Scanner AI
        </div>
        <LanguageSwitch />
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isLogin ? t.authLoginSubtitle : t.authRegisterSubtitle}
            </CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.authEmail}</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.authEmailPlaceholder} autoComplete="email" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.authPassword}</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.authPasswordPlaceholder} autoComplete={isLogin ? "current-password" : "new-password"} />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.authConfirmPassword}</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t.authConfirmPasswordPlaceholder} autoComplete="new-password" />
                </div>
              )}

              {error && <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">❌ {error}</div>}
              {success && <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">✅ {success}</div>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner className="mr-2 h-4 w-4" />}
                {isLogin ? t.authLoginBtn : t.authRegisterBtn}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? t.authNoAccount : t.authHasAccount}{" "}
              <button type="button" className="text-primary font-semibold hover:underline" onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }}>
                {isLogin ? t.authRegisterBtn : t.authLoginBtn}
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
