import { redirect } from "next/navigation";

export default function AdminQualificationBesoinRedirect() {
  redirect("/admin/commercial?tab=qualification");
}
