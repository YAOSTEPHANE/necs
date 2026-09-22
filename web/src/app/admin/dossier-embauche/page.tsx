import { redirect } from "next/navigation";

export default function AdminDossierEmbaucheRedirect() {
  redirect("/admin/rh?tab=embauche");
}
