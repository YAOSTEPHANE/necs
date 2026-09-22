import { redirect } from "next/navigation";

export default function AdminRapportMensuelRedirect() {
  redirect("/admin/qualite?tab=rapport-mensuel");
}
