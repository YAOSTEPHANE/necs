import type { Metadata } from "next";
import { ActivitesPage } from "@/components/site/pages/MenuPages";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  servicesJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Activités & prestations",
  description:
    "Bureaux, industrie, commerces, santé, hôtels, écoles et particuliers : protocoles de nettoyage sur mesure par NECS.",
  path: "/activites",
  keywords: [
    "prestations nettoyage Cameroun",
    "entretien bureaux Yaoundé",
    "nettoyage industriel Douala",
  ],
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          servicesJsonLd(),
          webPageJsonLd({
            path: "/activites",
            name: "Activités & prestations — NECS",
            description:
              "Protocoles de nettoyage sur mesure pour chaque environnement.",
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Activités & prestations", path: "/activites" },
          ]),
        ]}
      />
      <ActivitesPage />
    </>
  );
}
