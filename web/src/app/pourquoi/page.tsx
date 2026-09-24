import type { Metadata } from "next";
import { PourquoiPage } from "@/components/site/pages/MenuPages";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Pourquoi NECS",
  description:
    "La différence NECS : équipes formées, encadrement de proximité et reporting digital pour une propreté mesurable au Cameroun.",
  path: "/pourquoi",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            path: "/pourquoi",
            name: "Pourquoi NECS",
            description:
              "Équipes formées, encadrement de proximité et reporting digital.",
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Pourquoi NECS", path: "/pourquoi" },
          ]),
        ]}
      />
      <PourquoiPage />
    </>
  );
}
