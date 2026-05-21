"use client";

import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline max-w-[160px] truncate">
        {user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-destructive">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
