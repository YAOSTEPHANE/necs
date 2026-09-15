"use client";

import Image from "next/image";
import Link from "next/link";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { ContactExperience } from "@/components/site/ContactExperience";
import {
  SiteShell,
  useNecsContent,
  useQuoteModal,
} from "@/components/site/SiteShell";

function IconArrow({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
      <path
        d="M3 8h9M8.5 4.5 12.5 8 8.5 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BlogIndexPage() {
  const content = useNecsContent();
  const posts = BLOG_POSTS.map((p) => ({
    ...p,
    image: content.images[p.imageKey],
  }));

  return (
    <SiteShell content={content}>
      <div className="blg">
        <section className="sf-hero" aria-label="Blog NECS">
          <div className="sf-hero__media" aria-hidden>
            <Image
              src={content.images.blog1}
              alt=""
              fill
              priority
              unoptimized
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center 35%" }}
            />
            <div className="sf-hero__veil" />
          </div>
          <div className="container sf-hero__grid">
            <div className="sf-hero__copy">
              <p className="sf-kicker">Blog</p>
              <h1>{content.blogTitle}</h1>
              <p className="sf-hero__lead">{content.blogLead}</p>
            </div>
            <p className="sf-script sf-hero__script">
              Conseils, qualité
              <br />
              et innovation terrain
              <br />
              pour vos espaces&nbsp;!
            </p>
          </div>
        </section>

        <section className="blg-list">
          <div className="container blg-grid">
            {posts.map((p) => (
              <article className="blg-card" key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="blg-card__link">
                  <div className="blg-card__media">
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      unoptimized
                      sizes="(max-width:900px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <p className="blg-card__meta">{p.meta}</p>
                  <h2>{p.title}</h2>
                  <p>{p.excerpt}</p>
                  <span className="blg-card__more">Lire la suite</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
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
          <Link className="sf-cta" href="/blog">
            Retour au blog
          </Link>
        </div>
      </section>
    );
  }

  const image = content.images[post.imageKey];

  return (
    <div className="blg">
      <section className="sf-hero" aria-label={post.title}>
        <div className="sf-hero__media" aria-hidden>
          <Image
            src={image}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 30%" }}
          />
          <div className="sf-hero__veil" />
        </div>
        <div className="container sf-hero__grid">
          <div className="sf-hero__copy">
            <p className="sf-kicker">{post.meta}</p>
            <h1>{post.title}</h1>
            <p className="sf-hero__lead">{post.excerpt}</p>
          </div>
          <p className="sf-script sf-hero__script">
            Des méthodes
            <br />
            concrètes pour
            <br />
            élever vos standards&nbsp;!
          </p>
        </div>
      </section>

      <section className="blg-article">
        <div className="container blg-article__wrap">
          <figure className="blg-article__media">
            <Image
              src={image}
              alt={post.title}
              fill
              unoptimized
              sizes="(max-width:900px) 100vw, 900px"
              style={{ objectFit: "cover" }}
            />
          </figure>
          <div className="blg-article__prose">
            {post.body.map((para) => (
              <p key={para.slice(0, 32)}>{para}</p>
            ))}
          </div>

          <div className="sf-cta-band">
            <div>
              <h2>Besoin d’appliquer ces méthodes sur votre site&nbsp;?</h2>
              <p>Nos équipes déploient protocoles et reporting dès le démarrage.</p>
            </div>
            <button
              type="button"
              className="sf-cta"
              onClick={() => openQuoteModal(`Devis: ${post.title}`)}
            >
              Demander un devis
              <span className="sf-cta__arrow" aria-hidden>
                <IconArrow />
              </span>
            </button>
          </div>

          <p className="blg-article__back">
            <Link href="/blog">Tous les articles</Link>
          </p>
        </div>
      </section>
    </div>
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
  return <ContactExperience content={content} />;
}

export function ContactPageView() {
  const content = useNecsContent();
  return (
    <SiteShell content={content}>
      <ContactPageInner />
    </SiteShell>
  );
}
