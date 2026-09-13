"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getRoleSpace,
  modulesForRole,
  type RoleSpaceConfig,
} from "@/lib/role-spaces";
import { loadSession, type AdminSession } from "@/lib/auth";
import { DocIcon, docIconTone } from "@/components/admin/Icons";
import { StatusBadge } from "@/components/admin/Ui";

export function RoleSpaceWorkspace() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setReady(true);
  }, []);

  const space: RoleSpaceConfig | null = useMemo(() => {
    if (!session) return null;
    return getRoleSpace(session.role);
  }, [session]);

  const modules = useMemo(() => {
    if (!session) return [];
    return modulesForRole(session.role).slice(0, 12);
  }, [session]);

  if (!ready) {
    return (
      <div className="doc-workspace">
        <p className="note">Chargement de votre espace…</p>
      </div>
    );
  }

  if (!session || !space) {
    return (
      <div className="doc-workspace">
        <p className="note">
          Aucun espace dédié pour ce rôle. Utilisez le tableau de bord.
        </p>
        <Link href="/admin" className="btn-admin btn-admin--primary">
          Tableau de bord
        </Link>
      </div>
    );
  }

  const firstName = session.name.split(" ")[0] ?? session.name;

  return (
    <div className="doc-workspace role-space">
      <header
        className="doc-hero"
        style={{ ["--doc-tone" as string]: space.accent }}
      >
        <div className="doc-hero__glow" aria-hidden />
        <div className="doc-hero__main">
          <div className="doc-hero__badge">
            <span>{space.eyebrow}</span>
          </div>
          <h1>
            Bonjour, {firstName}
          </h1>
          <p>{space.lead}</p>
          <div className="doc-hero__meta">
            <span>
              <strong>Rôle</strong>
              {session.roleLabel}
            </span>
            <span>
              <strong>Modules</strong>
              {modules.length} accessibles
            </span>
          </div>
        </div>
        <div className="doc-hero__actions">
          <StatusBadge tone="info">{space.title}</StatusBadge>
        </div>
      </header>

      {space.tools.length > 0 ? (
        <section className="role-space__tools">
          <h2>Raccourcis</h2>
          <div className="role-space__tool-grid">
            {space.tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="role-space__tool"
                style={{ ["--tool-c" as string]: tool.tone }}
              >
                <strong>{tool.label}</strong>
                <small>{tool.hint}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="role-space__modules panel-card">
        <div className="panel-card__head">
          <h3>Mes modules</h3>
          <Link href="/admin/templates" className="symp-link">
            Voir tout
          </Link>
        </div>
        {modules.length === 0 ? (
          <div className="doc-empty">
            <strong>Aucun module</strong>
            <span>Contactez l’administrateur pour vos droits.</span>
          </div>
        ) : (
          <div className="role-space__mod-grid">
            {modules.map((doc) => {
              const tone = docIconTone(doc.slug);
              return (
                <Link
                  key={doc.slug}
                  href={`/admin/templates/${doc.slug}`}
                  className="role-space__mod"
                  style={{ ["--icon-c" as string]: tone }}
                >
                  <span className="role-space__mod-icon" aria-hidden>
                    <DocIcon slug={doc.slug} size={18} />
                  </span>
                  <span>
                    <strong>{doc.title}</strong>
                    <small>{doc.subtitle}</small>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
