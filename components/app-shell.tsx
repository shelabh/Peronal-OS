"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { QuickEntry } from "@/components/quick-entry";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");

  return (
    <>
      <main className="max-w-4xl mx-auto pb-20 min-h-screen">{children}</main>
      {!isAuthRoute && <QuickEntry />}
      {!isAuthRoute && <BottomNav />}
    </>
  );
}
