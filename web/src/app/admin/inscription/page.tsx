"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFrame, AuthLoading } from "@/components/admin/AuthFrame";
import {
  refreshSessionFromServer,
  registerAdmin,
  resolvePostLoginPath,
} from "@/lib/auth";
import { toast } from "@/lib/toast";
import { sanitizeRedirectPath } from "@/lib/security";
import { safeRouterReplace } from "@/lib/safe-navigate";

const REGISTER_SHOWCASE = {
  title: (
    <>
      Compte
      <em> client</em>
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

type Step = 1 | 2 | 3;

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = sanitizeRedirectPath(search.get("next"));
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [fieldsReady, setFieldsReady] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);
  const scoreLabel =
    score <= 1 ? "Faible" : score === 2 ? "Correct" : score === 3 ? "Bon" : "Fort";
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    setFieldsReady(true);
  }, []);

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

  const goNextFromIdentity = () => {
    setError(null);
    if (name.trim().length < 2) {
      const msg = "Indiquez votre nom ou raison sociale.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!email.trim().includes("@") || email.trim().length < 5) {
      const msg = "Indiquez une adresse e-mail valide.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setStep(2);
  };

  const goNextFromSecurity = () => {
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
    setStep(3);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      goNextFromIdentity();
      return;
    }
    if (step === 2) {
      goNextFromSecurity();
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const result = await registerAdmin({
        name,
        email,
        phone,
        password,
        inviteCode: inviteCode.trim() || undefined,
        remember,
        role: "client",
      });
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
    <AuthFrame
      showcase={REGISTER_SHOWCASE}
      panelClassName="login-panel__inner--register"
    >
      <header className="login-panel__head">
        <h1>Inscription client</h1>
      </header>

      <ol className="login-steps" aria-label="Étapes d’inscription">
        <li className={step >= 1 ? "is-active" : ""} aria-current={step === 1}>
          <em>1</em>
          <span>Identité</span>
        </li>
        <li className={step >= 2 ? "is-active" : ""} aria-current={step === 2}>
          <em>2</em>
          <span>Sécurité</span>
        </li>
        <li className={step >= 3 ? "is-active" : ""} aria-current={step === 3}>
          <em>3</em>
          <span>Validation</span>
        </li>
      </ol>

      <form className="login-form" onSubmit={onSubmit} noValidate>
        {error ? (
          <div className="login-error" role="alert">
            <span className="login-error__icon">!</span>
            <p>{error}</p>
          </div>
        ) : null}

        {step === 1 ? (
          <>
            <label className="login-field">
              <span>Nom / entreprise</span>
              {fieldsReady ? (
                <div className="login-field__control">
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    type="text"
                    name="name"
                    autoComplete="organization"
                    autoFocus
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex. Société Exemple SA"
                  />
                </div>
              ) : (
                <div
                  className="login-field__control login-field__control--pending"
                  aria-hidden
                />
              )}
            </label>

            <div className="login-fields-row">
              <label className="login-field">
                <span>E-mail</span>
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
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@email.com"
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
                <span>Téléphone</span>
                {fieldsReady ? (
                  <div className="login-field__control">
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M7 3h4l1 4-2 2a12 12 0 0 0 5 5l2-2 4 1v4a2 2 0 0 1-2 2A15 15 0 0 1 5 5a2 2 0 0 1 2-2z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+237 6XX XXX XXX"
                    />
                  </div>
                ) : (
                  <div
                    className="login-field__control login-field__control--pending"
                    aria-hidden
                  />
                )}
              </label>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
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
                    autoComplete="new-password"
                    autoFocus
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 10 caractères"
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
                <div
                  className={`login-pwd-meter login-pwd-meter--${score}`}
                  aria-live="polite"
                >
                  <span className="login-pwd-meter__bars" aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>Sécurité : {scoreLabel}</span>
                </div>
              ) : null}
            </label>

            <label className="login-field">
              <span>Confirmer le mot de passe</span>
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
                    placeholder="Retapez le mot de passe"
                  />
                </div>
              ) : (
                <div
                  className="login-field__control login-field__control--pending"
                  aria-hidden
                />
              )}
              {passwordsMatch ? (
                <em className="login-field__hint login-field__hint--ok">
                  Mots de passe identiques
                </em>
              ) : null}
              {passwordsMismatch ? (
                <em className="login-field__hint login-field__hint--warn">
                  Les mots de passe diffèrent
                </em>
              ) : null}
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="login-summary" aria-label="Récapitulatif">
              <p>
                <strong>{name.trim()}</strong>
              </p>
              <p>{email.trim().toLowerCase()}</p>
              {phone.trim() ? <p>{phone.trim()}</p> : null}
            </div>

            <label className="login-field">
              <span>Code d’invitation</span>
              {fieldsReady ? (
                <div className="login-field__control">
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M7 11h10v9H7v-9zm2-3a3 3 0 0 1 6 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    type="text"
                    name="invite"
                    autoComplete="off"
                    autoFocus
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Optionnel"
                  />
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
            </div>
          </>
        ) : null}

        <div className={`login-actions${step > 1 ? " login-actions--split" : ""}`}>
          {step > 1 ? (
            <button
              type="button"
              className="login-back"
              onClick={() => {
                setError(null);
                setStep((s) => (s === 3 ? 2 : 1));
              }}
              disabled={loading}
            >
              Retour
            </button>
          ) : null}
          <button type="submit" className="login-submit" disabled={loading}>
            <span className="login-submit__glow" aria-hidden />
            {loading ? (
              <>
                <span className="login-spinner" aria-hidden />
                Création du compte…
              </>
            ) : step < 3 ? (
              <>
                Continuer
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
            ) : (
              <>
                Créer mon compte client
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
        </div>
      </form>

      <p className="login-panel__switch">
        Déjà un compte ? <a href="/admin/login">Se connecter</a>
      </p>
    </AuthFrame>
  );
}

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={<AuthLoading label="Chargement…" />}>
      <RegisterForm />
    </Suspense>
  );
}
