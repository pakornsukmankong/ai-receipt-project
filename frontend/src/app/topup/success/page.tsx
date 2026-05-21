"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../i18n/LanguageContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import AuthGuard from "../../components/AuthGuard";
import { CheckCircle, Receipt, ArrowLeft, Upload } from "lucide-react";

function SuccessPage() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-3 border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Receipt Scanner AI
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 py-20">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <div className={`transition-all duration-500 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-bold mb-2">{t.topupSuccessTitle}</h1>
              <p className="text-muted-foreground text-sm mb-6">{t.topupSuccessMessage}</p>
            </div>

            <div className="space-y-3">
              <Link href="/" className="block">
                <Button className="w-full" size="lg">
                  <Upload className="h-4 w-4 mr-2" />
                  {t.topupSuccessGoScan}
                </Button>
              </Link>
              <Link href="/topup" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t.topupSuccessGoBack}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function TopUpSuccess() {
  return (
    <AuthGuard>
      <SuccessPage />
    </AuthGuard>
  );
}
