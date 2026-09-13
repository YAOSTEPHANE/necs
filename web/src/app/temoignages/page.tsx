import type { Metadata } from "next";
import { TemoignagesPage } from "@/components/site/pages/MenuPages";

export const metadata: Metadata = {
  title: "Témoignages — NECS SARL",
  description: "Ils nous font confiance : la voix des clients NECS.",
};

export default function Page() {
  return <TemoignagesPage />;
}
