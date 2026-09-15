import type { Metadata } from "next";
import { BlogIndexPage } from "@/components/site/pages/BlogContactPages";

export const metadata: Metadata = {
  title: "Blog ; NECS SARL",
  description: "Conseils, qualité et innovation terrain pour le nettoyage professionnel.",
};

export default function Page() {
  return <BlogIndexPage />;
}
