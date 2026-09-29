/** Sur écran étroit (liste et détail empilés), fait défiler jusqu’au panneau de détail. */
export function revealDetailOnMobile(selector: string, maxWidth = 980): void {
  if (typeof window === "undefined") return;
  if (!window.matchMedia(`(max-width: ${maxWidth}px)`).matches) return;
  window.requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });
}
