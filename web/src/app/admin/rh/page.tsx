import { Suspense } from "react";
import { RhHub } from "@/components/admin/RhHub";

export default function AdminRhPage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <RhHub />
    </Suspense>
  );
}
