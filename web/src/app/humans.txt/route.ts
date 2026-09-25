import { SITE, getSiteUrl } from "@/lib/seo";

/** humans.txt — entreprise camerounaise. */
export function GET() {
  const site = getSiteUrl();
  const body = `/* TEAM */
Organization: ${SITE.legalName}
Country: Cameroun
Locations: Yaoundé (Centre), Douala (Littoral)
Site: ${site}
Contact: ${SITE.email}
Phone: ${SITE.phoneDisplay}
Timezone: ${SITE.timezone}
Currency: ${SITE.currency}

/* SITE */
Standards: HTML5, CSS3, JSON-LD (schema.org LocalBusiness Cameroun)
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
