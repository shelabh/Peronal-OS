"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, Repeat2, Target, Activity, BookOpen, Settings, LayoutGrid, FolderKanban, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/today", icon: LayoutDashboard, label: "Today" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/habits", icon: Repeat2, label: "Habits" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/metrics", icon: Activity, label: "Metrics" },
  { href: "/life-areas", icon: LayoutGrid, label: "Areas" },
  { href: "/reviews", icon: BookOpen, label: "Review" },
  { href: "/docs", icon: FileText, label: "Docs" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="mx-auto flex h-14 max-w-4xl items-center overflow-x-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[3.5rem] flex-none flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-[9px] leading-none truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
