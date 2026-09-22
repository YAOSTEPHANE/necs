import type { UserRole } from "@/lib/settings";

export type QualityPeriodicity = "quotidien" | "hebdo" | "mensuel";

export type QualityControlStatus =
  | "planifie"
  | "en_cours"
  | "conforme"
  | "non_conforme"
  | "cloture";

export type QualityChecklistItemDef = {
  id: string;
  label: string;
  weight: number;
  photoRequired: boolean;
};

export type QualityChecklistTemplate = {
  id: string;
  label: string;
  periodicity: QualityPeriodicity;
  passThreshold: number;
  items: QualityChecklistItemDef[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QualityItemResult = {
  itemId: string;
  label: string;
  weight: number;
  photoRequired: boolean;
  /** Note 0–100 */
  score: number | null;
  done: boolean;
  comment: string;
  photoUrl: string;
  photoAt: string | null;
};

export type QualityControl = {
  id: string;
  ref: string;
  siteId: string;
  siteName: string;
  prestationId: string;
  prestationLabel: string;
  templateId: string;
  templateLabel: string;
  periodicity: QualityPeriodicity;
  passThreshold: number;
  dueDate: string;
  status: QualityControlStatus;
  items: QualityItemResult[];
  score: number | null;
  passed: boolean | null;
  /** Observations générales du contrôle. */
  observations: string;
  ncNote: string;
  correctiveAction: string;
  correctiveDue: string;
  photos: Array<{ id: string; url: string; caption: string; at: string }>;
  history: Array<{
    id: string;
    at: string;
    by: string;
    byName: string;
    detail: string;
  }>;
  controllerId: string;
  controllerName: string;
  startedAt: string | null;
  completedAt: string | null;
  /** Validation superviseur / qualité. */
  validatedAt: string | null;
  validatedBy: string;
  validatedByName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
};

export const QUALITY_PERIODICITY_LABELS: Record<QualityPeriodicity, string> = {
  quotidien: "Quotidien",
  hebdo: "Hebdomadaire",
  mensuel: "Mensuel",
};

export const QUALITY_STATUS_LABELS: Record<QualityControlStatus, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  conforme: "Conforme",
  non_conforme: "Non conforme",
  cloture: "Clôturé",
};

export function canAccessQualityControls(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "qualite" ||
    role === "ops" ||
    role === "manager"
  );
}

export function canEditQualityControls(role: UserRole): boolean {
  return canAccessQualityControls(role);
}

export function isQualityPeriodicity(v: unknown): v is QualityPeriodicity {
  return (
    v === "quotidien" || v === "hebdo" || v === "mensuel"
  );
}

export function isQualityControlStatus(v: unknown): v is QualityControlStatus {
  return (
    v === "planifie" ||
    v === "en_cours" ||
    v === "conforme" ||
    v === "non_conforme" ||
    v === "cloture"
  );
}

export function defaultQualityTemplate(): Omit<
  QualityChecklistTemplate,
  "id" | "createdAt" | "updatedAt"
> {
  return {
    label: "Contrôle prestation standard",
    periodicity: "hebdo",
    passThreshold: 80,
    active: true,
    items: [
      {
        id: "QI-zones",
        label: "Zones critiques propres",
        weight: 30,
        photoRequired: true,
      },
      {
        id: "QI-sanitaires",
        label: "Sanitaires conformes",
        weight: 25,
        photoRequired: true,
      },
      {
        id: "QI-accueil",
        label: "Accueil / circulations",
        weight: 20,
        photoRequired: false,
      },
      {
        id: "QI-consignes",
        label: "Consignes site respectées",
        weight: 15,
        photoRequired: false,
      },
      {
        id: "QI-materiel",
        label: "Matériel / EPI en ordre",
        weight: 10,
        photoRequired: false,
      },
    ],
  };
}

/** Score pondéré 0–100 à partir des items notés. */
export function computeQualityScore(items: QualityItemResult[]): {
  score: number | null;
  complete: boolean;
  missingPhotos: string[];
} {
  const missingPhotos: string[] = [];
  let weightDone = 0;
  let weighted = 0;
  let allScored = true;

  for (const item of items) {
    if (item.score === null || item.score === undefined) {
      allScored = false;
      continue;
    }
    const w = Math.max(0, item.weight) || 1;
    const s = Math.min(100, Math.max(0, item.score));
    weighted += s * w;
    weightDone += w;
    if (item.photoRequired && !item.photoUrl) {
      missingPhotos.push(item.label);
    }
  }

  if (!allScored || weightDone <= 0) {
    return { score: null, complete: false, missingPhotos };
  }
  return {
    score: Math.round(weighted / weightDone),
    complete: missingPhotos.length === 0,
    missingPhotos,
  };
}

export function dueDateForPeriodicity(
  periodicity: QualityPeriodicity,
  from = new Date(),
): string {
  const d = new Date(from);
  if (periodicity === "quotidien") {
    /* same day */
  } else if (periodicity === "hebdo") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

export function qualityStats(controls: QualityControl[]) {
  const open = controls.filter(
    (c) => c.status === "planifie" || c.status === "en_cours",
  ).length;
  const conforme = controls.filter((c) => c.status === "conforme").length;
  const nc = controls.filter((c) => c.status === "non_conforme").length;
  const scored = controls.filter((c) => c.score !== null);
  const avg =
    scored.length === 0
      ? null
      : Math.round(
          scored.reduce((s, c) => s + (c.score || 0), 0) / scored.length,
        );
  return { total: controls.length, open, conforme, nc, avg };
}
