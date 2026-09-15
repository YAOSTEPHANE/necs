import type { Metadata } from "next";
import { BLOG_POSTS } from "@/lib/blog";
import { BlogArticlePage } from "@/components/site/pages/BlogContactPages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  return {
    title: post ? `${post.title} ; NECS Blog` : "Article ; NECS Blog",
    description: post?.excerpt,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <BlogArticlePage slug={slug} />;
}
