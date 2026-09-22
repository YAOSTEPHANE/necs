import { redirect } from "next/navigation";

export default function AdminRecrutementRedirect() {
  redirect("/admin/rh?tab=recrutement");
}
