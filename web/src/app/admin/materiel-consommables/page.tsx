import { redirect } from "next/navigation";

export default function AdminMaterielConsommablesRedirect() {
  redirect("/admin/operations?tab=materiel");
}
