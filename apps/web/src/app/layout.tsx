import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { Drawer, TopBar } from "@/components/TopBar";
import { Modals } from "@/components/Modals";
import { ThemeController, themeScript } from "@/components/ThemeController";
import { Toasts } from "@/components/Toasts";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const lora = Lora({ subsets: ["latin"], weight: ["600"], variable: "--font-lora", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Foodle — the daily food guessing game", template: "%s · Foodle" },
  description:
    "Guess the dish, the drink or the cuisine in six tries. Every miss reveals an ingredient. A new Foodle every day, in a Global and an India edition.",
  applicationName: "Foodle",
  appleWebApp: { capable: true, title: "Foodle", statusBarStyle: "default" },
  openGraph: { type: "website", siteName: "Foodle", title: "Foodle", description: "The daily food guessing game." },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only">
          Skip to the game
        </a>
        <ThemeController />
        <TopBar />
        <Drawer />
        {children}
        <Modals />
        <Toasts />
      </body>
    </html>
  );
}
