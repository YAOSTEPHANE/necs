import { Suspense } from "react";
import { DirectionHub } from "@/components/admin/DirectionHub";

export default function AdminDirectionPage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <DirectionHub />
    </Suspense>
  );
}
