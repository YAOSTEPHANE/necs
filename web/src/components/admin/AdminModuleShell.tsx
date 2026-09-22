"use client";

import type { ReactNode } from "react";
import { ModuleHeader } from "@/components/admin/Ui";

export type AdminKpiItem = {
  id: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
};

type Props = {
  /** Classe page (ex. leads-page quotes-page). */
  className?: string;
  /** data-testid pour e2e. */
  testId?: string;
  /** Mode onglet hub : barre compacte au lieu du ModuleHeader. */
  embedded?: boolean;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  tone?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  kpis?: AdminKpiItem[];
  kpisLabel?: string;
  children: ReactNode;
};

/**
 * Coquille UI partagée admin — header full ou barre embarquée + KPIs.
 * Pattern de référence : leads / préfacture / CRM hubs.
 */
export function AdminModuleShell({
  className = "",
  testId,
  embedded = false,
  eyebrow,
  title,
  lead,
  tone = "#0a3a72",
  badge,
  icon,
  meta,
  actions,
  kpis,
  kpisLabel = "Indicateurs",
  children,
}: Props) {
  return (
    <div
      className={`leads-page admin-module${embedded ? " admin-module--embedded" : ""}${className ? ` ${className}` : ""}`}
      data-testid={testId}
    >
      {embedded ? (
        <div className="fin-embedded-bar admin-module__embedded">
          <div>
            <p className="fin-embedded-bar__eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            {lead ? <p>{lead}</p> : null}
          </div>
          {actions ? (
            <div className="leads-header-actions">{actions}</div>
          ) : null}
        </div>
      ) : (
        <ModuleHeader
          tone={tone}
          badge={badge ?? eyebrow}
          icon={icon}
          title={title}
          meta={
            meta ??
            (lead ? (
              <span>{lead}</span>
            ) : undefined)
          }
          actions={actions}
        />
      )}

      {kpis && kpis.length > 0 ? (
        <section className="leads-kpis" aria-label={kpisLabel}>
          {kpis.map((k) => (
            <article
              key={k.id}
              className={
                k.accent ? "leads-kpi leads-kpi--accent" : "leads-kpi"
              }
            >
              <p>{k.label}</p>
              <strong>{k.value}</strong>
              {k.hint ? <span>{k.hint}</span> : null}
            </article>
          ))}
        </section>
      ) : null}

      {children}
    </div>
  );
}

export function AdminLoadingState({
  eyebrow = "Chargement",
  title = "Chargement…",
}: {
  eyebrow?: string;
  title?: string;
}) {
  return (
    <div className="leads-empty" role="status">
      <span className="leads-empty__orb" aria-hidden />
      <p className="leads-empty__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

export function AdminInboxEmpty({
  eyebrow,
  title,
  hint,
  action,
}: {
  eyebrow?: string;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="leads-empty">
      <span className="leads-empty__orb" aria-hidden />
      {eyebrow ? <p className="leads-empty__eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {hint ? <p>{hint}</p> : null}
      {action ? <div className="leads-empty-detail__actions">{action}</div> : null}
    </div>
  );
}

export function AdminDetailEmpty({
  title = "Sélectionnez un élément",
  hint = "Les détails s’affichent ici.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="leads-empty-detail">
      <p className="leads-empty__eyebrow">Détail</p>
      <h2>{title}</h2>
      <p>{hint}</p>
    </div>
  );
}
