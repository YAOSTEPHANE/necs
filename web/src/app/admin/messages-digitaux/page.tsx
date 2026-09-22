import { redirect } from "next/navigation";

export default function AdminMessagesDigitauxPage() {
  redirect("/admin/demandes?tab=messages");
}
