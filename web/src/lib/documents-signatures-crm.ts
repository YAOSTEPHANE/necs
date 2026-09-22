import { createHash, randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  allSlotsSigned,
  canManageDocSignatures,
  canValidateAsDirection,
  getCurrentVersion,
  hasSlotSigned,
  isDocSigKind,
  isDocSigSlot,
  type ContractDocument,
  type ContractDocumentInput,
  type ContractDocumentMetaInput,
  type DocSigAttachment,
  type DocSigHistoryEntry,
  type DocSigKind,
  type DocSigRoleSlot,
  type DocSigSignMethod,
  type DocSigSignature,
  type DocSigStatus,
  type DocSigVersion,
} from "@/lib/documents-signatures-shared";

const COLLECTION = "contract_documents";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEmail(value: unknown): string {
  return clean(value, 180).toLowerCase();
}

function historyEntry(
  kind: DocSigHistoryEntry["kind"],
  actor: Actor,
  detail: string,
): DocSigHistoryEntry {
  return {
    id: `DH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    kind,
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

export function computeContentHash(parts: {
  id: string;
  version: number;
  title: string;
  body: string;
}): string {
  return createHash("sha256")
    .update(
      `${parts.id}|v${parts.version}|${parts.title}|${parts.body}`,
      "utf8",
    )
    .digest("hex");
}

export function computeSignatureToken(parts: {
  contentHash: string;
  email: string;
  signedAt: string;
  method: DocSigSignMethod;
  roleSlot: DocSigRoleSlot;
}): string {
  return createHash("sha256")
    .update(
      `${parts.contentHash}|${parts.email}|${parts.signedAt}|${parts.method}|${parts.roleSlot}`,
      "utf8",
    )
    .digest("hex");
}

export function computeArchiveSeal(doc: ContractDocument): string {
  const payload = JSON.stringify({
    id: doc.id,
    version: doc.currentVersion,
    versions: doc.versions.map((v) => ({
      version: v.version,
      contentHash: v.contentHash,
    })),
    signatures: doc.signatures.map((s) => ({
      id: s.id,
      roleSlot: s.roleSlot,
      version: s.version,
      contentHash: s.contentHash,
      signatureToken: s.signatureToken,
      signedAt: s.signedAt,
      method: s.method,
    })),
  });
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

async function col() {
  const db = await getDb();
  return db.collection<ContractDocument>(COLLECTION);
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

function defaultSlots(raw?: DocSigRoleSlot[]): DocSigRoleSlot[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const slots = raw.filter(isDocSigSlot);
    if (slots.length > 0) return [...new Set(slots)];
  }
  return ["employe", "direction"];
}

function buildVersion(
  docId: string,
  version: number,
  title: string,
  body: string,
  actor: Actor,
): DocSigVersion {
  const contentHash = computeContentHash({ id: docId, version, title, body });
  return {
    version,
    title,
    body,
    createdAt: nowIso(),
    createdBy: actor.userId,
    createdByName: actor.name,
    contentHash,
  };
}

function deriveStatusAfterSign(doc: ContractDocument): DocSigStatus {
  if (allSlotsSigned(doc)) return "signe";
  return "a_signer";
}

function canViewDocument(doc: ContractDocument, actor: Actor): boolean {
  if (canManageDocSignatures(actor.role) || canValidateAsDirection(actor.role)) {
    return true;
  }
  const email = actor.email.toLowerCase();
  return (
    doc.employeeEmail === email ||
    doc.employeeUserId === actor.userId ||
    doc.directionEmail === email
  );
}

function resolveSignSlot(
  doc: ContractDocument,
  actor: Actor,
  requested?: DocSigRoleSlot,
): DocSigRoleSlot | null {
  if (requested && isDocSigSlot(requested)) {
    if (requested === "rh" && canManageDocSignatures(actor.role)) return "rh";
    if (requested === "direction" && canValidateAsDirection(actor.role)) {
      return "direction";
    }
    if (
      requested === "employe" &&
      (doc.employeeEmail === actor.email.toLowerCase() ||
        doc.employeeUserId === actor.userId ||
        canManageDocSignatures(actor.role))
    ) {
      return "employe";
    }
  }

  if (
    doc.requiredSlots.includes("employe") &&
    !hasSlotSigned(doc, "employe") &&
    (doc.employeeEmail === actor.email.toLowerCase() ||
      doc.employeeUserId === actor.userId)
  ) {
    return "employe";
  }
  if (
    doc.requiredSlots.includes("direction") &&
    !hasSlotSigned(doc, "direction") &&
    canValidateAsDirection(actor.role)
  ) {
    return "direction";
  }
  if (
    doc.requiredSlots.includes("rh") &&
    !hasSlotSigned(doc, "rh") &&
    canManageDocSignatures(actor.role)
  ) {
    return "rh";
  }
  return null;
}

export async function listContractDocuments(
  actor: Actor,
): Promise<ContractDocument[]> {
  const c = await col();
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(400).toArray();
  return rows
    .map((row) => hydrateContractDocument(stripMongo(row) as ContractDocument))
    .filter((doc) => canViewDocument(doc, actor));
}

export async function getContractDocument(
  id: string,
  actor: Actor,
): Promise<ContractDocument | null> {
  const c = await col();
  const row = await c.findOne({ id });
  if (!row) return null;
  const doc = hydrateContractDocument(stripMongo(row) as ContractDocument);
  if (!canViewDocument(doc, actor)) return null;
  return doc;
}

export async function createContractDocument(
  input: ContractDocumentInput,
  actor: Actor,
): Promise<ContractDocument> {
  if (!canManageDocSignatures(actor.role)) {
    throw new Error("Seul RH / admin peut préparer un document.");
  }
  const title = clean(input.title, 200);
  const body = clean(input.body, 20000);
  if (!title || !body) {
    throw new Error("Titre et contenu obligatoires.");
  }

  const id = `DOC-${randomUUID().slice(0, 8).toUpperCase()}`;
  const kind: DocSigKind = isDocSigKind(input.kind) ? input.kind : "contrat";
  const version = buildVersion(id, 1, title, body, actor);
  const stamp = nowIso();

  const attachments = normalizeAttachments(input.attachments);
  const doc: ContractDocument = {
    id,
    kind,
    status: "brouillon",
    currentVersion: 1,
    versions: [version],
    requiredSlots: defaultSlots(input.requiredSlots),
    signatures: [],
    employeeName: clean(input.employeeName, 120),
    employeeEmail: cleanEmail(input.employeeEmail),
    employeeUserId: clean(input.employeeUserId, 80),
    directionName: clean(input.directionName, 120) || "Direction NECS",
    directionEmail: cleanEmail(input.directionEmail) || "direction@necs.cm",
    jobTitle: clean(input.jobTitle, 160) || "Agent d’entretien",
    assignmentSite: clean(input.assignmentSite, 200),
    assignmentZone: clean(input.assignmentZone, 120),
    conditions: clean(input.conditions, 4000),
    obligations: clean(input.obligations, 4000),
    confidentiality: clean(input.confidentiality, 4000),
    attachments,
    jobDescriptionId: clean(input.jobDescriptionId, 80),
    connectorProvider: clean(input.connectorProvider, 80),
    connectorExternalId: clean(input.connectorExternalId, 120),
    archiveSealedAt: null,
    archiveSealHash: "",
    note: clean(input.note, 2000),
    history: [
      historyEntry(
        "created",
        actor,
        `Document créé · ${kind} · ${version.contentHash.slice(0, 12)}…`,
      ),
    ],
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.userId,
    createdByName: actor.name,
  };

  const c = await col();
  await c.insertOne({ ...doc });
  return doc;
}

function normalizeAttachments(raw: unknown): DocSigAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx) => {
      const row = item as Partial<DocSigAttachment>;
      const label = clean(row.label, 160);
      if (!label) return null;
      return {
        id: clean(row.id, 40) || `ATT-${idx + 1}`,
        label,
        fileRef: clean(row.fileRef, 200),
        note: clean(row.note, 400),
      };
    })
    .filter((a): a is DocSigAttachment => Boolean(a))
    .slice(0, 20);
}

/** Enrichit un document legacy sans champs contrat agent. */
export function hydrateContractDocument(
  doc: ContractDocument,
): ContractDocument {
  return {
    ...doc,
    jobTitle: doc.jobTitle ?? "",
    assignmentSite: doc.assignmentSite ?? "",
    assignmentZone: doc.assignmentZone ?? "",
    conditions: doc.conditions ?? "",
    obligations: doc.obligations ?? "",
    confidentiality: doc.confidentiality ?? "",
    attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
    jobDescriptionId: doc.jobDescriptionId ?? "",
  };
}

export async function updateContractDocumentMeta(
  id: string,
  input: ContractDocumentMetaInput,
  actor: Actor,
): Promise<ContractDocument> {
  if (!canManageDocSignatures(actor.role)) {
    throw new Error("Seul RH / admin peut mettre à jour les informations contrat.");
  }
  const existing = await getContractDocument(id, actor);
  if (!existing) throw new Error("Document introuvable.");
  if (existing.status === "archive") {
    throw new Error("Document archivé : modification interdite.");
  }

  const next: ContractDocument = {
    ...existing,
    jobTitle:
      input.jobTitle !== undefined
        ? clean(input.jobTitle, 160)
        : existing.jobTitle,
    assignmentSite:
      input.assignmentSite !== undefined
        ? clean(input.assignmentSite, 200)
        : existing.assignmentSite,
    assignmentZone:
      input.assignmentZone !== undefined
        ? clean(input.assignmentZone, 120)
        : existing.assignmentZone,
    conditions:
      input.conditions !== undefined
        ? clean(input.conditions, 4000)
        : existing.conditions,
    obligations:
      input.obligations !== undefined
        ? clean(input.obligations, 4000)
        : existing.obligations,
    confidentiality:
      input.confidentiality !== undefined
        ? clean(input.confidentiality, 4000)
        : existing.confidentiality,
    attachments:
      input.attachments !== undefined
        ? normalizeAttachments(input.attachments)
        : existing.attachments,
    jobDescriptionId:
      input.jobDescriptionId !== undefined
        ? clean(input.jobDescriptionId, 80)
        : existing.jobDescriptionId,
    note: input.note !== undefined ? clean(input.note, 2000) : existing.note,
    employeeName:
      input.employeeName !== undefined
        ? clean(input.employeeName, 120)
        : existing.employeeName,
    employeeEmail:
      input.employeeEmail !== undefined
        ? cleanEmail(input.employeeEmail)
        : existing.employeeEmail,
    employeeUserId:
      input.employeeUserId !== undefined
        ? clean(input.employeeUserId, 80)
        : existing.employeeUserId,
    directionName:
      input.directionName !== undefined
        ? clean(input.directionName, 120)
        : existing.directionName,
    directionEmail:
      input.directionEmail !== undefined
        ? cleanEmail(input.directionEmail)
        : existing.directionEmail,
    updatedAt: nowIso(),
    history: [
      historyEntry("meta", actor, "Informations collaborateur / conditions mises à jour"),
      ...existing.history,
    ].slice(0, 80),
  };

  const c = await col();
  await c.replaceOne({ id }, next);
  return next;
}

export async function addDocumentVersion(
  id: string,
  input: { title?: string; body?: string; note?: string },
  actor: Actor,
): Promise<ContractDocument> {
  if (!canManageDocSignatures(actor.role)) {
    throw new Error("Seul RH / admin peut versionner.");
  }
  const existing = await getContractDocument(id, actor);
  if (!existing) throw new Error("Document introuvable.");
  if (existing.status === "archive") {
    throw new Error("Document archivé : versioning interdit.");
  }

  const current = getCurrentVersion(existing);
  const title = clean(input.title, 200) || current?.title || "";
  const body = clean(input.body, 20000) || current?.body || "";
  if (!title || !body) throw new Error("Titre et contenu obligatoires.");

  const nextNum = existing.currentVersion + 1;
  const version = buildVersion(id, nextNum, title, body, actor);
  const stamp = nowIso();

  const next: ContractDocument = {
    ...existing,
    status: "brouillon",
    currentVersion: nextNum,
    versions: [...existing.versions, version],
    /* Nouvelle version = nouvelles signatures requises sur cette version. */
    signatures: existing.signatures,
    note: clean(input.note, 2000) || existing.note,
    updatedAt: stamp,
    history: [
      historyEntry(
        "version",
        actor,
        `Nouvelle version v${nextNum} · hash ${version.contentHash.slice(0, 12)}…`,
      ),
      ...existing.history,
    ].slice(0, 80),
  };

  const c = await col();
  await c.replaceOne({ id }, next);
  return next;
}

export async function submitDocumentValidation(
  id: string,
  actor: Actor,
): Promise<ContractDocument> {
  if (!canManageDocSignatures(actor.role)) {
    throw new Error("Seul RH / admin peut soumettre à validation.");
  }
  const existing = await getContractDocument(id, actor);
  if (!existing) throw new Error("Document introuvable.");
  if (existing.status !== "brouillon" && existing.status !== "refuse") {
    throw new Error("Seuls les brouillons / refusés peuvent être soumis.");
  }

  const stamp = nowIso();
  const next: ContractDocument = {
    ...existing,
    status: "en_validation",
    updatedAt: stamp,
    history: [
      historyEntry(
        "submit_validation",
        actor,
        `Soumis à la direction · v${existing.currentVersion}`,
      ),
      ...existing.history,
    ].slice(0, 80),
  };
  const c = await col();
  await c.replaceOne({ id }, next);
  return next;
}

export async function validateDocument(
  id: string,
  actor: Actor,
  decision: "approve" | "refuse",
  note = "",
): Promise<ContractDocument> {
  if (!canValidateAsDirection(actor.role)) {
    throw new Error("Seule la direction (admin / manager) peut valider.");
  }
  const existing = await getContractDocument(id, actor);
  if (!existing) throw new Error("Document introuvable.");
  if (existing.status !== "en_validation") {
    throw new Error("Document non en attente de validation.");
  }

  const stamp = nowIso();
  const approved = decision === "approve";
  const next: ContractDocument = {
    ...existing,
    status: approved ? "a_signer" : "refuse",
    note: clean(note, 2000) || existing.note,
    updatedAt: stamp,
    history: [
      historyEntry(
        approved ? "validated" : "refused",
        actor,
        approved
          ? `Validé direction · prêt à signature · v${existing.currentVersion}`
          : `Refusé direction · ${clean(note, 200) || "sans motif"}`,
      ),
      ...existing.history,
    ].slice(0, 80),
  };
  const c = await col();
  await c.replaceOne({ id }, next);
  return next;
}

export async function signDocument(
  id: string,
  input: {
    roleSlot?: DocSigRoleSlot;
    method?: DocSigSignMethod;
    signerName?: string;
    connectorRef?: string;
    note?: string;
  },
  actor: Actor,
): Promise<ContractDocument> {
  const existing = await getContractDocument(id, actor);
  if (!existing) throw new Error("Document introuvable.");
  if (existing.status !== "a_signer") {
    throw new Error("Document non ouvert à la signature.");
  }

  const slot = resolveSignSlot(existing, actor, input.roleSlot);
  if (!slot) {
    throw new Error("Aucun emplacement de signature disponible pour vous.");
  }
  if (hasSlotSigned(existing, slot)) {
    throw new Error(`Emplacement ${slot} déjà signé sur v${existing.currentVersion}.`);
  }

  const current = getCurrentVersion(existing);
  if (!current) throw new Error("Version courante introuvable.");

  const method: DocSigSignMethod =
    input.method === "connecteur" ? "connecteur" : "electronique";
  if (method === "connecteur" && !clean(input.connectorRef, 120)) {
    throw new Error("Référence connecteur obligatoire.");
  }

  const signedAt = nowIso();
  const signerEmail = actor.email.toLowerCase();
  const signerName =
    clean(input.signerName, 120) || actor.name || signerEmail;
  const signatureToken = computeSignatureToken({
    contentHash: current.contentHash,
    email: signerEmail,
    signedAt,
    method,
    roleSlot: slot,
  });

  const signature: DocSigSignature = {
    id: `SIG-${randomUUID().slice(0, 8).toUpperCase()}`,
    roleSlot: slot,
    method,
    signerName,
    signerEmail,
    signedAt,
    version: existing.currentVersion,
    contentHash: current.contentHash,
    signatureToken,
    connectorRef: clean(input.connectorRef, 120),
    note: clean(input.note, 500),
  };

  const signatures = [...existing.signatures, signature];
  const draft: ContractDocument = {
    ...existing,
    signatures,
    updatedAt: signedAt,
  };
  draft.status = deriveStatusAfterSign(draft);

  const next: ContractDocument = {
    ...draft,
    history: [
      historyEntry(
        "signed",
        actor,
        `${slot} · ${method} · v${signature.version} · ${signature.signatureToken.slice(0, 12)}… · ${signedAt}`,
      ),
      ...existing.history,
    ].slice(0, 80),
  };

  const c = await col();
  await c.replaceOne({ id }, next);
  return next;
}

export async function setDocumentConnector(
  id: string,
  input: { provider?: string; externalId?: string },
  actor: Actor,
): Promise<ContractDocument> {
  if (!canManageDocSignatures(actor.role)) {
    throw new Error("Seul RH / admin peut lier un connecteur.");
  }
  const existing = await getContractDocument(id, actor);
  if (!existing) throw new Error("Document introuvable.");
  if (existing.status === "archive") {
    throw new Error("Document archivé.");
  }

  const stamp = nowIso();
  const next: ContractDocument = {
    ...existing,
    connectorProvider: clean(input.provider, 80) || existing.connectorProvider,
    connectorExternalId:
      clean(input.externalId, 120) || existing.connectorExternalId,
    updatedAt: stamp,
    history: [
      historyEntry(
        "connector",
        actor,
        `Connecteur ${clean(input.provider, 40) || existing.connectorProvider || "—"} · ${clean(input.externalId, 60) || existing.connectorExternalId || "—"}`,
      ),
      ...existing.history,
    ].slice(0, 80),
  };
  const c = await col();
  await c.replaceOne({ id }, next);
  return next;
}

export async function archiveDocument(
  id: string,
  actor: Actor,
): Promise<ContractDocument> {
  if (!canManageDocSignatures(actor.role)) {
    throw new Error("Seul RH / admin peut archiver.");
  }
  const existing = await getContractDocument(id, actor);
  if (!existing) throw new Error("Document introuvable.");
  if (existing.status !== "signe") {
    throw new Error("Archivage réservé aux documents entièrement signés.");
  }
  if (!allSlotsSigned(existing)) {
    throw new Error("Signatures incomplètes.");
  }

  const stamp = nowIso();
  const seal = computeArchiveSeal(existing);
  const next: ContractDocument = {
    ...existing,
    status: "archive",
    archiveSealedAt: stamp,
    archiveSealHash: seal,
    updatedAt: stamp,
    history: [
      historyEntry(
        "archived",
        actor,
        `Archivage sécurisé · sceau ${seal.slice(0, 16)}… · v${existing.currentVersion}`,
      ),
      ...existing.history,
    ].slice(0, 80),
  };
  const c = await col();
  await c.replaceOne({ id }, next);
  return next;
}

/** Recalcule le jeton attendu pour contrôle recette (signature/version/date). */
export function expectedSignatureToken(sig: DocSigSignature): string {
  return computeSignatureToken({
    contentHash: sig.contentHash,
    email: sig.signerEmail,
    signedAt: sig.signedAt,
    method: sig.method,
    roleSlot: sig.roleSlot,
  });
}
