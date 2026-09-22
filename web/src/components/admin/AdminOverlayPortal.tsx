"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  /** Faux / null / undefined → rien n’est rendu */
  open?: unknown;
  children: ReactNode;
};

/**
 * Rend les modales dans document.body pour qu’elles restent
 * centrées sur le viewport (indépendant du scroll de la page).
 */
export function AdminOverlayPortal({ open = true, children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || !open) return null;
  return createPortal(children, document.body);
}
