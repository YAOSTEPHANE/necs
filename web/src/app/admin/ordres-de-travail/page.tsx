import { redirect } from "next/navigation";

export default function AdminOrdresDeTravailRedirect() {
  redirect("/admin/operations?tab=missions");
}
