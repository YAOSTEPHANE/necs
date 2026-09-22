import type { UserRole } from "@/lib/settings";

export type OnboardingCategory =
  | "documents"
  | "acces"
  | "uniforme_epi"
  | "materiel"
  | "formation"
  | "affectation";

export type OnboardingStatus =
  | "en_cours"
  | "pret"
  | "valide"
  | "bloque";

export type OnboardingOwnerRole = "rh" | "manager" | "either";

export type OnboardingTaskDef = {
  id: string;
  label: string;
  category: OnboardingCategory;
  required: boolean;
  ownerRole: OnboardingOwnerRole;
  active: boolean;
  sort: number;
};

export type OnboardingTask = {
  taskId: string;
  done: boolean;
  doneAt: string | null;
  doneByEmail: string;
  doneByName: string;
  note: string;
};

export type OnboardingHistoryEntry = {
  id: string;
  at: string;
  kind: "created" | "task" | "status" | "note" | "validated";
  note: string;
  byEmail: string;
  byName: string;
  byRole: UserRole | string;
};

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  en_cours: "En cours",
  pret: "Prêt à valider",
  valide: "Fin validée",
  bloque: "Bloqué",
};

export const ONBOARDING_CATEGORY_LABELS: Record<OnboardingCategory, string> = {
  documents: "Documents",
  acces: "Accès",
  uniforme_epi: "Uniforme / EPI",
  materiel: "Matériel",
  formation: "Formation",
  affectation: "Affectation",
};

export const ONBOARDING_CATEGORIES = Object.keys(
  ONBOARDING_CATEGORY_LABELS,
) as OnboardingCategory[];

export const ONBOARDING_STATUSES = Object.keys(
  ONBOARDING_STATUS_LABELS,
) as OnboardingStatus[];

/**
 * Checklist d’intégration (RH-05 / OPS) :
 * documents, accès, uniforme/EPI, matériel, formation, affectation + validation.
 */
export const DEFAULT_ONBOARDING_CHECKLIST: OnboardingTaskDef[] = [
  {
    id: "dossier_rh",
    label: "Dossier RH complet et validé",
    category: "documents",
    required: true,
    ownerRole: "rh",
    active: true,
    sort: 10,
  },
  {
    id: "contrat_signe",
    label: "Contrat / documents signés",
    category: "documents",
    required: true,
    ownerRole: "rh",
    active: true,
    sort: 20,
  },
  {
    id: "acces_app",
    label: "Création accès application (pointage)",
    category: "acces",
    required: true,
    ownerRole: "rh",
    active: true,
    sort: 30,
  },
  {
    id: "acces_badge",
    label: "Badge / accès site client",
    category: "acces",
    required: true,
    ownerRole: "manager",
    active: true,
    sort: 35,
  },
  {
    id: "acces_locaux",
    label: "Remise clés / codes locaux",
    category: "acces",
    required: true,
    ownerRole: "manager",
    active: true,
    sort: 38,
  },
  {
    id: "uniforme_epi",
    label: "Remise uniforme / EPI",
    category: "uniforme_epi",
    required: true,
    ownerRole: "rh",
    active: true,
    sort: 40,
  },
  {
    id: "materiel_base",
    label: "Dotation matériel de base",
    category: "materiel",
    required: true,
    ownerRole: "rh",
    active: true,
    sort: 50,
  },
  {
    id: "formation_securite",
    label: "Formation consignes sécurité",
    category: "formation",
    required: true,
    ownerRole: "manager",
    active: true,
    sort: 60,
  },
  {
    id: "formation_site",
    label: "Formation consignes site client",
    category: "formation",
    required: true,
    ownerRole: "manager",
    active: true,
    sort: 70,
  },
  {
    id: "presentation_equipe",
    label: "Présentation équipe / superviseur",
    category: "formation",
    required: true,
    ownerRole: "manager",
    active: true,
    sort: 80,
  },
  {
    id: "affectation_planning",
    label: "Affectation planning confirmée",
    category: "affectation",
    required: true,
    ownerRole: "manager",
    active: true,
    sort: 90,
  },
  {
    id: "validation_fin",
    label: "Validation fin d’intégration",
    category: "affectation",
    required: true,
    ownerRole: "either",
    active: true,
    sort: 100,
  },
];

export function canAccessOnboarding(role: UserRole | string): boolean {
  return (
    role === "admin" ||
    role === "rh" ||
    role === "manager" ||
    role === "ops"
  );
}

export function canManageOnboardingChecklist(
  role: UserRole | string,
): boolean {
  return role === "admin" || role === "rh";
}

/** Qui peut cocher une tâche selon ownerRole. */
export function canToggleOnboardingTask(
  role: UserRole | string,
  ownerRole: OnboardingOwnerRole,
): boolean {
  if (role === "admin") return true;
  if (role === "ops") {
    return ownerRole === "manager" || ownerRole === "either";
  }
  if (ownerRole === "either") {
    return role === "rh" || role === "manager";
  }
  if (ownerRole === "rh") return role === "rh";
  if (ownerRole === "manager") return role === "manager" || role === "rh";
  return false;
}

export function canValidateOnboardingEnd(role: UserRole | string): boolean {
  return (
    role === "admin" ||
    role === "rh" ||
    role === "manager" ||
    role === "ops"
  );
}

export function isOnboardingStatus(value: unknown): value is OnboardingStatus {
  return (
    typeof value === "string" &&
    ONBOARDING_STATUSES.includes(value as OnboardingStatus)
  );
}

export function isOnboardingCategory(
  value: unknown,
): value is OnboardingCategory {
  return (
    typeof value === "string" &&
    ONBOARDING_CATEGORIES.includes(value as OnboardingCategory)
  );
}

export type OnboardingTaskView = {
  def: OnboardingTaskDef;
  task: OnboardingTask;
};

export function buildTaskViews(
  checklist: OnboardingTaskDef[],
  tasks: OnboardingTask[],
): OnboardingTaskView[] {
  const byId = new Map(tasks.map((t) => [t.taskId, t]));
  return checklist
    .filter((d) => d.active)
    .sort((a, b) => a.sort - b.sort)
    .map((def) => {
      const existing = byId.get(def.id);
      const task: OnboardingTask = existing ?? {
        taskId: def.id,
        done: false,
        doneAt: null,
        doneByEmail: "",
        doneByName: "",
        note: "",
      };
      return { def, task };
    });
}

export function summarizeOnboarding(views: OnboardingTaskView[]): {
  doneCount: number;
  requiredTotal: number;
  requiredDone: number;
  pendingRequired: string[];
  /** Tâches requises hors « validation fin » (gate avant validation). */
  pendingBeforeValidate: string[];
  suggestedStatus: OnboardingStatus;
} {
  const required = views.filter((v) => v.def.required);
  const pendingRequired = required
    .filter((v) => !v.task.done)
    .map((v) => v.def.label);
  const pendingBeforeValidate = required
    .filter((v) => v.def.id !== "validation_fin" && !v.task.done)
    .map((v) => v.def.label);
  const requiredDone = required.length - pendingRequired.length;
  const doneCount = views.filter((v) => v.task.done).length;
  return {
    doneCount,
    requiredTotal: required.length,
    requiredDone,
    pendingRequired,
    pendingBeforeValidate,
    suggestedStatus:
      pendingBeforeValidate.length === 0 ? "pret" : "en_cours",
  };
}

/**
 * Recette RH-05 : fin d’intégration validée.
 * Exige toutes les tâches obligatoires cochées + statut `valide` + date.
 */
export function onboardingEndRequirements(doc: {
  status: OnboardingStatus;
  validatedAt: string | null;
  views: OnboardingTaskView[];
}): {
  ok: boolean;
  missing: string[];
  pendingTasks: string[];
} {
  const missing: string[] = [];
  const summary = summarizeOnboarding(doc.views);
  const pendingTasks = summary.pendingRequired;

  for (const label of pendingTasks) {
    missing.push(`tâche : ${label}`);
  }

  if (doc.status !== "valide") {
    missing.push("statut fin d’intégration non validé");
  }
  if (!doc.validatedAt || Number.isNaN(Date.parse(doc.validatedAt))) {
    missing.push("date de validation de fin");
  }

  return {
    ok: missing.length === 0,
    missing,
    pendingTasks,
  };
}

/** Prêt à valider la fin (toutes tâches requises sauf la validation elle-même). */
export function isOnboardingReadyToValidate(
  views: OnboardingTaskView[],
): boolean {
  return summarizeOnboarding(views).pendingBeforeValidate.length === 0;
}
