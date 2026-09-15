import type { Metadata } from "next";
import { PourquoiPage } from "@/components/site/pages/MenuPages";

export const metadata: Metadata = {
  title: "Pourquoi nous ; NECS SARL",
  description:
    "Rigueur opérationnelle, standard premium et digital de bout en bout : la différence NECS.",
};

export default function Page() {
  return <PourquoiPage />;
}
