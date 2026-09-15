import type { Metadata } from "next";
import { ObjectifPage } from "@/components/site/pages/MenuPages";

export const metadata: Metadata = {
  title: "Objectif ; NECS SARL",
  description:
    "Devenir la référence digitale du nettoyage professionnel au Cameroun.",
};

export default function Page() {
  return <ObjectifPage />;
}
