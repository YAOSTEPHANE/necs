import { notFound } from "next/navigation";
import { DocumentWorkspace } from "@/components/admin/DocumentWorkspace";
import { DOCUMENTS, getDocumentBySlug } from "@/lib/documents-catalog";

export function generateStaticParams() {
  return DOCUMENTS.map((d) => ({ id: d.slug }));
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = getDocumentBySlug(id);
  if (!doc) notFound();
  return <DocumentWorkspace doc={doc} />;
}
