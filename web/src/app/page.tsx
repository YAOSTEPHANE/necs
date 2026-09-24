import type { Metadata } from "next";
import { HomePage } from "@/components/site/HomePage";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "NECS SARL — Propreté, Rigueur, Confiance",
  description:
    "NECS (NECLEANING & SERVICES SARL) — nettoyage professionnel et facility services au Cameroun. Prestations mesurables pour entreprises, industries, commerces et particuliers à Yaoundé, Douala et environs.",
  path: "/",
  absoluteTitle: true,
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            path: "/",
            name: "NECS SARL — Propreté, Rigueur, Confiance",
            description:
              "Nettoyage professionnel et facility services au Cameroun.",
          }),
          faqJsonLd(),
          breadcrumbJsonLd([{ name: "Accueil", path: "/" }]),
        ]}
      />
      <HomePage />
    </>
  );
}
