"use client";

import Link from "next/link";
import { SiteShell, useQuoteModal } from "@/components/site/SiteShell";
import type { SeoLanding } from "@/lib/seo-landings";

function SeoLandingInner({ landing }: { landing: SeoLanding }) {
  const { openQuoteModal } = useQuoteModal();

  return (
    <article className="seo-land">
      <header className="seo-land__hero">
        <div className="container seo-land__hero-inner">
          <p className="seo-land__kicker">{landing.kicker}</p>
          <h1>{landing.title}</h1>
          <p className="seo-land__lead">{landing.lead}</p>
          <div className="seo-land__cta">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openQuoteModal()}
            >
              {landing.ctaLabel}
              <span aria-hidden className="btn__chev">
                →
              </span>
            </button>
            <Link href="/contact" className="btn btn-ghost on-light">
              Page contact
            </Link>
          </div>
        </div>
      </header>

      <div className="container seo-land__body">
        <ul className="seo-land__bullets">
          {landing.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>

        {landing.sections.map((section) => (
          <section key={section.heading} className="seo-land__section">
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}

        {landing.faqs.length ? (
          <section className="seo-land__faq" aria-labelledby="seo-faq-title">
            <h2 id="seo-faq-title">Questions fréquentes</h2>
            <div className="seo-land__faq-list">
              {landing.faqs.map((faq) => (
                <details key={faq.question} className="seo-land__faq-item">
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        <nav className="seo-land__related" aria-label="Pages associées">
          <h2>Continuer</h2>
          <ul>
            {landing.related.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </article>
  );
}

export function SeoLandingPage({ landing }: { landing: SeoLanding }) {
  return (
    <SiteShell>
      <SeoLandingInner landing={landing} />
    </SiteShell>
  );
}
