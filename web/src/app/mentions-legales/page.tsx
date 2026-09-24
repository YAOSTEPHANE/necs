import type { Metadata } from "next";
import { MentionsLegalesPage } from "@/components/site/pages/LegalPages";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Mentions légales",
  description:
    "Mentions légales de NECLEANING & SERVICES SARL (NECS) — éditeur et hébergeur du site.",
  path: "/mentions-legales",
});

export default function Page() {
  return <MentionsLegalesPage />;
}
