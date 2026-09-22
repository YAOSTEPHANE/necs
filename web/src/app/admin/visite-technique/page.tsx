import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

export default async function AdminVisiteTechniqueRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set("tab", "audit-visite");
  const prospectId = first(sp.prospectId);
  const visitId = first(sp.visitId);
  if (prospectId) params.set("prospectId", prospectId);
  if (visitId) params.set("visitId", visitId);
  redirect(`/admin/commercial?${params.toString()}`);
}
