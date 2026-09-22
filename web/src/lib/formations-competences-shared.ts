import type { UserRole } from "@/lib/settings";

/** Catégories de compétences / formations. */
export type SkillCategory =
  | "securite"
  | "metier"
  | "qualite"
  | "relation"
  | "management";

/** Niveau acquis / requis (1 = sensibilisation … 5 = expert). */
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

/** Statut calculé d’une compétence pour un collaborateur. */
export type SkillGapStatus =
  | "ok"
  | "manquant"
  | "insuffisant"
  | "alerte"
  | "expire";

export type SkillDef = {
  id: string;
  label: string;
  category: SkillCategory;
  /** Niveau minimum typique pour un agent. */
  defaultMinLevel: SkillLevel;
  /** Mois de validité après certification ; null = pas de renouvellement. */
  renewalMonths: number | null;
  /** Jours avant échéance pour alerte de renouvellement. */
  alertDaysBefore: number;
  active: boolean;
  sort: number;
};

export type PosteRequiredSkill = {
  skillId: string;
  minLevel: SkillLevel;
};

export type PosteProfile = {
  id: string;
  label: string;
  requiredSkills: PosteRequiredSkill[];
  active: boolean;
};

/** Compétence acquise / suivie pour un collaborateur. */
export type AcquiredSkill = {
  skillId: string;
  level: SkillLevel;
  certifiedAt: string | null;
  expiresAt: string | null;
  trainingTitle: string;
  note: string;
};

export type SkillHistoryEntry = {
  id: string;
  at: string;
  kind: "created" | "skill" | "renewal" | "note" | "poste";
  note: string;
  byEmail: string;
  byName: string;
  byRole: UserRole | string;
};

export type CollaboratorSkills = {
  id: string;
  employeeName: string;
  email: string;
  phone: string;
  posteId: string;
  site: string;
  managerName: string;
  rhOwner: string;
  skills: AcquiredSkill[];
  comments: string;
  history: SkillHistoryEntry[];
  createdAt: number;
  updatedAt: number;
};

export type CollaboratorSkillsInput = {
  employeeName: string;
  email?: string;
  phone?: string;
  posteId: string;
  site?: string;
  managerName?: string;
  rhOwner?: string;
  comments?: string;
};

export type SkillGapView = {
  skillId: string;
  label: string;
  category: SkillCategory;
  requiredLevel: SkillLevel;
  currentLevel: SkillLevel | null;
  status: SkillGapStatus;
  expiresAt: string | null;
  daysToExpiry: number | null;
  trainingTitle: string;
};

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  securite: "Sécurité / HSE",
  metier: "Métier terrain",
  qualite: "Qualité",
  relation: "Relation client",
  management: "Management",
};

export const SKILL_GAP_STATUS_LABELS: Record<SkillGapStatus, string> = {
  ok: "À jour",
  manquant: "Manquante",
  insuffisant: "Niveau insuffisant",
  alerte: "Renouvellement proche",
  expire: "Expirée",
};

export const SKILL_CATEGORIES = Object.keys(
  SKILL_CATEGORY_LABELS,
) as SkillCategory[];

export const SKILL_LEVELS: SkillLevel[] = [1, 2, 3, 4, 5];

/** Catalogue compétences / formations (Must RH). */
export const DEFAULT_SKILL_CATALOG: SkillDef[] = [
  {
    id: "sec_hse",
    label: "Consignes sécurité / HSE",
    category: "securite",
    defaultMinLevel: 3,
    renewalMonths: 12,
    alertDaysBefore: 45,
    active: true,
    sort: 10,
  },
  {
    id: "sec_gestes",
    label: "Gestes & postures",
    category: "securite",
    defaultMinLevel: 2,
    renewalMonths: 24,
    alertDaysBefore: 60,
    active: true,
    sort: 20,
  },
  {
    id: "sec_chimiques",
    label: "Produits chimiques / fiches de données",
    category: "securite",
    defaultMinLevel: 3,
    renewalMonths: 12,
    alertDaysBefore: 45,
    active: true,
    sort: 30,
  },
  {
    id: "sec_secours",
    label: "Premiers secours / SST",
    category: "securite",
    defaultMinLevel: 2,
    renewalMonths: 24,
    alertDaysBefore: 90,
    active: true,
    sort: 40,
  },
  {
    id: "met_protocole",
    label: "Protocoles de nettoyage site",
    category: "metier",
    defaultMinLevel: 3,
    renewalMonths: 12,
    alertDaysBefore: 30,
    active: true,
    sort: 50,
  },
  {
    id: "met_materiel",
    label: "Utilisation matériel / machines",
    category: "metier",
    defaultMinLevel: 2,
    renewalMonths: 18,
    alertDaysBefore: 45,
    active: true,
    sort: 60,
  },
  {
    id: "qual_controles",
    label: "Contrôles qualité & non-conformités",
    category: "qualite",
    defaultMinLevel: 2,
    renewalMonths: 12,
    alertDaysBefore: 30,
    active: true,
    sort: 70,
  },
  {
    id: "rel_accueil",
    label: "Accueil & relation client",
    category: "relation",
    defaultMinLevel: 2,
    renewalMonths: null,
    alertDaysBefore: 0,
    active: true,
    sort: 80,
  },
  {
    id: "mgr_equipe",
    label: "Encadrement d’équipe",
    category: "management",
    defaultMinLevel: 3,
    renewalMonths: 24,
    alertDaysBefore: 60,
    active: true,
    sort: 90,
  },
];

/** Profils de poste → compétences requises (écarts identifiables). */
export const DEFAULT_POSTE_PROFILES: PosteProfile[] = [
  {
    id: "agent",
    label: "Agent terrain / Nettoyeur",
    active: true,
    requiredSkills: [
      { skillId: "sec_hse", minLevel: 3 },
      { skillId: "sec_gestes", minLevel: 2 },
      { skillId: "sec_chimiques", minLevel: 3 },
      { skillId: "met_protocole", minLevel: 3 },
      { skillId: "met_materiel", minLevel: 2 },
      { skillId: "rel_accueil", minLevel: 2 },
    ],
  },
  {
    id: "chef",
    label: "Chef d’équipe",
    active: true,
    requiredSkills: [
      { skillId: "sec_hse", minLevel: 4 },
      { skillId: "sec_gestes", minLevel: 3 },
      { skillId: "sec_chimiques", minLevel: 3 },
      { skillId: "sec_secours", minLevel: 2 },
      { skillId: "met_protocole", minLevel: 4 },
      { skillId: "qual_controles", minLevel: 3 },
      { skillId: "rel_accueil", minLevel: 3 },
      { skillId: "mgr_equipe", minLevel: 3 },
    ],
  },
  {
    id: "controleur",
    label: "Contrôleur qualité",
    active: true,
    requiredSkills: [
      { skillId: "sec_hse", minLevel: 3 },
      { skillId: "met_protocole", minLevel: 4 },
      { skillId: "qual_controles", minLevel: 4 },
      { skillId: "rel_accueil", minLevel: 3 },
    ],
  },
];

export function canAccessFormationsCompetences(role: UserRole): boolean {
  return role === "admin" || role === "rh" || role === "manager";
}

/** RH gère le catalogue et crée les fiches ; manager suit son équipe. */
export function canManageSkillCatalog(role: UserRole): boolean {
  return role === "admin" || role === "rh";
}

export function canEditCollaboratorSkills(role: UserRole): boolean {
  return role === "admin" || role === "rh" || role === "manager";
}

export function isSkillLevel(value: unknown): value is SkillLevel {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function isSkillCategory(value: unknown): value is SkillCategory {
  return (
    typeof value === "string" &&
    SKILL_CATEGORIES.includes(value as SkillCategory)
  );
}

export function daysUntil(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / (24 * 60 * 60 * 1000));
}

export function computeExpiryFromCertification(
  certifiedAt: string,
  renewalMonths: number | null,
): string | null {
  if (renewalMonths == null || renewalMonths <= 0) return null;
  const d = new Date(certifiedAt);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + renewalMonths);
  return d.toISOString();
}

/**
 * Statut d’une compétence requise vs acquise.
 * Priorité : manquant → expire → alerte → insuffisant → ok.
 */
export function computeSkillGapStatus(args: {
  required: PosteRequiredSkill;
  acquired: AcquiredSkill | null | undefined;
  def: SkillDef;
  now?: number;
}): SkillGapStatus {
  const now = args.now ?? Date.now();
  if (!args.acquired) return "manquant";

  const days = daysUntil(args.acquired.expiresAt, now);
  if (days != null && days < 0) return "expire";
  if (
    days != null &&
    args.def.alertDaysBefore > 0 &&
    days <= args.def.alertDaysBefore
  ) {
    return "alerte";
  }
  if (args.acquired.level < args.required.minLevel) return "insuffisant";
  return "ok";
}

export function buildGapViews(args: {
  catalog: SkillDef[];
  poste: PosteProfile | null;
  skills: AcquiredSkill[];
  now?: number;
}): SkillGapView[] {
  const now = args.now ?? Date.now();
  if (!args.poste) return [];
  const byId = new Map(args.skills.map((s) => [s.skillId, s]));
  const catalog = new Map(args.catalog.map((c) => [c.id, c]));

  return args.poste.requiredSkills
    .map((req) => {
      const def = catalog.get(req.skillId);
      if (!def || !def.active) return null;
      const acquired = byId.get(req.skillId) ?? null;
      const status = computeSkillGapStatus({
        required: req,
        acquired,
        def,
        now,
      });
      return {
        skillId: def.id,
        label: def.label,
        category: def.category,
        requiredLevel: req.minLevel,
        currentLevel: acquired?.level ?? null,
        status,
        expiresAt: acquired?.expiresAt ?? null,
        daysToExpiry: daysUntil(acquired?.expiresAt ?? null, now),
        trainingTitle: acquired?.trainingTitle ?? "",
      } satisfies SkillGapView;
    })
    .filter((v): v is SkillGapView => v != null)
    .sort((a, b) => {
      const order: Record<SkillGapStatus, number> = {
        expire: 0,
        manquant: 1,
        insuffisant: 2,
        alerte: 3,
        ok: 4,
      };
      return order[a.status] - order[b.status] || a.label.localeCompare(b.label);
    });
}

export function listIdentifiableGaps(views: SkillGapView[]): SkillGapView[] {
  return views.filter((v) => v.status !== "ok");
}

/** Alertes de renouvellement : alerte + expirées. */
export function listRenewalAlerts(views: SkillGapView[]): SkillGapView[] {
  return views.filter((v) => v.status === "alerte" || v.status === "expire");
}

export function summarizeGaps(views: SkillGapView[]): {
  totalRequired: number;
  okCount: number;
  gapCount: number;
  missingCount: number;
  insufficientCount: number;
  alertCount: number;
  expiredCount: number;
  coveragePct: number;
} {
  const totalRequired = views.length;
  let okCount = 0;
  let missingCount = 0;
  let insufficientCount = 0;
  let alertCount = 0;
  let expiredCount = 0;
  for (const v of views) {
    if (v.status === "ok") okCount += 1;
    if (v.status === "manquant") missingCount += 1;
    if (v.status === "insuffisant") insufficientCount += 1;
    if (v.status === "alerte") alertCount += 1;
    if (v.status === "expire") expiredCount += 1;
  }
  const gapCount = totalRequired - okCount;
  return {
    totalRequired,
    okCount,
    gapCount,
    missingCount,
    insufficientCount,
    alertCount,
    expiredCount,
    coveragePct:
      totalRequired === 0 ? 100 : Math.round((okCount / totalRequired) * 100),
  };
}

/**
 * Recette Must : écarts de compétences clairement identifiables.
 * OK si aucune compétence manquante / insuffisante / expirée
 * (les alertes de renouvellement restent visibles mais non bloquantes).
 */
export function skillGapsRecipe(views: SkillGapView[]): {
  ok: boolean;
  gaps: string[];
  renewals: string[];
  blocking: string[];
} {
  const gaps = listIdentifiableGaps(views)
    .filter((v) => v.status !== "alerte")
    .map((v) => {
      switch (v.status) {
        case "manquant":
          return `manquante : ${v.label} (niv. ≥ ${v.requiredLevel})`;
        case "insuffisant":
          return `insuffisante : ${v.label} (actuel ${v.currentLevel} < ${v.requiredLevel})`;
        case "expire":
          return `expirée : ${v.label}`;
        case "ok":
        case "alerte":
          return v.label;
        default: {
          const _exhaustive: never = v.status;
          return String(_exhaustive);
        }
      }
    });
  const renewals = listRenewalAlerts(views).map((v) => {
    if (v.status === "expire") return `expirée : ${v.label}`;
    const d = v.daysToExpiry;
    return d != null
      ? `renouvellement : ${v.label} (J-${Math.max(0, d)})`
      : `renouvellement : ${v.label}`;
  });
  return {
    ok: gaps.length === 0,
    gaps,
    renewals,
    blocking: gaps,
  };
}

export function findPoste(
  profiles: PosteProfile[],
  posteId: string,
): PosteProfile | null {
  return profiles.find((p) => p.id === posteId && p.active) ?? null;
}

export function findSkill(catalog: SkillDef[], skillId: string): SkillDef | null {
  return catalog.find((s) => s.id === skillId && s.active) ?? null;
}
