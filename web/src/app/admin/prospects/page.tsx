import { redirect } from "next/navigation";

export default function AdminProspectsRedirect() {
  redirect("/admin/commercial?tab=prospects");
}
