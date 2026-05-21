"use client";

import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { Spinner } from "./ui/spinner";
import AuthPage from "../auth/page";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <>{children}</>;
}
