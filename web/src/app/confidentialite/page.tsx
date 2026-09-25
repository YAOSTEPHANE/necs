import type { Metadata } from "next";
import { ConfidentialitePage } from "@/components/site/pages/LegalPages";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Confidentialité",
  description:
    "Politique de confidentialité NECS (Cameroun) : traitement des données des formulaires, cookies et droits des personnes.",
  path: "/confidentialite",
});

export default function Page() {
  return <ConfidentialitePage />;
}
