import { redirect } from "next/navigation";

export default function FacebookLeadsRedirectPage() {
  redirect("/admin/demandes?tab=integrations&feature=facebook");
}
