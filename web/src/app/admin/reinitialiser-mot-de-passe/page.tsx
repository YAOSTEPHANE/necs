"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFrame, AuthLoading } from "@/components/admin/AuthFrame";
import { toast } from "@/lib/toast";
import { safeRouterReplace } from "@/lib/safe-navigate";

const SHOWCASE = {
  title: (
    <>
      Nouveau
      <em> mot de passe</em>
    </>
  ),
};

function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = (search.get("token") || "").trim();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenState, setTokenState] = useState<"checking" | "valid" | "invalid">(
    "checking",
  );
  const [fieldsReady, setFieldsReady] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);
  const scoreLabel =
    score <= 1 ? "Faible" : score === 2 ? "Correct" : score === 3 ? "Bon" : "Fort";
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    setFieldsReady(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }
    let cancelled = false;
    void fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
      credentials: "same-origin",
    })
      .then(async (res) => {
        const data = (await res.json()) as { valid?: boolean };
        if (!cancelled) setTokenState(data.valid ? "valid" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setTokenState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      const msg = "Mot de passe : au moins 10 caractères.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      const msg = "Mot de passe : au moins une lettre et un chiffre.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (password !== confirm) {
      const msg = "Les mots de passe ne correspondent pas.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        const msg = data.error || "Réinitialisation impossible.";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(data.message || "Mot de passe mis à jour.");
      safeRouterReplace(router, "/admin/login");
    } catch {
      const msg = "Réseau indisponible. Réessayez.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame showcase={SHOWCASE}>
      <header className="login-panel__head">
        <h1>Nouveau mot de passe</h1>
        <p>Choisissez un mot de passe solide pour sécuriser votre compte NECS.</p>
      </header>

      {tokenState === "checking" ? (
        <p className="login-field__hint">Vérification du lien…</p>
      ) : null}

      {tokenState === "invalid" ? (
        <div className="login-error" role="alert">
          <span className="login-error__icon">!</span>
          <p>
            Lien invalide ou expiré.{" "}
            <Link href="/admin/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </p>
        </div>
      ) : null}

      {tokenState === "valid" ? (
        <form className="login-form" onSubmit={onSubmit} noValidate>
          {error ? (
            <div className="login-error" role="alert">
              <span className="login-error__icon">!</span>
              <p>{error}</p>
            </div>
          ) : null}

          <label className="login-field">
            <span>Nouveau mot de passe</span>
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
                  autoComplete="new-password"
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
            {password ? (
              <em className="login-field__hint">
                Robustesse : {scoreLabel}
              </em>
            ) : (
              <em className="login-field__hint">
                Au moins 10 caractères, une lettre et un chiffre.
              </em>
            )}
          </label>

          <label className="login-field">
            <span>Confirmer</span>
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
                  name="confirm"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>
            ) : (
              <div
                className="login-field__control login-field__control--pending"
                aria-hidden
              />
            )}
            {passwordsMismatch ? (
              <em className="login-field__hint login-field__hint--warn">
                Les mots de passe ne correspondent pas.
              </em>
            ) : null}
          </label>

          <button type="submit" className="login-submit" disabled={loading}>
            <span className="login-submit__glow" aria-hidden />
            {loading ? (
              <>
                <span className="login-spinner" aria-hidden />
                Enregistrement…
              </>
            ) : (
              <>Enregistrer le mot de passe</>
            )}
          </button>
        </form>
      ) : null}

      <p className="login-panel__switch">
        <Link href="/admin/login">Retour à la connexion</Link>
      </p>
    </AuthFrame>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthLoading label="Chargement…" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
