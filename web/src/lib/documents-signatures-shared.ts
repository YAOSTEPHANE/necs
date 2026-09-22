import type { UserRole } from "@/lib/settings";

export type DocSigStatus =
  | "brouillon"
  | "en_validation"
  | "a_signer"
  | "signe"
  | "archive"
  | "refuse";

export type DocSigKind =
  | "contrat"
  | "avenant"
  | "engagement"
  | "ndas"
  | "autre";

export type DocSigSignMethod = "electronique" | "connecteur";

export type DocSigRoleSlot = "employe" | "direction" | "rh";

export type DocSigVersion = {
  version: number;
  title: string;
  body: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  /** Empreinte SHA-256 du contenu (id|version|title|body). */
  contentHash: string;
};

export type DocSigSignature = {
  id: string;
  roleSlot: DocSigRoleSlot;
  method: DocSigSignMethod;
  signerName: string;
  signerEmail: string;
  signedAt: string;
  /** Version signée. */
  version: number;
  /** Empreinte du contenu au moment de la signature. */
  contentHash: string;
  /**
   * Jeton vérifiable : SHA-256(contentHash|email|signedAt|method|roleSlot).
   * Permet de contrôler signature / version / date.
   */
  signatureToken: string;
  /** Réf. connecteur externe (DocuSign, Yousign…). */
  connectorRef: string;
  note: string;
};

export type DocSigHistoryEntry = {
  id: string;
  at: string;
  kind:
    | "created"
    | "version"
    | "submit_validation"
    | "validated"
    | "refused"
    | "signed"
    | "archived"
    | "connector"
    | "note"
    | "meta";
  by: string;
  byName: string;
  detail: string;
};

/** Pièce associée au contrat agent (réf. dossier / fichier). */
export type DocSigAttachment = {
  id: string;
  label: string;
  fileRef: string;
  note: string;
};

export type ContractDocument = {
  id: string;
  kind: DocSigKind;
  status: DocSigStatus;
  /** Version courante (pointeur). */
  currentVersion: number;
  versions: DocSigVersion[];
  /** Signatures requises (ordre métier). */
  requiredSlots: DocSigRoleSlot[];
  signatures: DocSigSignature[];
  employeeName: string;
  employeeEmail: string;
  employeeUserId: string;
  directionName: string;
  directionEmail: string;
  /** Poste / intitulé (contrat agent). */
  jobTitle: string;
  /** Affectation site / zone. */
  assignmentSite: string;
  assignmentZone: string;
  /** Conditions applicables. */
  conditions: string;
  /** Obligations contractuelles. */
  obligations: string;
  /** Clause / engagement de confidentialité. */
  confidentiality: string;
  /** Pièces associées (dossier, CNI, etc.). */
  attachments: DocSigAttachment[];
  /** Lien optionnel vers fiche de poste. */
  jobDescriptionId: string;
  connectorProvider: string;
  connectorExternalId: string;
  archiveSealedAt: string | null;
  /** Empreinte d’archivage (contenu + signatures). */
  archiveSealHash: string;
  note: string;
  history: DocSigHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
};

export type ContractDocumentInput = {
  kind?: DocSigKind;
  title: string;
  body: string;
  employeeName?: string;
  employeeEmail?: string;
  employeeUserId?: string;
  directionName?: string;
  directionEmail?: string;
  requiredSlots?: DocSigRoleSlot[];
  note?: string;
  connectorProvider?: string;
  connectorExternalId?: string;
  jobTitle?: string;
  assignmentSite?: string;
  assignmentZone?: string;
  conditions?: string;
  obligations?: string;
  confidentiality?: string;
  attachments?: DocSigAttachment[];
  jobDescriptionId?: string;
};

export type ContractDocumentMetaInput = {
  jobTitle?: string;
  assignmentSite?: string;
  assignmentZone?: string;
  conditions?: string;
  obligations?: string;
  confidentiality?: string;
  attachments?: DocSigAttachment[];
  jobDescriptionId?: string;
  note?: string;
  employeeName?: string;
  employeeEmail?: string;
  employeeUserId?: string;
  directionName?: string;
  directionEmail?: string;
};

export const DOC_SIG_STATUS_LABELS: Record<DocSigStatus, string> = {
  brouillon: "Brouillon",
  en_validation: "En validation",
  a_signer: "À signer",
  signe: "Signé",
  archive: "Archivé",
  refuse: "Refusé",
};

export const DOC_SIG_KIND_LABELS: Record<DocSigKind, string> = {
  contrat: "Contrat",
  avenant: "Avenant",
  engagement: "Engagement",
  ndas: "NDA / Confidentialité",
  autre: "Autre",
};

export const DOC_SIG_SLOT_LABELS: Record<DocSigRoleSlot, string> = {
  employe: "Employé",
  direction: "Direction",
  rh: "RH",
};

export const DOC_SIG_METHOD_LABELS: Record<DocSigSignMethod, string> = {
  electronique: "Signature électronique",
  connecteur: "Connecteur externe",
};

export const DOC_SIG_STATUSES = Object.keys(
  DOC_SIG_STATUS_LABELS,
) as DocSigStatus[];
export const DOC_SIG_KINDS = Object.keys(DOC_SIG_KIND_LABELS) as DocSigKind[];
export const DOC_SIG_SLOTS = Object.keys(DOC_SIG_SLOT_LABELS) as DocSigRoleSlot[];

export function canManageDocSignatures(role: UserRole): boolean {
  return role === "admin" || role === "rh";
}

/** Direction : validation + signature direction (admin ou manager). */
export function canValidateAsDirection(role: UserRole): boolean {
  return role === "admin" || role === "manager";
}

export function canAccessDocSignatures(role: UserRole): boolean {
  return (
    canManageDocSignatures(role) ||
    canValidateAsDirection(role) ||
    role === "nettoyeur"
  );
}

export function isDocSigStatus(value: unknown): value is DocSigStatus {
  return typeof value === "string" && DOC_SIG_STATUSES.includes(value as DocSigStatus);
}

export function isDocSigKind(value: unknown): value is DocSigKind {
  return typeof value === "string" && DOC_SIG_KINDS.includes(value as DocSigKind);
}

export function isDocSigSlot(value: unknown): value is DocSigRoleSlot {
  return typeof value === "string" && DOC_SIG_SLOTS.includes(value as DocSigRoleSlot);
}

export function getCurrentVersion(
  doc: ContractDocument,
): DocSigVersion | null {
  return (
    doc.versions.find((v) => v.version === doc.currentVersion) ??
    doc.versions[doc.versions.length - 1] ??
    null
  );
}

export function hasSlotSigned(
  doc: ContractDocument,
  slot: DocSigRoleSlot,
  version?: number,
): boolean {
  const v = version ?? doc.currentVersion;
  return doc.signatures.some((s) => s.roleSlot === slot && s.version === v);
}

export function missingSlots(doc: ContractDocument): DocSigRoleSlot[] {
  return doc.requiredSlots.filter((slot) => !hasSlotSigned(doc, slot));
}

export function allSlotsSigned(doc: ContractDocument): boolean {
  return missingSlots(doc).length === 0 && doc.requiredSlots.length > 0;
}

/** Vérifie qu’une signature correspond bien au contenu / version / date. */
export function verifySignatureIntegrity(
  doc: ContractDocument,
  signature: DocSigSignature,
  expectedToken: string,
): { ok: boolean; reason: string } {
  const version = doc.versions.find((v) => v.version === signature.version);
  if (!version) {
    return { ok: false, reason: "Version introuvable." };
  }
  if (version.contentHash !== signature.contentHash) {
    return { ok: false, reason: "Empreinte contenu ≠ version." };
  }
  if (signature.signatureToken !== expectedToken) {
    return { ok: false, reason: "Jeton de signature invalide." };
  }
  if (!signature.signedAt || Number.isNaN(Date.parse(signature.signedAt))) {
    return { ok: false, reason: "Date de signature invalide." };
  }
  return { ok: true, reason: "Signature / version / date vérifiables." };
}

/**
 * Contrôle structurel (sans recalcul crypto) : signature / version / date
 * présents et cohérents — critère de recette RH-04.
 */
export function verifySignatureProof(
  doc: ContractDocument,
  signature: DocSigSignature,
): { ok: boolean; reason: string } {
  const version = doc.versions.find((v) => v.version === signature.version);
  if (!version) {
    return { ok: false, reason: "Version introuvable." };
  }
  if (!version.contentHash || version.contentHash.length < 16) {
    return { ok: false, reason: "Empreinte de version manquante." };
  }
  if (version.contentHash !== signature.contentHash) {
    return { ok: false, reason: "Empreinte contenu ≠ version." };
  }
  if (!signature.signatureToken || signature.signatureToken.length < 32) {
    return { ok: false, reason: "Jeton de signature manquant." };
  }
  if (!signature.signedAt || Number.isNaN(Date.parse(signature.signedAt))) {
    return { ok: false, reason: "Date de signature invalide." };
  }
  if (signature.version < 1) {
    return { ok: false, reason: "Numéro de version invalide." };
  }
  return { ok: true, reason: "Signature / version / date vérifiables." };
}

/** Snapshot minimal pour la recette Documents & signatures. */
export type DocSigRecipeDoc = Pick<
  ContractDocument,
  | "status"
  | "currentVersion"
  | "versions"
  | "requiredSlots"
  | "signatures"
  | "archiveSealedAt"
  | "archiveSealHash"
>;

/**
 * Recette RH-04 : signature / version / date vérifiables (+ sceau si archivé).
 */
export function docSigRecipeRequirements(doc: DocSigRecipeDoc): {
  ok: boolean;
  missing: string[];
  proofs: { signatureId: string; ok: boolean; reason: string }[];
} {
  const missing: string[] = [];
  const proofs: { signatureId: string; ok: boolean; reason: string }[] = [];

  if (!doc.versions.length || doc.currentVersion < 1) {
    missing.push("versionnement");
  }
  const current = getCurrentVersion(doc as ContractDocument);
  if (!current?.contentHash) {
    missing.push("empreinte version courante");
  }

  for (const slot of doc.requiredSlots) {
    if (!hasSlotSigned(doc as ContractDocument, slot)) {
      missing.push(`signature ${DOC_SIG_SLOT_LABELS[slot]}`);
    }
  }

  for (const sig of doc.signatures) {
    const check = verifySignatureProof(doc as ContractDocument, sig);
    proofs.push({
      signatureId: sig.id,
      ok: check.ok,
      reason: check.reason,
    });
    if (!check.ok) {
      missing.push(`preuve ${sig.id} (${check.reason})`);
    }
  }

  if (doc.status === "archive" || doc.status === "signe") {
    if (doc.status === "archive") {
      if (!doc.archiveSealedAt || Number.isNaN(Date.parse(doc.archiveSealedAt))) {
        missing.push("date d’archivage");
      }
      if (!doc.archiveSealHash || doc.archiveSealHash.length < 32) {
        missing.push("sceau d’archivage");
      }
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    proofs,
  };
}

export function formatDocVersionLabel(doc: ContractDocument): string {
  return `v${doc.currentVersion}`;
}
