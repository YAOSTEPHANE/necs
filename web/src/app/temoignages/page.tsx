import type { Metadata } from "next";
import { TemoignagesPage } from "@/components/site/pages/MenuPages";

export const metadata: Metadata = {
  title: "Ils nous font confiance ; NECS SARL",
  description:
    "Notre engagement : équipes encadrées, qualité contrôlée, service traçable et solutions adaptées.",
};

export default function Page() {
  return <TemoignagesPage />;
}
