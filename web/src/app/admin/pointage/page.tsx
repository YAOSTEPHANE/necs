import { redirect } from "next/navigation";

export default function AdminPointageRedirect() {
  redirect("/admin/operations?tab=pointage");
}
