import type { UserRole } from "@/lib/settings";

export type HiringPieceStatus =
  | "manquant"
  | "present"
  | "expire"
  | "alerte"
  | "optionnel_manquant";

export type HiringDossierStatus =
  | "incomplet"
  | "complet"
  | "valide"
  | "bloque";

export type HiringChecklistItemDef = {
  id: string;
  label: string;
  required: boolean;
  /** Jours de validité après réception ; null = pas d’expiration. */
  validityDays: number | null;
  /** Jours avant expiration pour alerte. */
  alertDaysBefore: number;
  active: boolean;
  sort: number;
};

export type HiringPiece = {
  itemId: string;
  present: boolean;
  receivedAt: string | null;
  expiresAt: string | null;
  note: string;
  fileRef: string;
};

export type HiringHistoryEntry = {
  id: string;
  at: string;
  kind: "created" | "piece" | "checklist" | "status" | "note";
  note: string;
  byEmail: string;
  byName: string;
  byRole: UserRole | string;
};

export const HIRING_DOSSIER_STATUS_LABELS: Record<HiringDossierStatus, string> =
  {
    incomplet: "Incomplet",
    complet: "Complet",
    valide: "Validé",
    bloque: "Bloqué",
  };

/** Checklist par défaut (alignée TMP-09). */
export const DEFAULT_HIRING_CHECKLIST: HiringChecklistItemDef[] = [
  {
    id: "cni",
    label: "Pièce d’identité en cours de validité",
    required: true,
    validityDays: 365,
    alertDaysBefore: 30,
    active: true,
    sort: 10,
  },
  {
    id: "cv",
    label: "CV actualisé",
    required: true,
    validityDays: null,
    alertDaysBefore: 0,
    active: true,
    sort: 20,
  },
  {
    id: "references",
    label: "Certificat de travail / références",
    required: true,
    validityDays: null,
    alertDaysBefore: 0,
    active: true,
    sort: 30,
  },
  {
    id: "photo",
    label: "Photo d’identité",
    required: true,
    validityDays: null,
    alertDaysBefore: 0,
    active: true,
    sort: 40,
  },
  {
    id: "rib",
    label: "RIB / informations bancaires",
    required: true,
    validityDays: null,
    alertDaysBefore: 0,
    active: true,
    sort: 50,
  },
  {
    id: "domicile",
    label: "Attestation de domicile",
    required: true,
    validityDays: 90,
    alertDaysBefore: 15,
    active: true,
    sort: 60,
  },
  {
    id: "medical",
    label: "Certificat médical d’aptitude",
    required: true,
    validityDays: 365,
    alertDaysBefore: 30,
    active: true,
    sort: 70,
  },
  {
    id: "contrat",
    label: "Documents contractuels signés",
    required: true,
    validityDays: null,
    alertDaysBefore: 0,
    active: true,
    sort: 80,
  },
  {
    id: "casier",
    label: "Casier judiciaire (si requis)",
    required: false,
    validityDays: 90,
    alertDaysBefore: 15,
    active: true,
    sort: 90,
  },
  {
    id: "autorisation",
    label: "Autorisation de travail (si applicable)",
    required: false,
    validityDays: 365,
    alertDaysBefore: 45,
    active: true,
    sort: 100,
  },
];

export function canAccessHiringDossier(role: UserRole | string): boolean {
  return role === "admin" || role === "rh";
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function computePieceStatus(
  def: HiringChecklistItemDef,
  piece: HiringPiece | undefined,
  now = new Date(),
): HiringPieceStatus {
  const present = Boolean(piece?.present);
  if (!present) {
    return def.required ? "manquant" : "optionnel_manquant";
  }
  if (!piece?.expiresAt) return "present";
  const exp = new Date(piece.expiresAt);
  if (Number.isNaN(exp.getTime())) return "present";
  const today = startOfDay(now);
  const expDay = startOfDay(exp);
  if (expDay < today) return "expire";
  const alertMs = Math.max(0, def.alertDaysBefore) * 86_400_000;
  if (alertMs > 0 && expDay - today <= alertMs) return "alerte";
  return "present";
}

export function deriveExpiresAt(
  receivedAt: string | null,
  validityDays: number | null,
): string | null {
  if (!receivedAt || validityDays == null || validityDays <= 0) return null;
  const d = new Date(receivedAt);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + validityDays);
  return d.toISOString().slice(0, 10);
}

export type HiringPieceView = {
  def: HiringChecklistItemDef;
  piece: HiringPiece;
  status: HiringPieceStatus;
};

export function buildPieceViews(
  checklist: HiringChecklistItemDef[],
  pieces: HiringPiece[],
  now = new Date(),
): HiringPieceView[] {
  const byId = new Map(pieces.map((p) => [p.itemId, p]));
  return checklist
    .filter((c) => c.active)
    .sort((a, b) => a.sort - b.sort)
    .map((def) => {
      const piece = byId.get(def.id) || {
        itemId: def.id,
        present: false,
        receivedAt: null,
        expiresAt: null,
        note: "",
        fileRef: "",
      };
      return {
        def,
        piece,
        status: computePieceStatus(def, piece, now),
      };
    });
}

export function summarizeDossier(views: HiringPieceView[]): {
  missingCount: number;
  expiredCount: number;
  alertCount: number;
  presentCount: number;
  requiredTotal: number;
  suggestedStatus: HiringDossierStatus;
} {
  let missingCount = 0;
  let expiredCount = 0;
  let alertCount = 0;
  let presentCount = 0;
  let requiredTotal = 0;
  for (const v of views) {
    if (v.def.required) requiredTotal += 1;
    if (v.status === "manquant") missingCount += 1;
    if (v.status === "expire") expiredCount += 1;
    if (v.status === "alerte") alertCount += 1;
    if (v.status === "present" || v.status === "alerte") presentCount += 1;
  }
  let suggestedStatus: HiringDossierStatus = "incomplet";
  if (missingCount === 0 && expiredCount === 0) {
    suggestedStatus = "complet";
  }
  return {
    missingCount,
    expiredCount,
    alertCount,
    presentCount,
    requiredTotal,
    suggestedStatus,
  };
}

/** Libellés des pièces manquantes (obligatoires absentes). */
export function listMissingPieces(views: HiringPieceView[]): string[] {
  return views
    .filter((v) => v.status === "manquant")
    .map((v) => v.def.label);
}

/** Libellés des pièces expirées. */
export function listExpiredPieces(views: HiringPieceView[]): string[] {
  return views
    .filter((v) => v.status === "expire")
    .map((v) => v.def.label);
}

/** Pièces en alerte d’expiration prochaine. */
export function listAlertPieces(views: HiringPieceView[]): string[] {
  return views
    .filter((v) => v.status === "alerte")
    .map((v) => v.def.label);
}

/**
 * Recette RH-03 : pièces manquantes et expirées clairement identifiées.
 * Un dossier prêt pour intégration n’a ni manquant ni expiré.
 */
export function hiringReadinessRequirements(views: HiringPieceView[]): {
  ok: boolean;
  missing: string[];
  expired: string[];
  alerts: string[];
  blocking: string[];
} {
  const missing = listMissingPieces(views);
  const expired = listExpiredPieces(views);
  const alerts = listAlertPieces(views);
  const blocking = [
    ...missing.map((l) => `manquant : ${l}`),
    ...expired.map((l) => `expiré : ${l}`),
  ];
  return {
    ok: blocking.length === 0,
    missing,
    expired,
    alerts,
    blocking,
  };
}

/** Prêt pour validation / intégration (Must). */
export function isDossierReadyForOnboarding(views: HiringPieceView[]): boolean {
  return hiringReadinessRequirements(views).ok;
}

export const PIECE_STATUS_LABELS: Record<HiringPieceStatus, string> = {
  manquant: "Manquant",
  present: "OK",
  expire: "Expiré",
  alerte: "Expire bientôt",
  optionnel_manquant: "Optionnel",
};
