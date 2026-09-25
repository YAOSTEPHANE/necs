import type { Metadata } from "next";
import { BlogIndexPage } from "@/components/site/pages/BlogContactPages";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog",
  description:
    "Blog NECS Cameroun : conseils propreté, contrôle qualité digital et pilotage terrain pour dirigeants et responsables de site à Yaoundé et Douala.",
  path: "/blog",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            path: "/blog",
            name: "Blog — NECS",
            description:
              "Conseils propreté, contrôle qualité digital et pilotage terrain.",
          }),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ]}
      />
      <BlogIndexPage />
    </>
  );
}
