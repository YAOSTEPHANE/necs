"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { AdminSession } from "@/lib/auth";
import { isNettoyeur } from "@/lib/auth";
import { getRoleSpace } from "@/lib/role-spaces";
import {
  IconClock,
  IconHome,
  IconSettings,
  IconUser,
  IconVisit,
} from "@/components/admin/Icons";

type Props = {
  session: AdminSession;
  onLogout: () => void;
  compact?: boolean;
};

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{
        transform: open ? "rotate(180deg)" : undefined,
        transition: "transform 0.18s ease",
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconLogout(props: { size?: number }) {
  const s = props.size ?? 16;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function ProfileMenu({ session, onLogout, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const agent = isNettoyeur(session);
  const roleSpace = getRoleSpace(session.role);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`profile-menu${open ? " is-open" : ""}${compact ? " is-compact" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className="profile-menu__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="dash-avatar" aria-hidden>
          {session.initials}
        </span>
        {!compact && (
          <span className="profile-menu__meta">
            <strong>Mon compte</strong>
          </span>
        )}
        <IconChevron open={open} />
      </button>

      {open && (
        <div className="profile-menu__panel" id={menuId} role="menu">
          <div className="profile-menu__head">
            <div className="dash-avatar" aria-hidden>
              {session.initials}
            </div>
            <div>
              <strong>{session.name}</strong>
              <span>{session.email}</span>
              <em>{session.roleLabel}</em>
            </div>
          </div>

          <div className="profile-menu__section" role="none">
            <p>{agent ? "Espace agent" : "Compte"}</p>
            {agent ? (
              <>
                <Link
                  href="/admin/mon-espace"
                  role="menuitem"
                  className="profile-menu__item"
                  onClick={() => setOpen(false)}
                >
                  <span className="profile-menu__ico" data-tone="blue">
                    <IconHome size={15} />
                  </span>
                  <span>
                    <strong>Mon espace</strong>
                    <small>Accueil de la journée</small>
                  </span>
                </Link>
                <Link
                  href="/admin/operations?tab=pointage"
                  role="menuitem"
                  className="profile-menu__item"
                  onClick={() => setOpen(false)}
                >
                  <span className="profile-menu__ico" data-tone="blue">
                    <IconClock size={15} />
                  </span>
                  <span>
                    <strong>Mon pointage</strong>
                    <small>Arrivée et départ</small>
                  </span>
                </Link>
                <Link
                  href="/admin/operations?tab=terrain"
                  role="menuitem"
                  className="profile-menu__item"
                  onClick={() => setOpen(false)}
                >
                  <span className="profile-menu__ico" data-tone="green">
                    <IconVisit size={15} />
                  </span>
                  <span>
                    <strong>Photos après nettoyage</strong>
                    <small>Preuve une fois le travail terminé</small>
                  </span>
                </Link>
              </>
            ) : (
              <>
                {roleSpace ? (
                  <Link
                    href="/admin/espace"
                    role="menuitem"
                    className="profile-menu__item"
                    onClick={() => setOpen(false)}
                  >
                    <span className="profile-menu__ico" data-tone="blue">
                      <IconHome size={15} />
                    </span>
                    <span>
                      <strong>Mon espace</strong>
                      <small>{roleSpace.title}</small>
                    </span>
                  </Link>
                ) : null}
                {session.role === "admin" ? (
                  <Link
                    href="/admin/parametres"
                    role="menuitem"
                    className="profile-menu__item"
                    onClick={() => setOpen(false)}
                  >
                    <span className="profile-menu__ico" data-tone="green">
                      <IconSettings size={15} />
                    </span>
                    <span>
                      <strong>Paramètres</strong>
                      <small>Entreprise, marque, sécurité</small>
                    </span>
                  </Link>
                ) : null}
                {session.role === "admin" ? (
                  <Link
                    href="/admin/utilisateurs"
                    role="menuitem"
                    className="profile-menu__item"
                    onClick={() => setOpen(false)}
                  >
                    <span className="profile-menu__ico" data-tone="blue">
                      <IconUser size={15} />
                    </span>
                    <span>
                      <strong>Utilisateurs</strong>
                      <small>Créer des comptes et rôles</small>
                    </span>
                  </Link>
                ) : null}
                {(session.role === "admin" ||
                  session.role === "ops" ||
                  session.role === "qualite") && (
                  <Link
                    href="/admin/operations?tab=terrain"
                    role="menuitem"
                    className="profile-menu__item"
                    onClick={() => setOpen(false)}
                  >
                    <span className="profile-menu__ico" data-tone="green">
                      <IconVisit size={15} />
                    </span>
                    <span>
                      <strong>Photos terrain</strong>
                      <small>Preuves après nettoyage</small>
                    </span>
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="profile-menu__actions">
            <button
              type="button"
              role="menuitem"
              className="profile-menu__logout"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <IconLogout size={15} />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
