"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";
import LanguageSwitch from "./LanguageSwitch";
import UserMenu from "./UserMenu";
import { cn } from "../lib/utils";

export default function Navbar() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: t.navHome },
    { href: "/upload", label: t.navUpload },
  ];

  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b sticky top-0 bg-background/90 backdrop-blur-md z-50">
      <Link href="/" className="font-black text-lg tracking-tight">
        Receipt Scanner.
      </Link>
      <div className="flex items-center gap-1">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-sm font-medium",
                pathname === link.href
                  ? "text-foreground underline underline-offset-4"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Button>
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <LanguageSwitch />
        <UserMenu />
      </div>
    </nav>
  );
}
