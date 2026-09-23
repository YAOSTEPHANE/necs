/** Événement client : badge Demandes / listes à rafraîchir. */
export const NECS_LEADS_CHANGED = "necs-leads-changed";

export function emitLeadsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NECS_LEADS_CHANGED));
}
