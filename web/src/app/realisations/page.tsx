import type { Metadata } from "next";
import { RealisationsPage } from "@/components/site/pages/MenuPages";

export const metadata: Metadata = {
  title: "Réalisations — NECS SARL",
  description:
    "Sites, résultats et indicateurs : les réalisations NECS en nettoyage professionnel.",
};

export default function Page() {
  return <RealisationsPage />;
}
