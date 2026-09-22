import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

export default async function AdminPlanificationRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set("tab", "planification");
  const siteId = first(sp.siteId);
  if (siteId) params.set("siteId", siteId);
  redirect(`/admin/operations?${params.toString()}`);
}
