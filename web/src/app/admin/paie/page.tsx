import { Suspense } from "react";
import { PayrollWorkspace } from "@/components/admin/PayrollWorkspace";

export default function AdminPaiePage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <PayrollWorkspace />
    </Suspense>
  );
}
