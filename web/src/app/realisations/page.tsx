import type { Metadata } from "next";
import { RealisationsPage } from "@/components/site/pages/MenuPages";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Réalisations",
  description:
    "Sites, résultats et indicateurs qualité : découvrez les réalisations NECS en nettoyage professionnel au Cameroun.",
  path: "/realisations",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            path: "/realisations",
            name: "Réalisations — NECS",
            description:
              "Sites, résultats et indicateurs qualité NECS au Cameroun.",
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Réalisations", path: "/realisations" },
          ]),
        ]}
      />
      <RealisationsPage />
    </>
  );
}
