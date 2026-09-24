import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";
import { getSiteUrl, PUBLIC_ROUTES } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const now = new Date();

  const pages: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: route.path === "/" ? site : `${site}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency ?? "monthly",
    priority: route.priority ?? 0.5,
    alternates: {
      languages: {
        fr: route.path === "/" ? site : `${site}${route.path}`,
        "fr-CM": route.path === "/" ? site : `${site}${route.path}`,
      },
    },
  }));

  const posts: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${site}/blog/${post.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.65,
    alternates: {
      languages: {
        fr: `${site}/blog/${post.slug}`,
        "fr-CM": `${site}/blog/${post.slug}`,
      },
    },
  }));

  return [...pages, ...posts];
}
