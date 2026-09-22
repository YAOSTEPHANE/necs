import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

export default async function AdminReferentielOpsRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set("tab", "referentiel");
  const siteId = first(sp.siteId);
  const contractId = first(sp.contractId);
  if (siteId) params.set("siteId", siteId);
  if (contractId) params.set("contractId", contractId);
  redirect(`/admin/operations?${params.toString()}`);
}
