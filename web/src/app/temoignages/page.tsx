import type { Metadata } from "next";
import { TemoignagesPage } from "@/components/site/pages/MenuPages";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Ils nous font confiance",
  description:
    "Témoignages clients NECS au Cameroun : engagement qualité, reporting et confiance durable sur vos sites à Yaoundé et Douala.",
  path: "/temoignages",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            path: "/temoignages",
            name: "Ils nous font confiance — NECS",
            description: "Témoignages clients et engagement qualité NECS.",
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Témoignages", path: "/temoignages" },
          ]),
        ]}
      />
      <TemoignagesPage />
    </>
  );
}
