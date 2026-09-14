import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { IdentityFlyer } from "@/components/site/IdentityFlyer";

export const metadata: Metadata = {
  title: "À propos — NECS SARL",
  description:
    "Des espaces propres. Un service rigoureux. Une confiance durable. NECLEANING & SERVICES SARL accompagne entreprises, industries, commerces et particuliers.",
};

export default function Page() {
  return (
    <SiteShell>
      <IdentityFlyer />
    </SiteShell>
  );
}
