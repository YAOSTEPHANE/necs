"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeForRole, loadSession } from "@/lib/auth";
import { canAccessDocSlug } from "@/lib/role-spaces";

export function DocAccessGuard({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    if (!canAccessDocSlug(session.role, slug)) {
      router.replace(homeForRole(session.role));
    }
  }, [slug, router]);

  return <>{children}</>;
}
