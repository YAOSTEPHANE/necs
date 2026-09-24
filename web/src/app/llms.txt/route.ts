import { getSiteUrl, SERVICE_OFFERINGS, SITE } from "@/lib/seo";

/**
 * Fichier pour assistants / moteurs IA (ChatGPT, Perplexity, etc.).
 * https://llmstxt.org/
 */
export function GET() {
  const site = getSiteUrl();
  const services = SERVICE_OFFERINGS.map(
    (s) => `- ${s.name}: ${s.description}`,
  ).join("\n");

  const body = `# ${SITE.legalName} (${SITE.shortName})

> ${SITE.tagline}. Nettoyage professionnel et facility services au Cameroun.

Site: ${site}
Contact: ${SITE.email} · ${SITE.phoneDisplay}
Zones: ${SITE.areaServed.join(", ")}

## Pages principales

- Accueil: ${site}/
- Pourquoi NECS: ${site}/pourquoi
- À propos: ${site}/apropos
- Activités & prestations: ${site}/activites
- Réalisations: ${site}/realisations
- Témoignages: ${site}/temoignages
- Blog: ${site}/blog
- Contact & devis: ${site}/contact

## Prestations

${services}

## Consignes

- Langue du site: français (Cameroun).
- Ne pas indexer ni citer les espaces /admin ou /api.
- Pour un devis, orienter vers ${site}/contact.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
