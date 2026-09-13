"use client";

import Link from "next/link";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { ContactForm } from "@/components/site/ContactForm";
import {
  Media3D,
  PageHero,
  SiteShell,
  useNecsContent,
  useQuoteModal,
} from "@/components/site/SiteShell";

export function BlogIndexPage() {
  const content = useNecsContent();
  const posts = BLOG_POSTS.map((p) => ({
    ...p,
    image: content.images[p.imageKey],
  }));

  return (
    <SiteShell content={content}>
      <PageHero
        eyebrow="Blog"
        title={content.blogTitle}
        lead={content.blogLead}
        image={content.images.blog1}
      />
      <section className="section">
        <div className="container blog-grid">
          {posts.map((p) => (
            <article className="blog-card" key={p.slug}>
              <div style={{ position: "relative" }}>
                <Media3D src={p.image} alt={p.title} />
              </div>
              <div className="meta">{p.meta}</div>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <Link className="more" href={`/blog/${p.slug}`}>
                Lire la suite →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}

function BlogArticleInner({ slug }: { slug: string }) {
  const content = useNecsContent();
  const { openQuoteModal } = useQuoteModal();
  const post = getBlogPost(slug);

  if (!post) {
    return (
      <section className="section">
        <div className="container">
          <h1>Article introuvable</h1>
          <Link className="btn btn-primary" href="/blog">
            Retour au blog
          </Link>
        </div>
      </section>
    );
  }

  const image = content.images[post.imageKey];

  return (
    <>
      <PageHero
        eyebrow={post.meta}
        title={post.title}
        lead={post.excerpt}
        image={image}
      />
      <section className="section">
        <div className="container page-article">
          <div className="page-article__media" style={{ position: "relative" }}>
            <Media3D src={image} alt={post.title} variant="wide" />
          </div>
          <div className="page-prose">
            {post.body.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>
          <div className="page-cta-band">
            <div>
              <h2>Besoin d’appliquer ces méthodes sur votre site ?</h2>
              <p>Nos équipes déploient protocoles et reporting dès le démarrage.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openQuoteModal(`Devis: ${post.title}`)}
            >
              Demander un devis
            </button>
          </div>
          <p style={{ marginTop: "1.5rem" }}>
            <Link className="more" href="/blog">
              ← Tous les articles
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

export function BlogArticlePage({ slug }: { slug: string }) {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <BlogArticleInner slug={slug} />
    </SiteShell>
  );
}

function ContactPageInner() {
  const content = useNecsContent();
  const { openQuoteModal } = useQuoteModal();
  return (
    <>
      <PageHero
        eyebrow="Contact & Devis"
        title={content.contactTitle}
        lead={content.contactLead}
        image={content.images.hero}
      />
      <section className="section">
        <ContactForm
          content={content}
          onOpenModal={() => openQuoteModal("Page de contact")}
        />
      </section>
    </>
  );
}

export function ContactPageView() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <ContactPageInner />
    </SiteShell>
  );
}
