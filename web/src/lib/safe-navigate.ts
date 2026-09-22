/**
 * Diffère les navigations App Router après l’init (évite
 * « Router action dispatched before initialization », surtout sous Turbopack/HMR).
 */
type AppRouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

function runWhenRouterReady(action: () => void): void {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.setTimeout(action, 0);
    });
  });
}

export function safeRouterReplace(
  router: Pick<AppRouterLike, "replace">,
  href: string,
): void {
  runWhenRouterReady(() => {
    try {
      router.replace(href);
    } catch {
      window.location.replace(href);
    }
  });
}

export function safeRouterPush(
  router: Pick<AppRouterLike, "push">,
  href: string,
): void {
  runWhenRouterReady(() => {
    try {
      router.push(href);
    } catch {
      window.location.assign(href);
    }
  });
}
