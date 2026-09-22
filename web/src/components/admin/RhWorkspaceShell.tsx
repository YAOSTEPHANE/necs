"use client";

import type { ReactNode } from "react";
import { ModuleHeader } from "@/components/admin/Ui";

type Props = {
  embedded?: boolean;
  className?: string;
  tone?: string;
  badge: string;
  icon: ReactNode;
  title: string;
  eyebrow?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  testId?: string;
};

/**
 * Chrome partagé des pages RH :
 * - mode autonome : ModuleHeader complet
 * - mode hub (embedded) : barre compacte sous les onglets parcours
 */
export function RhWorkspaceShell({
  embedded = false,
  className = "leads-page",
  tone = "#0a3a72",
  badge,
  icon,
  title,
  eyebrow,
  meta,
  actions,
  children,
  testId,
}: Props) {
  return (
    <div
      className={`${className} rh-workspace${embedded ? " rh-workspace--embedded" : ""}`}
      data-testid={testId}
    >
      {embedded ? (
        <header className="rh-workspace__bar">
          <div className="rh-workspace__intro">
            <p className="rh-workspace__eyebrow">{eyebrow || badge}</p>
            <h2>{title}</h2>
            {meta ? <div className="rh-workspace__meta">{meta}</div> : null}
          </div>
          {actions ? (
            <div className="rh-workspace__actions">{actions}</div>
          ) : null}
        </header>
      ) : (
        <ModuleHeader
          tone={tone}
          badge={badge}
          icon={icon}
          title={title}
          meta={meta}
          actions={actions}
        />
      )}
      {children}
    </div>
  );
}
