import { redirect } from "next/navigation";

export default function AdminNonConformitesRedirect() {
  redirect("/admin/operations?tab=qualite&feature=nc");
}
