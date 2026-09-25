import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { SeoLandingPage } from "@/components/site/SeoLandingPage";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqJsonLd,
  serviceLandingJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import { SERVICE_LANDINGS, getServiceLanding } from "@/lib/seo-landings";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SERVICE_LANDINGS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const landing = getServiceLanding(slug);
  if (!landing) {
    return buildPageMetadata({
      title: "Service introuvable",
      description: "Cette prestation n’existe pas.",
      path: `/services/${slug}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: landing.metaTitle,
    description: landing.description,
    path: landing.path,
    absoluteTitle: true,
    keywords: landing.keywords,
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const landing = getServiceLanding(slug);
  if (!landing || landing.schema.kind !== "service") notFound();

  const svc = landing.schema;

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({
            path: landing.path,
            name: landing.title,
            description: landing.description,
          }),
          serviceLandingJsonLd({
            path: landing.path,
            name: svc.serviceName,
            description: landing.description,
            serviceType: svc.serviceType,
          }),
          faqJsonLd(landing.faqs),
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Activités", path: "/activites" },
            { name: landing.title, path: landing.path },
          ]),
        ]}
      />
      <SeoLandingPage landing={landing} />
    </>
  );
}
