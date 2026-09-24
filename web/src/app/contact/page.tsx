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
    "Demandez un devis ou une visite technique. Un conseiller NECS vous répond sous 24 heures ouvrées.",
  path: "/contact",
  keywords: [
    "devis nettoyage Yaoundé",
    "contact entreprise nettoyage Douala",
    "visite technique nettoyage Cameroun",
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
