import { Suspense } from "react";
import { LogisticsHub } from "@/components/admin/LogisticsHub";

export default function AdminLogistiquePage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <LogisticsHub />
    </Suspense>
  );
}
