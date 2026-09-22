import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

/** CRM-03 — chiffrage / devis vit dans le hub commercial. */
export default async function AdminChiffrageDevisPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set("tab", "chiffrage");
  const visitId = first(sp.visitId);
  const prospectId = first(sp.prospectId);
  const opportunityId = first(sp.opportunityId);
  if (visitId) params.set("visitId", visitId);
  if (prospectId) params.set("prospectId", prospectId);
  if (opportunityId) params.set("opportunityId", opportunityId);
  redirect(`/admin/commercial?${params.toString()}`);
}
