import { redirect } from "next/navigation";

export default function AdminFormationsCompetencesRedirect() {
  redirect("/admin/rh?tab=competences");
}
