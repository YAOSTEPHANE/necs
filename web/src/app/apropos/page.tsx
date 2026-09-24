import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { IdentityFlyer } from "@/components/site/IdentityFlyer";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "À propos",
  description:
    "NECLEANING & SERVICES SARL accompagne entreprises, industries, commerces et particuliers avec des espaces propres et un service rigoureux.",
  path: "/apropos",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            path: "/apropos",
            name: "À propos — NECS",
            description:
              "Société camerounaise de nettoyage et facility services.",
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "À propos", path: "/apropos" },
          ]),
        ]}
      />
      <SiteShell>
        <IdentityFlyer />
      </SiteShell>
    </>
  );
}
