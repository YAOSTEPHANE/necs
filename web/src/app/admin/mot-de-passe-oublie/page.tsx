"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { AuthFrame, AuthLoading } from "@/components/admin/AuthFrame";
import { toast } from "@/lib/toast";

const SHOWCASE = {
  title: (
    <>
      Mot de passe
      <em> oublié</em>
    </>
  ),
};

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

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
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: mail }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        devResetUrl?: string;
      };
      if (!res.ok) {
        const msg = data.error || "Demande impossible.";
        setError(msg);
        toast.error(msg);
        return;
      }
      setDone(true);
      if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
      toast.success(data.message || "Demande enregistrée.");
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
        <h1>Mot de passe oublié</h1>
        <p>
          Indiquez l’e-mail de votre compte. Si un compte existe, vous recevrez
          un lien valable 1 heure.
        </p>
      </header>

      {done ? (
        <div className="login-success" role="status">
          <p>
            Si un compte existe pour <strong>{email.trim().toLowerCase()}</strong>
            , un e-mail de réinitialisation a été envoyé. Vérifiez aussi vos
            spams.
          </p>
          {devResetUrl ? (
            <p className="login-field__hint">
              Mode développement — lien direct :{" "}
              <a href={devResetUrl}>réinitialiser</a>
            </p>
          ) : null}
          <p className="login-panel__switch">
            <Link href="/admin/login">Retour à la connexion</Link>
          </p>
        </div>
      ) : (
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

          <button type="submit" className="login-submit" disabled={loading}>
            <span className="login-submit__glow" aria-hidden />
            {loading ? (
              <>
                <span className="login-spinner" aria-hidden />
                Envoi…
              </>
            ) : (
              <>Envoyer le lien</>
            )}
          </button>
        </form>
      )}

      {!done ? (
        <p className="login-panel__switch">
          <Link href="/admin/login">Retour à la connexion</Link>
        </p>
      ) : null}
    </AuthFrame>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthLoading label="Chargement…" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
