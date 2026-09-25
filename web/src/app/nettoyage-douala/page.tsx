import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { SeoLandingPage } from "@/components/site/SeoLandingPage";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  cityLandingJsonLd,
  faqJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import { getCityLanding } from "@/lib/seo-landings";

const landing = getCityLanding("nettoyage-douala")!;

export const metadata: Metadata = buildPageMetadata({
  title: landing.metaTitle,
  description: landing.description,
  path: landing.path,
  absoluteTitle: true,
  keywords: landing.keywords,
});

export default function Page() {
  const city = landing.schema;
  if (city.kind !== "city") return null;

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            path: landing.path,
            name: landing.title,
            description: landing.description,
          }),
          cityLandingJsonLd({
            path: landing.path,
            city: city.city,
            region: city.region,
            latitude: city.latitude,
            longitude: city.longitude,
            description: landing.description,
          }),
          faqJsonLd(landing.faqs),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Nettoyage Douala", path: landing.path },
          ]),
        ]}
      />
      <SeoLandingPage landing={landing} />
    </>
  );
}
