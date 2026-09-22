import { redirect } from "next/navigation";

/** Alias CRM → module Commercial. */
export default function AdminCrmPage() {
  redirect("/admin/commercial");
}
