import { redirect } from "next/navigation";

export default function AdminExpressionBesoinRedirect() {
  redirect("/admin/rh?tab=besoin");
}
