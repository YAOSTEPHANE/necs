import type { Metadata } from "next";
import { ConfidentialitePage } from "@/components/site/pages/LegalPages";

export const metadata: Metadata = {
  title: "Confidentialité ; NECS SARL",
  description:
    "Politique de confidentialité NECS — données des formulaires de devis et cookies techniques.",
};

export default function Page() {
  return <ConfidentialitePage />;
}
