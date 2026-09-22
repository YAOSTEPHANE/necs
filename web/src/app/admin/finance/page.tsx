import { Suspense } from "react";
import { FinanceHub } from "@/components/admin/FinanceHub";

export default function AdminFinancePage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <FinanceHub />
    </Suspense>
  );
}
