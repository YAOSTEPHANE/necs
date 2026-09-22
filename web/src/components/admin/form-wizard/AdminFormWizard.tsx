"use client";

import type {
  FormEvent,
  CSSProperties,
  ReactNode,
} from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import styles from "./FormWizard.module.css";

export type FormWizardStep = {
  id: string;
  label: string;
  hint?: string;
};

export type AdminFormWizardProps = {
  open?: boolean;
  /** false = rendu inline (page), sans portal / backdrop */
  portal?: boolean;
  onClose: () => void;
  titleId: string;
  eyebrow: string;
  title: string;
  lead?: string;
  avatar?: ReactNode;
  steps: FormWizardStep[];
  stepId: string;
  onStepChange: (id: string) => void;
  canEnterStep?: (id: string) => boolean;
  onStepBlocked?: () => void;
  shake?: boolean;
  narrow?: boolean;
  formId?: string;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footMeta?: ReactNode;
  submitLabel?: string;
  busy?: boolean;
  canSubmit?: boolean;
  /** Override footer buttons entirely */
  footSecondary?: ReactNode;
  footPrimary?: ReactNode;
};

export function AdminFormWizard({
  open = true,
  portal = true,
  onClose,
  titleId,
  eyebrow,
  title,
  lead,
  avatar,
  steps,
  stepId,
  onStepChange,
  canEnterStep,
  onStepBlocked,
  shake = false,
  narrow = false,
  formId,
  onSubmit,
  children,
  footMeta,
  submitLabel = "Créer",
  busy = false,
  canSubmit = true,
  footSecondary,
  footPrimary,
}: AdminFormWizardProps) {
  const stepIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === stepId),
  );
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= steps.length - 1;

  function tryEnter(id: string) {
    if (canEnterStep && !canEnterStep(id)) {
      onStepBlocked?.();
      return;
    }
    onStepChange(id);
  }

  function goNext() {
    const next = steps[stepIndex + 1];
    if (!next) return;
    tryEnter(next.id);
  }

  function goBack() {
    const prev = steps[stepIndex - 1];
    if (!prev) return;
    onStepChange(prev.id);
  }

  const dialog = (
    <div
      className={`${styles.dialog}${narrow ? ` ${styles.dialogNarrow}` : ""}${!portal ? ` ${styles.pageShell}` : ""}${shake ? ` ${styles.dialogShake}` : ""}`}
      role="dialog"
      aria-modal={portal ? true : undefined}
      aria-labelledby={titleId}
      style={{ ["--fw-steps" as string]: steps.length } as CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroMain}>
          {avatar !== undefined && avatar !== null ? (
            <div className={styles.avatar} aria-hidden>
              {avatar}
            </div>
          ) : null}
          <div>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {lead ? <p className={styles.lead}>{lead}</p> : null}
          </div>
        </div>
        {portal ? (
          <button
            type="button"
            className={styles.close}
            aria-label="Fermer"
            onClick={onClose}
          >
            ✕
          </button>
        ) : null}
      </header>

      {steps.length > 1 ? (
        <nav className={styles.steps} aria-label="Étapes">
          {steps.map((s, i) => {
            const active = s.id === stepId;
            const done = i < stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                className={`${styles.step}${active || done ? ` ${styles.stepActive}` : ""}`}
                onClick={() => tryEnter(s.id)}
              >
                <span
                  className={`${styles.stepIdx}${active || done ? ` ${styles.stepIdxOn}` : ""}`}
                >
                  {i + 1}
                </span>
                <span className={styles.stepCopy}>
                  <strong>{s.label}</strong>
                  {s.hint ? <em>{s.hint}</em> : null}
                </span>
              </button>
            );
          })}
          <div className={styles.rail} aria-hidden>
            <span
              className={styles.railFill}
              style={{
                width:
                  steps.length <= 1
                    ? "100%"
                    : `${(stepIndex / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </nav>
      ) : null}

      <form
        id={formId}
        className={styles.body}
        onSubmit={(e) => {
          if (!isLast) {
            e.preventDefault();
            goNext();
            return;
          }
          onSubmit?.(e);
        }}
      >
        {children}
      </form>

      <footer className={styles.foot}>
        <div className={styles.footMeta}>
          {footMeta ?? (
            <span>
              Étape {stepIndex + 1}/{steps.length}
            </span>
          )}
        </div>
        <div className={styles.footActions}>
          {footSecondary ??
            (isFirst ? (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={onClose}
                disabled={busy}
              >
                Annuler
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={goBack}
                disabled={busy}
              >
                Retour
              </button>
            ))}
          {footPrimary ??
            (isLast ? (
              <button
                type="submit"
                form={formId}
                className={styles.btnPrimary}
                disabled={busy || !canSubmit}
              >
                {busy ? "Enregistrement…" : submitLabel}
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={goNext}
                disabled={busy}
              >
                Continuer
              </button>
            ))}
        </div>
      </footer>
    </div>
  );

  if (!portal) {
    if (!open) return null;
    return <div className={styles.pageWrap}>{dialog}</div>;
  }

  return (
    <AdminOverlayPortal open={open}>
      <div
        className={styles.backdrop}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {dialog}
      </div>
    </AdminOverlayPortal>
  );
}

export { styles as formWizardStyles };
