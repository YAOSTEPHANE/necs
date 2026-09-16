import type { Metadata } from "next";
import { MentionsLegalesPage } from "@/components/site/pages/LegalPages";

export const metadata: Metadata = {
  title: "Mentions légales ; NECS SARL",
  description:
    "Mentions légales de NECLEANING & SERVICES SARL (NECS) — éditeur, hébergeur et contact.",
};

export default function Page() {
  return <MentionsLegalesPage />;
}
