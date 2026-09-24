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
    "Conseils propreté, contrôle qualité digital et pilotage terrain — le blog NECS pour dirigeants et responsables de site.",
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
