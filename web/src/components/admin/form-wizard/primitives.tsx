"use client";

import type { ReactNode } from "react";
import styles from "./FormWizard.module.css";

export function FwPanel({
  children,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <section className={styles.panel} aria-label={ariaLabel}>
      {children}
    </section>
  );
}

export function FwPanelHead({
  title,
  description,
  trailing,
}: {
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  if (trailing) {
    return (
      <div className={styles.panelHeadSplit}>
        <div className={styles.panelHead}>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {trailing}
      </div>
    );
  }
  return (
    <div className={styles.panelHead}>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function FwGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function FwField({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`${styles.field}${wide ? ` ${styles.fieldWide}` : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function FwBlock({ children }: { children: ReactNode }) {
  return <div className={styles.block}>{children}</div>;
}

export function FwChips({ children }: { children: ReactNode }) {
  return <div className={styles.chips}>{children}</div>;
}

export function FwChip({
  selected,
  title,
  hint,
  onClick,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.chip}${selected ? ` ${styles.chipOn}` : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
    </button>
  );
}

export function FwReview({ children }: { children: ReactNode }) {
  return <div className={styles.review}>{children}</div>;
}

export function FwReviewCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <article>
      <h4>{title}</h4>
      <dl>
        {rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function FwWarn({ children }: { children: ReactNode }) {
  return <p className={styles.warn}>{children}</p>;
}

export function FwOk({ children }: { children: ReactNode }) {
  return <p className={styles.ok}>{children}</p>;
}

export { styles as fwStyles };
