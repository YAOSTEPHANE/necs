import { redirect } from "next/navigation";

export default function AdminControlesQualiteRedirect() {
  redirect("/admin/qualite?tab=controles");
}
