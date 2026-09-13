import type { Metadata } from "next";
import { ContactPageView } from "@/components/site/pages/BlogContactPages";

export const metadata: Metadata = {
  title: "Contact — NECS SARL",
  description:
    "Demandez un devis ou une visite technique. NECS vous répond sous 24h ouvrées.",
};

export default function Page() {
  return <ContactPageView />;
}
