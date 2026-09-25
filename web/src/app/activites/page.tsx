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
    "Prestations de nettoyage au Cameroun — bureaux, industrie, commerces, santé, hôtels, écoles et particuliers à Yaoundé, Douala et environs.",
  path: "/activites",
  keywords: [
    "prestations nettoyage Cameroun",
    "entretien bureaux Yaoundé",
    "entretien bureaux Douala",
    "nettoyage industriel Douala",
    "nettoyage industriel Yaoundé",
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
