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
  title: "NECS SARL — Nettoyage professionnel au Cameroun | Yaoundé & Douala",
  description:
    "NECS (NECLEANING & SERVICES SARL) est une entreprise camerounaise de nettoyage professionnel et de facility services à Yaoundé et Douala. Prestations mesurables pour entreprises, industries, commerces et particuliers au Cameroun.",
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
            name: "NECS SARL — Nettoyage professionnel au Cameroun",
            description:
              "Entreprise camerounaise de nettoyage et facility services à Yaoundé et Douala.",
          }),
          faqJsonLd(),
          breadcrumbJsonLd([{ name: "Accueil", path: "/" }]),
        ]}
      />
      <HomePage />
    </>
  );
}
