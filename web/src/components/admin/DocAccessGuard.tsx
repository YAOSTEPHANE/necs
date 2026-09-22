"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  homeForRole,
  loadSession,
  refreshSessionFromServer,
} from "@/lib/auth";
import { canAccessDocSlug } from "@/lib/role-spaces";
import { safeRouterReplace } from "@/lib/safe-navigate";

export function DocAccessGuard({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAllowed(false);

    void (async () => {
      const fromServer = await refreshSessionFromServer();
      const session = fromServer ?? loadSession();
      if (cancelled) return;

      if (!session) {
        safeRouterReplace(
          router,
          `/admin/login?next=${encodeURIComponent(`/admin/templates/${slug}`)}`,
        );
        return;
      }

      if (!canAccessDocSlug(session.role, slug)) {
        safeRouterReplace(router, homeForRole(session.role));
        return;
      }

      setAllowed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
