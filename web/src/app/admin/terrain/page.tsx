import { redirect } from "next/navigation";

export default function AdminTerrainRedirect() {
  redirect("/admin/operations?tab=terrain");
}
