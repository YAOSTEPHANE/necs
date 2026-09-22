import { redirect } from "next/navigation";

export default function SuiviCampagnesRedirectPage() {
  redirect("/admin/demandes?tab=campagnes");
}
