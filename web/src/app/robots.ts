import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/**
 * Crawl rules pour Google, Bing, Yahoo, DuckDuckGo, Yandex, Baidu,
 * Applebot et bots sociaux (aperçus liens).
 */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  const disallowPrivate = ["/admin/", "/api/", "/_next/"];

  const allowPublic = {
    allow: "/" as const,
    disallow: disallowPrivate,
  };

  return {
    rules: [
      { userAgent: "*", ...allowPublic },
      { userAgent: "Googlebot", ...allowPublic },
      { userAgent: "Googlebot-Image", ...allowPublic },
      { userAgent: "Bingbot", ...allowPublic },
      { userAgent: "Slurp", ...allowPublic },
      { userAgent: "DuckDuckBot", ...allowPublic },
      { userAgent: "Yandex", ...allowPublic },
      { userAgent: "Baiduspider", ...allowPublic },
      { userAgent: "Applebot", ...allowPublic },
      { userAgent: "facebookexternalhit", ...allowPublic },
      { userAgent: "Twitterbot", ...allowPublic },
      { userAgent: "LinkedInBot", ...allowPublic },
      {
        userAgent: "GPTBot",
        allow: [
          "/",
          "/blog/",
          "/activites",
          "/contact",
          "/apropos",
          "/nettoyage-yaounde",
          "/nettoyage-douala",
          "/services/",
        ],
        disallow: disallowPrivate,
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: disallowPrivate,
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: disallowPrivate,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: disallowPrivate,
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
