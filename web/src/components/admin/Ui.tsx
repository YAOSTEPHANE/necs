import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { StatusTone } from "@/lib/mock-data";

export type FlashTone = "info" | "ok" | "warn" | "danger";

export function ModuleHeader({
  tone = "#1260a8",
  badge,
  icon,
  title,
  description,
  meta,
  note,
  actions,
}: {
  tone?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      className="doc-hero module-header"
      style={{ ["--doc-tone" as string]: tone }}
    >
      <div className="doc-hero__glow" aria-hidden />
      <div className="doc-hero__main">
        {badge || icon ? (
          <div className="doc-hero__badge">
            {icon ? (
              <span className="doc-hero__glyph" aria-hidden>
                {icon}
              </span>
            ) : null}
            {badge ? <span>{badge}</span> : null}
          </div>
        ) : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {meta ? <div className="doc-hero__meta">{meta}</div> : null}
        {note ? <p className="doc-hero__note">{note}</p> : null}
      </div>
      {actions ? <div className="doc-hero__actions">{actions}</div> : null}
    </header>
  );
}

/** @deprecated Prefer ModuleHeader ; kept for transitional call sites */
export function PageHeader({
  code,
  title,
  description,
  actions,
}: {
  code: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <ModuleHeader
      badge={code}
      title={title}
      description={description}
      actions={actions}
    />
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
      {action ? <div className="admin-empty__action">{action}</div> : null}
    </div>
  );
}

/** @deprecated Préférez `toast` depuis `@/lib/toast` */
export function FlashBanner({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: FlashTone;
}) {
  return (
    <div className={`admin-flash admin-flash--${tone}`} role="status">
      {children}
    </div>
  );
}

export function KpiGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    delta?: string;
    tone?: StatusTone;
    source?: string;
  }>;
}) {
  return (
    <div className="kpi-grid">
      {items.map((item) => (
        <article
          key={item.label}
          className={`kpi-card tone-${item.tone ?? "neutral"}`}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.delta ? <em>{item.delta}</em> : null}
          {item.source ? <small>{item.source}</small> : null}
        </article>
      ))}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return <span className={`status-badge tone-${tone}`}>{children}</span>;
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel-card">
      <div className="panel-card__head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`btn-admin btn-admin--primary${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`btn-admin btn-admin--ghost${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
