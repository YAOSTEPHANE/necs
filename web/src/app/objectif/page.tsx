import type { Metadata } from "next";
import { ObjectifPage } from "@/components/site/pages/MenuPages";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Objectif",
  description:
    "Devenir la référence digitale du nettoyage et des facility services au Cameroun, avec des prestations transparentes et mesurables.",
  path: "/objectif",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            path: "/objectif",
            name: "Objectif — NECS",
            description:
              "Référence digitale du nettoyage et des facility services au Cameroun.",
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Objectif", path: "/objectif" },
          ]),
        ]}
      />
      <ObjectifPage />
    </>
  );
}
