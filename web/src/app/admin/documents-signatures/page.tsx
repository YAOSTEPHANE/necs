import { Suspense } from "react";
import { DocumentsSignaturesWorkspace } from "@/components/admin/DocumentsSignaturesWorkspace";

/** Page dédiée (agents + accès direct) — aussi embarquée dans RhHub. */
export default function AdminDocumentsSignaturesPage() {
  return (
    <Suspense fallback={<div className="leads-page">Chargement…</div>}>
      <DocumentsSignaturesWorkspace />
    </Suspense>
  );
}
