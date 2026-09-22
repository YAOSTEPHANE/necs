"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandAssets";

export type AuthShowcaseConfig = {
  title: ReactNode;
};

type AuthFrameProps = {
  showcase: AuthShowcaseConfig;
  children: ReactNode;
  panelClassName?: string;
};

export function AuthFrame({
  showcase,
  children,
  panelClassName,
}: AuthFrameProps) {
  return (
    <div className="login-page">
      <div className="login-ambient" aria-hidden>
        <span className="login-orb login-orb--a" />
        <span className="login-orb login-orb--b" />
        <span className="login-orb login-orb--c" />
        <span className="login-grid" />
        <span className="login-sheen" />
      </div>

      <div className="login-shell">
        <aside className="login-showcase">
          <div className="login-showcase__media">
            <video
              className="login-showcase__video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
            >
              <source src="/videos/necs-hero.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="login-showcase__veil" />
          <div className="login-showcase__content">
            <div className="login-showcase__brand">
              <div className="login-logo login-logo--showcase">
                <BrandLogo
                  alt="NECS — NECLEANING & SERVICES SARL"
                  width={220}
                  height={72}
                  className="login-logo__img"
                />
              </div>
            </div>
            <h2>{showcase.title}</h2>
          </div>
        </aside>

        <section className="login-panel">
          <div
            className={
              panelClassName
                ? `login-panel__inner ${panelClassName}`
                : "login-panel__inner"
            }
          >
            <div className="login-panel__top">
              <Link href="/" className="login-panel__site">
                Site public
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M7 17L17 7M10 7h7v7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
            {children}
            <footer className="login-panel__foot">
              <p suppressHydrationWarning>
                © {new Date().getFullYear()} NECS SARL
              </p>
              <Link href="/">Accueil</Link>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}

export function AuthLoading({ label }: { label: string }) {
  return (
    <div className="login-page login-page--loading">
      <div className="login-loading">
        <span className="login-spinner" />
        {label}
      </div>
    </div>
  );
}
