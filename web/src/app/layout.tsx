import type { Metadata, Viewport } from "next";
import { Caveat, Figtree, Outfit } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import { BrandFavicon } from "@/components/BrandAssets";
import { PwaRegister } from "@/components/PwaRegister";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  SITE,
  SITE_KEYWORDS,
  browserEngineMeta,
  getSiteUrl,
  siteGraphJsonLd,
} from "@/lib/seo";
import "./globals.css";
import "./site-premium.css";
import "./identity-flyer.css";
import "./flyer-roadmap.css";
import "./activity-services.css";
import "./contact-premium.css";
import "./confiance-premium.css";
import "./site-flyer.css";

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

const caveat = Caveat({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const siteUrl = getSiteUrl();

const verification: Metadata["verification"] = {
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION.trim() }
    : {}),
  ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim()
    ? { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION.trim() }
    : {}),
  ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim()
    ? {
        other: {
          "msvalidate.01":
            process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION.trim(),
        },
      }
    : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: SITE.name,
  title: {
    default: `${SITE.shortName} — Nettoyage professionnel au Cameroun`,
    template: "%s · NECS Cameroun",
  },
  description: SITE.description,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: SITE.legalName, url: siteUrl }],
  creator: SITE.legalName,
  publisher: SITE.legalName,
  category: "business",
  referrer: "strict-origin-when-cross-origin",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: siteUrl,
    languages: {
      "fr-CM": siteUrl,
      fr: siteUrl,
      "x-default": siteUrl,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE.name,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
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
    locale: SITE.locale,
    alternateLocale: ["fr_FR"],
    url: siteUrl,
    siteName: SITE.name,
    title: `${SITE.shortName} — Nettoyage professionnel au Cameroun`,
    description: SITE.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE.shortName} — Yaoundé · Douala · Cameroun`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.shortName} — Nettoyage professionnel au Cameroun`,
    description: SITE.description,
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    ...browserEngineMeta(),
    classification: "Business / Facility Services / Cleaning",
  },
  ...(Object.keys(verification).length ? { verification } : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a3a72" },
    { media: "(prefers-color-scheme: dark)", color: "#0a3a72" },
  ],
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr-CM"
      data-scroll-behavior="smooth"
      className={`${figtree.variable} ${outfit.variable} ${caveat.variable}`}
    >
      <head>
        <link rel="dns-prefetch" href="https://servicesnecs.vercel.app" />
        <link rel="preconnect" href={siteUrl} />
      </head>
      <body>
        <JsonLd data={siteGraphJsonLd()} />
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
