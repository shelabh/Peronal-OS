"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DocsCallout, DocsTab } from "@/lib/docs-content";

function getCalloutStyles(tone: DocsCallout["tone"] = "info") {
  switch (tone) {
    case "warning":
      return "border-destructive/30 bg-destructive/5";
    case "tip":
      return "border-primary/30 bg-primary/5";
    case "info":
    default:
      return "border-border bg-muted/40";
  }
}

export function DocsClient({ tabs }: { tabs: DocsTab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  if (!currentTab) return null;

  return (
    <div className="px-4 pb-8 pt-6">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/12 via-background to-background px-5 py-6 sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.16),transparent_70%)]" />
        <div className="relative max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            Personal OS Guide
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Learn the system before you try to optimize it.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            This guide explains how Personal OS works, how each module should be used, and
            how to build a life system that becomes more intelligent over time.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-background/80 px-3 py-1">Public guide</span>
            <span className="rounded-full border bg-background/80 px-3 py-1">Static for launch</span>
            <span className="rounded-full border bg-background/80 px-3 py-1">Best read on mobile or desktop</span>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-20 -mx-4 mt-6 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-none rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-6 space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{currentTab.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            {currentTab.intro}
          </p>
        </div>

        <div className="grid gap-4">
          {currentTab.sections.map((section) => (
            <Card key={section.heading} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{section.heading}</CardTitle>
                <CardDescription className="text-sm leading-6 text-muted-foreground">
                  {section.body}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.workflowSteps && section.workflowSteps.length > 0 && (
                  <ol className="grid gap-3">
                    {section.workflowSteps.map((step, index) => (
                      <li key={step.title} className="flex gap-3 rounded-xl border bg-muted/25 p-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{step.title}</p>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="grid gap-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-sm leading-6 text-foreground/90">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.callout && (
                  <div className={cn("rounded-2xl border px-4 py-3", getCalloutStyles(section.callout.tone))}>
                    <p className="text-sm font-semibold">{section.callout.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {section.callout.body}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
