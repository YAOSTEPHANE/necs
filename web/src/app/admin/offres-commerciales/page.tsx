import { redirect } from "next/navigation";

export default function AdminOffresCommercialesRedirect() {
  redirect("/admin/commercial?tab=offre");
}
