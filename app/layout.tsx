import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { QuickEntry } from "@/components/quick-entry";
import { ServiceWorkerRegistrar } from "@/components/sw-registrar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Your personal life management system",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Personal OS",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased min-h-screen bg-background`}>
        <ServiceWorkerRegistrar />
        <main className="max-w-lg mx-auto pb-20 min-h-screen">{children}</main>
        <QuickEntry />
        <BottomNav />
      </body>
    </html>
  );
}
