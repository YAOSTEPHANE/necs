import { Suspense } from "react";
import { DemandesDigitalHub } from "@/components/admin/DemandesDigitalHub";

export default function AdminDemandesPage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <DemandesDigitalHub />
    </Suspense>
  );
}
