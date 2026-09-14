"use client";

import { useQuoteModal } from "@/components/site/SiteShell";

export function IdentityQuoteButton() {
  const { openQuoteModal } = useQuoteModal();

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => openQuoteModal("Devis - À propos")}
    >
      Demander un devis
      <span aria-hidden className="btn__chev">
        →
      </span>
    </button>
  );
}
