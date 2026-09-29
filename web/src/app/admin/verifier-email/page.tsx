"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthFrame, AuthLoading } from "@/components/admin/AuthFrame";

const SHOWCASE = {
  title: (
    <>
      Confirmation
      <em> de votre e-mail</em>
    </>
  ),
};

type VerifyState =
  | { status: "checking" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

function VerifyEmailContent() {
  const search = useSearchParams();
  const token = (search.get("token") || "").trim();
  const [state, setState] = useState<VerifyState>({ status: "checking" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setState({ status: "error", message: "Lien incomplet." });
      return;
    }
    void fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { message?: string; error?: string };
        setState(
          res.ok
            ? { status: "ok", message: data.message || "Adresse e-mail confirmée." }
            : { status: "error", message: data.error || "Lien invalide ou expiré." },
        );
      })
      .catch(() =>
        setState({ status: "error", message: "Réseau indisponible. Réessayez." }),
      );
  }, [token]);

  return (
    <AuthFrame showcase={SHOWCASE}>
      <header className="login-panel__head">
        <h1>Confirmation de l’e-mail</h1>
        <p>Activation de votre compte NECS.</p>
      </header>

      {state.status === "checking" ? (
        <p className="login-field__hint">Vérification du lien…</p>
      ) : null}

      {state.status === "ok" ? (
        <>
          <p className="login-field__hint">{state.message}</p>
          <Link href="/admin/login?verified=1" className="login-submit">
            <span className="login-submit__glow" aria-hidden />
            Se connecter
          </Link>
        </>
      ) : null}

      {state.status === "error" ? (
        <div className="login-error" role="alert">
          <span className="login-error__icon">!</span>
          <p>
            {state.message} Un nouveau lien peut être demandé depuis la page de
            connexion.
          </p>
        </div>
      ) : null}

      <p className="login-panel__switch">
        <Link href="/admin/login">Retour à la connexion</Link>
      </p>
    </AuthFrame>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthLoading label="Chargement…" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
