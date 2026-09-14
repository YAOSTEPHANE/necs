import type { Metadata, Viewport } from "next";
import { Figtree, Outfit } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import { BrandFavicon } from "@/components/BrandAssets";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";
import "./site-premium.css";
import "./identity-flyer.css";

const APP_NAME = "NECS";
const APP_TITLE = "NECS SARL — Propreté, Rigueur, Confiance";
const APP_DESCRIPTION =
  "NECLEANING & SERVICES SARL — Site public et back-office de digitalisation au Cameroun.";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_TITLE,
    template: "%s · NECS",
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/icons/icon-192.png"],
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a3a72" },
    { media: "(prefers-color-scheme: dark)", color: "#0a3a72" },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${figtree.variable} ${outfit.variable}`}>
      <body>
        <a className="skip-link" href="#contenu">
          Aller au contenu
        </a>
        <BrandFavicon />
        <PwaRegister />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
