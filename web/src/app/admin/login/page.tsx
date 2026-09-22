"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFrame, AuthLoading } from "@/components/admin/AuthFrame";
import {
  loginAdmin,
  refreshSessionFromServer,
  resolvePostLoginPath,
} from "@/lib/auth";
import { toast } from "@/lib/toast";
import { sanitizeRedirectPath } from "@/lib/security";
import { safeRouterReplace } from "@/lib/safe-navigate";

const LOGIN_SHOWCASE = {
  title: (
    <>
      Bienvenue sur
      <em> NECS</em>
    </>
  ),
};

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
  const [capsOn, setCapsOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void refreshSessionFromServer().then((session) => {
        if (cancelled || !session) return;
        safeRouterReplace(router, resolvePostLoginPath(session.role, next));
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router, next]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const mail = email.trim().toLowerCase();
    if (!mail.includes("@")) {
      const msg = "Indiquez une adresse e-mail valide.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!password) {
      const msg = "Indiquez votre mot de passe.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      const result = await loginAdmin(mail, password, { remember });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(
        `Bienvenue, ${result.session.name.split(" ")[0] ?? result.session.name}`,
      );
      safeRouterReplace(router, resolvePostLoginPath(result.session.role, next));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame showcase={LOGIN_SHOWCASE}>
      <header className="login-panel__head">
        <h1>Connexion</h1>
      </header>

      <form className="login-form" onSubmit={onSubmit} noValidate>
        {error ? (
          <div className="login-error" role="alert">
            <span className="login-error__icon">!</span>
            <p>{error}</p>
          </div>
        ) : null}

        <label className="login-field">
          <span>E-mail</span>
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
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@email.com"
            />
          </div>
        </label>

        <label className="login-field">
          <span>Mot de passe</span>
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
              onKeyUp={(e) =>
                setCapsOn(e.getModifierState?.("CapsLock") ?? false)
              }
              onKeyDown={(e) =>
                setCapsOn(e.getModifierState?.("CapsLock") ?? false)
              }
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
          {capsOn ? (
            <em className="login-field__hint login-field__hint--warn">
              Verr. Maj. activée
            </em>
          ) : null}
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
          <a className="login-forgot" href="/admin/mot-de-passe-oublie">
            Mot de passe oublié ?
          </a>
        </div>

        <button type="submit" className="login-submit" disabled={loading}>
          <span className="login-submit__glow" aria-hidden />
          {loading ? (
            <>
              <span className="login-spinner" aria-hidden />
              Connexion…
            </>
          ) : (
            <>
              Se connecter
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

      <p className="login-panel__switch">
        Pas de compte client ?{" "}
        <a href="/admin/inscription">S’inscrire</a>
      </p>
    </AuthFrame>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AuthLoading label="Chargement…" />}>
      <LoginForm />
    </Suspense>
  );
}
