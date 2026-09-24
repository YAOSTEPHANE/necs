import { SITE, getSiteUrl } from "@/lib/seo";

/** humans.txt — crédibilité éditeur (navigateurs / outils SEO). */
export function GET() {
  const site = getSiteUrl();
  const body = `/* TEAM */
Organization: ${SITE.legalName}
Site: ${site}
Contact: ${SITE.email}
Location: Yaoundé, Douala — Cameroun

/* SITE */
Standards: HTML5, CSS3, JSON-LD (schema.org)
Language: fr-CM
Doctype: HTML5
Softwares: Next.js, Vercel
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
