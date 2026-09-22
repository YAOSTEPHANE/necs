import type { UserRole } from "@/lib/settings";

export type WorkOrderStatus =
  | "planifie"
  | "en_cours"
  | "termine"
  | "anomalie"
  | "cloture";

export type ProofKind =
  | "photo_avant"
  | "photo_apres"
  | "photo_zone"
  | "autre";

export type RequiredProofRule = {
  kind: ProofKind;
  label: string;
  required: boolean;
  minCount: number;
};

export type WorkOrderProof = {
  id: string;
  kind: ProofKind;
  url: string;
  caption: string;
  at: string;
  by: string;
  byName: string;
};

export type WorkOrderChecklistItem = {
  id: string;
  label: string;
  required: boolean;
  done: boolean;
  doneAt: string | null;
  doneBy: string;
  doneByName: string;
};

export type WorkOrderAgent = {
  userId: string;
  name: string;
  email: string;
};

export type WorkOrder = {
  id: string;
  ref: string;
  planningSlotId: string;
  clientId: string;
  contractId: string;
  siteId: string;
  prestationId: string;
  clientName: string;
  siteName: string;
  siteAddress: string;
  prestationLabel: string;
  date: string;
  startTime: string;
  endTime: string;
  status: WorkOrderStatus;
  consignes: string;
  materiel: string;
  requiredProofs: RequiredProofRule[];
  proofs: WorkOrderProof[];
  checklist: WorkOrderChecklistItem[];
  agents: WorkOrderAgent[];
  supervisorId: string;
  supervisorName: string;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  closedBy: string;
  closedByName: string;
  anomalyNote: string;
  history: Array<{
    id: string;
    at: string;
    by: string;
    byName: string;
    detail: string;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  anomalie: "Anomalie",
  cloture: "Clôturé",
};

export const PROOF_KIND_LABELS: Record<ProofKind, string> = {
  photo_avant: "Photo avant",
  photo_apres: "Photo après",
  photo_zone: "Photo zone",
  autre: "Autre preuve",
};

export const WORK_ORDER_STATUSES = Object.keys(
  WORK_ORDER_STATUS_LABELS,
) as WorkOrderStatus[];

export function canAccessWorkOrders(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "ops" ||
    role === "manager" ||
    role === "nettoyeur" ||
    role === "qualite"
  );
}

/** Superviseur : créer, clôturer, anomalie. */
export function canSuperviseWorkOrders(role: UserRole): boolean {
  return role === "admin" || role === "ops" || role === "manager";
}

export function canExecuteWorkOrders(role: UserRole): boolean {
  return canAccessWorkOrders(role);
}

export function isWorkOrderStatus(v: unknown): v is WorkOrderStatus {
  return (
    typeof v === "string" &&
    WORK_ORDER_STATUSES.includes(v as WorkOrderStatus)
  );
}

export function isProofKind(v: unknown): v is ProofKind {
  return (
    typeof v === "string" &&
    (v === "photo_avant" ||
      v === "photo_apres" ||
      v === "photo_zone" ||
      v === "autre")
  );
}

export function defaultRequiredProofs(): RequiredProofRule[] {
  return [
    {
      kind: "photo_avant",
      label: "Photo avant intervention",
      required: true,
      minCount: 1,
    },
    {
      kind: "photo_apres",
      label: "Photo après intervention",
      required: true,
      minCount: 1,
    },
  ];
}

export function defaultChecklist(prestationLabel: string): WorkOrderChecklistItem[] {
  return [
    {
      id: "CK-zones",
      label: `Zones de « ${prestationLabel} » traitées`,
      required: true,
      done: false,
      doneAt: null,
      doneBy: "",
      doneByName: "",
    },
    {
      id: "CK-consignes",
      label: "Consignes site respectées",
      required: true,
      done: false,
      doneAt: null,
      doneBy: "",
      doneByName: "",
    },
    {
      id: "CK-materiel",
      label: "Matériel rangé / sécurisé",
      required: false,
      done: false,
      doneAt: null,
      doneBy: "",
      doneByName: "",
    },
  ];
}

export function proofCoverage(order: WorkOrder): {
  ok: boolean;
  missing: string[];
  byKind: Record<string, number>;
} {
  const byKind: Record<string, number> = {};
  for (const p of order.proofs) {
    byKind[p.kind] = (byKind[p.kind] || 0) + 1;
  }
  const missing: string[] = [];
  for (const rule of order.requiredProofs) {
    if (!rule.required) continue;
    const count = byKind[rule.kind] || 0;
    if (count < rule.minCount) {
      missing.push(
        `${rule.label} (${count}/${rule.minCount})`,
      );
    }
  }
  for (const item of order.checklist) {
    if (item.required && !item.done) {
      missing.push(`Checklist : ${item.label}`);
    }
  }
  return { ok: missing.length === 0, missing, byKind };
}

/** Recette : chaîne traçable création → clôture. */
export function isTraceableToClosure(order: WorkOrder): {
  ok: boolean;
  steps: Array<{ key: string; ok: boolean; detail: string }>;
} {
  const steps = [
    {
      key: "created",
      ok: Boolean(order.createdAt && order.history.length > 0),
      detail: `Créé ${order.createdAt ? "oui" : "non"} · ${order.history.length} événement(s)`,
    },
    {
      key: "started",
      ok:
        order.status === "planifie" ||
        Boolean(order.startedAt) ||
        Boolean(order.anomalyNote),
      detail: order.startedAt
        ? `Démarré ${order.startedAt}`
        : order.anomalyNote
          ? "Anomalie (démarrage optionnel)"
          : "Pas encore démarré",
    },
    {
      key: "proofs",
      ok:
        order.status === "planifie" ||
        order.status === "en_cours" ||
        Boolean(order.anomalyNote) ||
        proofCoverage(order).ok,
      detail: proofCoverage(order).ok
        ? "Preuves complètes"
        : order.anomalyNote
          ? `Anomalie · ${order.anomalyNote.slice(0, 80)}`
          : `Manque : ${proofCoverage(order).missing.join(", ") || "—"}`,
    },
    {
      key: "closed",
      ok:
        order.status !== "cloture" ||
        Boolean(order.closedAt && order.closedBy),
      detail:
        order.status === "cloture"
          ? `Clôturé par ${order.closedByName || order.closedBy} · ${order.closedAt}`
          : `Statut ${WORK_ORDER_STATUS_LABELS[order.status]}`,
    },
  ];
  return { ok: steps.every((s) => s.ok), steps };
}
