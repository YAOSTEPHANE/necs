import { redirect } from "next/navigation";

export default function AdminSatisfactionRedirect() {
  redirect("/admin/operations?tab=qualite&feature=satisfaction");
}
