import type { Metadata } from "next";
import { ContactPageView } from "@/components/site/pages/BlogContactPages";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  contactPageJsonLd,
  faqJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact & devis",
  description:
    "Devis nettoyage professionnel au Cameroun — contactez NECS à Yaoundé ou Douala. Réponse sous 24 heures ouvrées (fuseau Africa/Douala).",
  path: "/contact",
  keywords: [
    "devis nettoyage Yaoundé",
    "devis nettoyage Douala",
    "contact entreprise nettoyage Cameroun",
    "visite technique nettoyage Yaoundé",
    "visite technique nettoyage Douala",
  ],
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          contactPageJsonLd(),
          faqJsonLd(),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Contact & devis", path: "/contact" },
          ]),
        ]}
      />
      <ContactPageView />
    </>
  );
}
