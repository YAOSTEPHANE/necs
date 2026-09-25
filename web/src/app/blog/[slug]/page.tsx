import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { BlogArticlePage } from "@/components/site/pages/BlogContactPages";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  buildPageMetadata,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    return buildPageMetadata({
      title: "Article introuvable",
      description: "Cet article n’existe pas ou a été déplacé.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: post.title,
    description: `${post.excerpt} — Conseils NECS pour sites au Cameroun (Yaoundé, Douala).`,
    path: `/blog/${post.slug}`,
    type: "article",
    keywords: [
      "nettoyage Cameroun",
      "propreté Yaoundé",
      "facility Douala",
      "blog NECS Cameroun",
    ],
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: post.title,
            description: post.excerpt,
            path: `/blog/${post.slug}`,
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <BlogArticlePage slug={slug} />
    </>
  );
}
