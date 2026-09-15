import type { Metadata } from "next";
import { ActivitesPage } from "@/components/site/pages/MenuPages";

export const metadata: Metadata = {
  title: "Activités ; NECS SARL",
  description:
    "Entretien de bureaux, nettoyage industriel, commerces et espaces publics.",
};

export default function Page() {
  return <ActivitesPage />;
}
