import type { UserRole } from "@/lib/settings";

/** Parcours Must : candidature → présélection → entretien → évaluation → décision. */
export type RecruitmentStatus =
  | "candidature"
  | "preselection"
  | "entretien"
  | "evaluation"
  | "decision";

export type RecruitmentDecision =
  | "en_attente"
  | "retenu"
  | "refuse"
  | "liste_attente";

export type RecruitmentHistoryKind =
  | "created"
  | "status"
  | "evaluation"
  | "decision"
  | "assignment"
  | "note";

export type RecruitmentHistoryEntry = {
  id: string;
  at: string;
  kind: RecruitmentHistoryKind;
  from?: RecruitmentStatus | null;
  to?: RecruitmentStatus | null;
  decision?: RecruitmentDecision | null;
  score?: number | null;
  note: string;
  byEmail: string;
  byName: string;
  byRole: UserRole | string;
};

export const RECRUITMENT_STATUSES: RecruitmentStatus[] = [
  "candidature",
  "preselection",
  "entretien",
  "evaluation",
  "decision",
];

export const RECRUITMENT_STATUS_LABELS: Record<RecruitmentStatus, string> = {
  candidature: "Candidature",
  preselection: "Présélection",
  entretien: "Entretien",
  evaluation: "Évaluation",
  decision: "Décision",
};

export const RECRUITMENT_DECISIONS: RecruitmentDecision[] = [
  "en_attente",
  "retenu",
  "refuse",
  "liste_attente",
];

export const RECRUITMENT_DECISION_LABELS: Record<RecruitmentDecision, string> =
  {
    en_attente: "En attente",
    retenu: "Retenu",
    refuse: "Refusé",
    liste_attente: "Liste d’attente",
  };

/** Critères d’évaluation entretien (TMP-10). */
export type RecruitmentCriterionDef = {
  id: string;
  label: string;
  maxScore: number;
};

export type RecruitmentCriterionScore = {
  criterionId: string;
  score: number;
  appreciation: string;
};

export const DEFAULT_RECRUITMENT_CRITERIA: RecruitmentCriterionDef[] = [
  { id: "presentation", label: "Présentation / attitude", maxScore: 20 },
  { id: "experience", label: "Expérience terrain", maxScore: 25 },
  { id: "disponibilite", label: "Disponibilité / horaires", maxScore: 20 },
  { id: "securite", label: "Sens sécurité / consignes", maxScore: 20 },
  { id: "motivation", label: "Motivation / fiabilité", maxScore: 15 },
];

export function computeCriteriaTotal(
  scores: RecruitmentCriterionScore[],
  defs: RecruitmentCriterionDef[] = DEFAULT_RECRUITMENT_CRITERIA,
): number {
  if (!scores.length) return 0;
  let total = 0;
  let max = 0;
  for (const def of defs) {
    max += def.maxScore;
    const row = scores.find((s) => s.criterionId === def.id);
    if (row) {
      total += Math.max(0, Math.min(def.maxScore, Math.round(row.score)));
    }
  }
  if (max <= 0) return 0;
  return Math.round((total / max) * 100);
}

const STATUS_ORDER: Record<RecruitmentStatus, number> = {
  candidature: 0,
  preselection: 1,
  entretien: 2,
  evaluation: 3,
  decision: 4,
};

export function isRecruitmentHr(role: UserRole | string): boolean {
  return role === "admin" || role === "rh";
}

export function isRecruitmentManager(role: UserRole | string): boolean {
  return role === "manager";
}

export function canAccessRecruitment(role: UserRole | string): boolean {
  return isRecruitmentHr(role) || isRecruitmentManager(role);
}

/**
 * Transitions autorisées — parcours séquentiel (±1).
 * RH : avance / recule d’une étape.
 * Manager : entretien ↔ évaluation → décision (statut), pas de décision finale.
 */
export function nextAllowedStatuses(
  current: RecruitmentStatus,
  role: UserRole | string,
): RecruitmentStatus[] {
  const idx = STATUS_ORDER[current];
  const forward = RECRUITMENT_STATUSES.filter(
    (s) => STATUS_ORDER[s] === idx + 1,
  );
  if (isRecruitmentHr(role)) {
    const back = RECRUITMENT_STATUSES.filter((s) => STATUS_ORDER[s] === idx - 1);
    return Array.from(new Set([...forward, ...back]));
  }
  if (isRecruitmentManager(role)) {
    if (current === "entretien") return ["evaluation"];
    if (current === "evaluation") return ["entretien", "decision"];
    return [];
  }
  return [];
}

export function canEvaluateRecruitment(status: RecruitmentStatus): boolean {
  return (
    status === "entretien" ||
    status === "evaluation" ||
    status === "decision"
  );
}

/** Snapshot minimal pour la recette parcours. */
export type RecruitmentJourneyDoc = {
  status: RecruitmentStatus;
  decision: RecruitmentDecision;
  score: number | null;
  history: RecruitmentHistoryEntry[];
};

/**
 * Recette RH-02 : parcours complet historisé.
 * Exige les 5 étapes dans l’historique + évaluation + décision finale.
 */
export function recruitmentJourneyRequirements(doc: RecruitmentJourneyDoc): {
  ok: boolean;
  missing: string[];
  statusesSeen: RecruitmentStatus[];
} {
  const missing: string[] = [];
  const statusesSeen = new Set<RecruitmentStatus>();

  for (const h of doc.history) {
    if (h.kind === "created" && h.to) {
      statusesSeen.add(h.to);
    }
    if (h.kind === "status") {
      if (h.from) statusesSeen.add(h.from);
      if (h.to) statusesSeen.add(h.to);
    }
    if (h.kind === "evaluation" && h.to) {
      statusesSeen.add(h.to);
    }
    if (h.kind === "decision" && h.to) {
      statusesSeen.add(h.to);
    }
  }

  // Création compte comme étape candidature
  if (doc.history.some((h) => h.kind === "created")) {
    statusesSeen.add("candidature");
  }

  for (const step of RECRUITMENT_STATUSES) {
    if (!statusesSeen.has(step)) {
      missing.push(`étape ${RECRUITMENT_STATUS_LABELS[step]}`);
    }
  }

  const hasEval = doc.history.some(
    (h) => h.kind === "evaluation" && h.score != null,
  );
  if (!hasEval && doc.score == null) {
    missing.push("évaluation (score)");
  } else if (!hasEval) {
    missing.push("historique évaluation");
  }

  const hasDecision = doc.history.some(
    (h) =>
      h.kind === "decision" &&
      h.decision != null &&
      h.decision !== "en_attente",
  );
  if (!hasDecision) {
    missing.push("décision finale historisée");
  }
  if (doc.decision === "en_attente") {
    missing.push("décision prise");
  }
  if (doc.status !== "decision") {
    missing.push("statut décision");
  }

  return {
    ok: missing.length === 0,
    missing,
    statusesSeen: RECRUITMENT_STATUSES.filter((s) => statusesSeen.has(s)),
  };
}
