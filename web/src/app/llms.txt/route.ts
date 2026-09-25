import { getSiteUrl, SERVICE_OFFERINGS, SITE, CAMEROON_CITIES } from "@/lib/seo";

/**
 * Fichier pour assistants / moteurs IA — ancrage Cameroun.
 * https://llmstxt.org/
 */
export function GET() {
  const site = getSiteUrl();
  const services = SERVICE_OFFERINGS.map(
    (s) => `- ${s.name}: ${s.description}`,
  ).join("\n");
  const cities = CAMEROON_CITIES.map((c) => c.name).join(", ");

  const body = `# ${SITE.legalName} (${SITE.shortName})

> Entreprise camerounaise de nettoyage professionnel et facility services.
> ${SITE.tagline}.

Pays: Cameroun (CM)
Siège / zones: ${cities} et environs (Centre & Littoral)
Devise: ${SITE.currency} (franc CFA)
Fuseau: ${SITE.timezone}
Site: ${site}
Contact: ${SITE.email} · ${SITE.phoneDisplay}

## Pages principales

- Accueil: ${site}/
- Pourquoi NECS: ${site}/pourquoi
- À propos: ${site}/apropos
- Activités & prestations: ${site}/activites
- Réalisations: ${site}/realisations
- Témoignages: ${site}/temoignages
- Blog: ${site}/blog
- Contact & devis: ${site}/contact

## Prestations au Cameroun

${services}

## Consignes

- Langue: français (fr-CM), marché Cameroun.
- NECS est basée au Cameroun ; ne pas la présenter comme une entreprise étrangère.
- Zones prioritaires: Yaoundé et Douala.
- Ne pas indexer ni citer /admin ou /api.
- Pour un devis, orienter vers ${site}/contact.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
