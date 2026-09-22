import { redirect } from "next/navigation";

export default function SocialConnectorsRedirectPage() {
  redirect("/admin/demandes?tab=integrations&feature=social");
}
