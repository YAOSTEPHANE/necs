import { Suspense } from "react";
import { AchatHub } from "@/components/admin/AchatHub";

export default function AdminAchatPage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <AchatHub />
    </Suspense>
  );
}
