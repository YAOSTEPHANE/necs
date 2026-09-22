import { Suspense } from "react";
import { CommercialHub } from "@/components/admin/CommercialHub";

export default function AdminCommercialPage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <CommercialHub />
    </Suspense>
  );
}
