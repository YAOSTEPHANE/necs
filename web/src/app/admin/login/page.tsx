"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandAssets";
import {
  homeForRole,
  isAgentAllowedPath,
  loginAdmin,
  refreshSessionFromServer,
} from "@/lib/auth";
import { toast } from "@/lib/toast";
import { sanitizeRedirectPath } from "@/lib/security";

function resolvePostLoginPath(
  role: Parameters<typeof homeForRole>[0],
  next: string,
): string {
  const safeNext = sanitizeRedirectPath(next);
  const fallback = homeForRole(role);
  if (!safeNext.startsWith("/admin")) return fallback;
  if (role === "nettoyeur") {
    return isAgentAllowedPath(safeNext) ? safeNext : fallback;
  }
  if (role !== "admin") {
    if (safeNext === "/admin" || safeNext === "/admin/") return fallback;
    if (safeNext.startsWith("/admin/utilisateurs")) return fallback;
    if (safeNext.startsWith("/admin/parametres")) return fallback;
  }
  return safeNext;
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = sanitizeRedirectPath(search.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  /** Évite le mismatch d’hydratation des extensions (Kaspersky, etc.) qui injectent des nœuds dans les inputs. */
  const [fieldsReady, setFieldsReady] = useState(false);

  useEffect(() => {
    setFieldsReady(true);
  }, []);

  useEffect(() => {
    void refreshSessionFromServer().then((session) => {
      if (!session) return;
      router.replace(resolvePostLoginPath(session.role, next));
    });
  }, [router, next]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await loginAdmin(email, password, { remember });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(
        `Bienvenue, ${result.session.name.split(" ")[0] ?? result.session.name}`,
      );
      router.replace(resolvePostLoginPath(result.session.role, next));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-ambient" aria-hidden>
        <span className="login-orb login-orb--a" />
        <span className="login-orb login-orb--b" />
        <span className="login-orb login-orb--c" />
        <span className="login-grid" />
      </div>

      <div className="login-shell">
        <aside className="login-showcase">
          <div className="login-showcase__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/necs-hero.jpg" alt="" />
          </div>
          <div className="login-showcase__veil" />
          <div className="login-showcase__content">
            <div className="login-showcase__brand">
              <BrandLogo alt="NECS" width={58} height={58} />
              <div>
                <strong>NECS</strong>
                <span>NECLEANING & SERVICES SARL</span>
              </div>
            </div>

            <p className="login-showcase__eyebrow">Espace Direction</p>
            <h2>
              Pilotage premium
              <em> de vos opérations</em>
            </h2>
            <p className="login-showcase__lead">
              Documents métier, qualité terrain, finance et CRM — une console
              unique pour NECS au Cameroun.
            </p>

            <ul className="login-showcase__points">
              <li>
                <i />
                <span>28 documents métier digitalisés</span>
              </li>
              <li>
                <i />
                <span>Suivi qualité & missions en temps réel</span>
              </li>
              <li>
                <i />
                <span>Accès sécurisé multi-rôles</span>
              </li>
            </ul>

            <div className="login-showcase__foot">
              <span>Propreté · Rigueur · Confiance</span>
              <span>Douala & Yaoundé</span>
            </div>
          </div>
        </aside>

        <section className="login-panel">
          <div className="login-panel__inner">
            <div className="login-panel__top">
              <BrandLogo alt="NECS" width={48} height={48} />
              <Link href="/" className="login-panel__site">
                Site public →
              </Link>
            </div>

            <header className="login-panel__head">
              <p className="login-panel__eyebrow">Authentification sécurisée</p>
              <h1>Connexion</h1>
              <p className="login-panel__sub">
                Identifiez-vous pour ouvrir le back-office NECS.
              </p>
            </header>

            <form className="login-form" onSubmit={onSubmit} noValidate>
              {error ? (
                <div className="login-error" role="alert">
                  <span className="login-error__icon">!</span>
                  <p>{error}</p>
                </div>
              ) : null}

              <label className="login-field">
                <span>Adresse e-mail professionnelle</span>
                {fieldsReady ? (
                  <div className="login-field__control">
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M4 6h16v12H4V6zm0 0l8 7 8-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <input
                      type="email"
                      name="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="direction@necs.cm"
                    />
                  </div>
                ) : (
                  <div
                    className="login-field__control login-field__control--pending"
                    aria-hidden
                  />
                )}
              </label>

              <label className="login-field">
                <span>Mot de passe</span>
                {fieldsReady ? (
                  <div className="login-field__control">
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      className="login-field__eye"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      {showPassword ? "Masquer" : "Voir"}
                    </button>
                  </div>
                ) : (
                  <div
                    className="login-field__control login-field__control--pending"
                    aria-hidden
                  />
                )}
              </label>

              <div className="login-row">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Rester connecté</span>
                </label>
                <span className="login-secure">Session chiffrée</span>
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                <span className="login-submit__glow" aria-hidden />
                {loading ? (
                  <>
                    <span className="login-spinner" aria-hidden />
                    Authentification…
                  </>
                ) : (
                  <>
                    Accéder au tableau de bord
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <p className="login-panel__hint">
              Compte créé par l’administrateur. En cas d’oubli, contactez la
              Direction NECS.
            </p>

            <footer className="login-panel__foot">
              <p>© {new Date().getFullYear()} NECS SARL · Cameroun</p>
              <Link href="/">Retour à l’accueil</Link>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page login-page--loading">
          <div className="login-loading">
            <span className="login-spinner" />
            Chargement de l’espace sécurisé…
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
