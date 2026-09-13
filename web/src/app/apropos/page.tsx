import type { Metadata } from "next";
import { AproposPage } from "@/components/site/pages/MenuPages";

export const metadata: Metadata = {
  title: "À propos — NECS SARL",
  description:
    "NECLEANING & SERVICES SARL : propreté, rigueur et confiance au Cameroun.",
};

export default function Page() {
  return <AproposPage />;
}
