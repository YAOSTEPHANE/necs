import { Suspense } from "react";
import { OpsHub } from "@/components/admin/OpsHub";

export default function AdminOperationsPage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <OpsHub />
    </Suspense>
  );
}
