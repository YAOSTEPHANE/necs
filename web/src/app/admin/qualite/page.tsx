import { Suspense } from "react";
import { QualiteHub } from "@/components/admin/QualiteHub";

export default function AdminQualitePage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <QualiteHub />
    </Suspense>
  );
}
