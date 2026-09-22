import type { UserRole } from "@/lib/settings";

export type PrestationKind =
  | "bureaux"
  | "commerces"
  | "industriel"
  | "medical"
  | "residentiel"
  | "copropriete"
  | "evenementiel"
  | "autre";

export type ServiceLevel = "essentiel" | "standard" | "renforce" | "premium";

export type NeedFrequency =
  | "quotidienne"
  | "5j_semaine"
  | "3j_semaine"
  | "2j_semaine"
  | "hebdomadaire"
  | "bi_mensuelle"
  | "mensuelle"
  | "ponctuelle";

export type OpportunityStage =
  | "qualification"
  | "etude"
  | "proposition"
  | "negociation"
  | "gagne"
  | "perdu";

export type RelanceChannel =
  | "appel"
  | "email"
  | "visite"
  | "whatsapp"
  | "autre";

export type OpportunityRelance = {
  id: string;
  at: string;
  by: string;
  byName: string;
  channel: RelanceChannel;
  note: string;
  nextAction: string;
  dueAt: string | null;
};

export type NeedFieldKey =
  | "prestation"
  | "surfaceM2"
  | "localType"
  | "frequency"
  | "schedule"
  | "constraints"
  | "serviceLevel"
  | "zones"
  | "accessNotes"
  | "staffEstimate";

export type CleaningNeed = {
  prestation: PrestationKind | "";
  surfaceM2: number | null;
  localType: string;
  frequency: NeedFrequency | "";
  schedule: string;
  constraints: string;
  serviceLevel: ServiceLevel | "";
  zones: string;
  accessNotes: string;
  staffEstimate: number | null;
};

export type NeedValidationIssue = {
  field: NeedFieldKey;
  label: string;
  message: string;
};

export type CrmOpportunity = {
  id: string;
  prospectId: string;
  company: string;
  contactName: string;
  contactEmail: string;
  title: string;
  stage: OpportunityStage;
  need: CleaningNeed;
  needComplete: boolean;
  missingFields: NeedFieldKey[];
  valueEstimate: number;
  /** Probabilité de gain 0–100 (CRM-05). */
  probability: number;
  /** Prochaine action commerciale. */
  nextAction: string;
  /** Échéance de la prochaine action (ISO). */
  dueAt: string | null;
  /** Motif de perte obligatoire si stage = perdu. */
  lossReason: string;
  lostAt: string | null;
  relances: OpportunityRelance[];
  lastRelanceAt: string | null;
  ownerEmail: string;
  ownerName: string;
  note: string;
  history: Array<{
    id: string;
    at: string;
    by: string;
    byName: string;
    detail: string;
  }>;
  studyBlockedReason: string;
  advancedToStudyAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
};

export const PRESTATION_LABELS: Record<PrestationKind, string> = {
  bureaux: "Bureaux / tertiaire",
  commerces: "Commerces / retail",
  industriel: "Industriel / entrepôt",
  medical: "Médical / clinique",
  residentiel: "Résidentiel",
  copropriete: "Copropriété / parties communes",
  evenementiel: "Événementiel",
  autre: "Autre",
};

export const FREQUENCY_LABELS: Record<NeedFrequency, string> = {
  quotidienne: "Quotidienne",
  "5j_semaine": "5 j / semaine",
  "3j_semaine": "3 j / semaine",
  "2j_semaine": "2 j / semaine",
  hebdomadaire: "Hebdomadaire",
  bi_mensuelle: "Bi-mensuelle",
  mensuelle: "Mensuelle",
  ponctuelle: "Ponctuelle",
};

export const SERVICE_LEVEL_LABELS: Record<ServiceLevel, string> = {
  essentiel: "Essentiel",
  standard: "Standard",
  renforce: "Renforcé",
  premium: "Premium",
};

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  qualification: "Qualification besoin",
  etude: "Étude / chiffrage",
  proposition: "Proposition",
  negociation: "Négociation",
  gagne: "Gagnée",
  perdu: "Perdue",
};

/** Probabilité par défaut selon l’étape pipeline. */
export const DEFAULT_PROBABILITY_BY_STAGE: Record<OpportunityStage, number> = {
  qualification: 20,
  etude: 35,
  proposition: 50,
  negociation: 70,
  gagne: 100,
  perdu: 0,
};

export const RELANCE_CHANNEL_LABELS: Record<RelanceChannel, string> = {
  appel: "Appel",
  email: "E-mail",
  visite: "Visite",
  whatsapp: "WhatsApp",
  autre: "Autre",
};

export const LOSS_REASON_OPTIONS = [
  "Prix trop élevé",
  "Concurrent retenu",
  "Budget reporté / annulé",
  "Besoin non confirmé",
  "Pas de réponse / ghosting",
  "Hors zone / hors capacité",
  "Autre",
] as const;

export const OPEN_PIPELINE_STAGES: OpportunityStage[] = [
  "qualification",
  "etude",
  "proposition",
  "negociation",
];

export const NEED_FIELD_LABELS: Record<NeedFieldKey, string> = {
  prestation: "Type de prestation",
  surfaceM2: "Surface (m²)",
  localType: "Type de locaux",
  frequency: "Fréquence",
  schedule: "Horaires",
  constraints: "Contraintes",
  serviceLevel: "Niveau de service",
  zones: "Zones à couvrir",
  accessNotes: "Accès / consignes",
  staffEstimate: "Effectif estimé",
};

/** Champs obligatoires selon la prestation (CRM-02). */
export const REQUIRED_FIELDS_BY_PRESTATION: Record<
  PrestationKind,
  NeedFieldKey[]
> = {
  bureaux: [
    "prestation",
    "surfaceM2",
    "localType",
    "frequency",
    "schedule",
    "constraints",
    "serviceLevel",
  ],
  commerces: [
    "prestation",
    "surfaceM2",
    "localType",
    "frequency",
    "schedule",
    "constraints",
    "serviceLevel",
  ],
  industriel: [
    "prestation",
    "surfaceM2",
    "localType",
    "frequency",
    "schedule",
    "constraints",
    "zones",
    "accessNotes",
    "serviceLevel",
  ],
  medical: [
    "prestation",
    "surfaceM2",
    "localType",
    "frequency",
    "schedule",
    "constraints",
    "zones",
    "accessNotes",
    "serviceLevel",
    "staffEstimate",
  ],
  residentiel: [
    "prestation",
    "surfaceM2",
    "localType",
    "frequency",
    "schedule",
    "constraints",
    "serviceLevel",
  ],
  copropriete: [
    "prestation",
    "surfaceM2",
    "localType",
    "frequency",
    "schedule",
    "zones",
    "constraints",
    "serviceLevel",
  ],
  evenementiel: [
    "prestation",
    "localType",
    "frequency",
    "schedule",
    "constraints",
    "serviceLevel",
    "staffEstimate",
  ],
  autre: [
    "prestation",
    "surfaceM2",
    "localType",
    "frequency",
    "schedule",
    "constraints",
    "serviceLevel",
  ],
};

export const PRESTATION_KINDS = Object.keys(
  PRESTATION_LABELS,
) as PrestationKind[];
export const NEED_FREQUENCIES = Object.keys(
  FREQUENCY_LABELS,
) as NeedFrequency[];
export const SERVICE_LEVELS = Object.keys(
  SERVICE_LEVEL_LABELS,
) as ServiceLevel[];
export const OPPORTUNITY_STAGES = Object.keys(
  OPPORTUNITY_STAGE_LABELS,
) as OpportunityStage[];

export function emptyCleaningNeed(): CleaningNeed {
  return {
    prestation: "",
    surfaceM2: null,
    localType: "",
    frequency: "",
    schedule: "",
    constraints: "",
    serviceLevel: "",
    zones: "",
    accessNotes: "",
    staffEstimate: null,
  };
}

export function isPrestationKind(v: unknown): v is PrestationKind {
  return typeof v === "string" && PRESTATION_KINDS.includes(v as PrestationKind);
}

export function isNeedFrequency(v: unknown): v is NeedFrequency {
  return typeof v === "string" && NEED_FREQUENCIES.includes(v as NeedFrequency);
}

export function isServiceLevel(v: unknown): v is ServiceLevel {
  return typeof v === "string" && SERVICE_LEVELS.includes(v as ServiceLevel);
}

export function isOpportunityStage(v: unknown): v is OpportunityStage {
  return (
    typeof v === "string" &&
    OPPORTUNITY_STAGES.includes(v as OpportunityStage)
  );
}

export const RELANCE_CHANNELS = Object.keys(
  RELANCE_CHANNEL_LABELS,
) as RelanceChannel[];

export function isRelanceChannel(v: unknown): v is RelanceChannel {
  return typeof v === "string" && RELANCE_CHANNELS.includes(v as RelanceChannel);
}

export function clampProbability(n: unknown): number {
  const v = Math.round(Number(n) || 0);
  return Math.min(100, Math.max(0, v));
}

function fieldFilled(need: CleaningNeed, field: NeedFieldKey): boolean {
  switch (field) {
    case "prestation":
      return Boolean(need.prestation);
    case "surfaceM2":
      return need.surfaceM2 !== null && need.surfaceM2 > 0;
    case "localType":
      return need.localType.trim().length > 0;
    case "frequency":
      return Boolean(need.frequency);
    case "schedule":
      return need.schedule.trim().length > 0;
    case "constraints":
      return need.constraints.trim().length > 0;
    case "serviceLevel":
      return Boolean(need.serviceLevel);
    case "zones":
      return need.zones.trim().length > 0;
    case "accessNotes":
      return need.accessNotes.trim().length > 0;
    case "staffEstimate":
      return need.staffEstimate !== null && need.staffEstimate > 0;
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

export function requiredFieldsForNeed(need: CleaningNeed): NeedFieldKey[] {
  if (!need.prestation || !isPrestationKind(need.prestation)) {
    return [
      "prestation",
      "surfaceM2",
      "localType",
      "frequency",
      "schedule",
      "constraints",
      "serviceLevel",
    ];
  }
  return REQUIRED_FIELDS_BY_PRESTATION[need.prestation];
}

export function validateCleaningNeed(need: CleaningNeed): {
  ok: boolean;
  missing: NeedFieldKey[];
  issues: NeedValidationIssue[];
} {
  const required = requiredFieldsForNeed(need);
  const missing = required.filter((f) => !fieldFilled(need, f));
  const issues: NeedValidationIssue[] = missing.map((field) => ({
    field,
    label: NEED_FIELD_LABELS[field],
    message: `Champ obligatoire pour la prestation « ${
      need.prestation && isPrestationKind(need.prestation)
        ? PRESTATION_LABELS[need.prestation]
        : "non définie"
    } ».`,
  }));
  return { ok: missing.length === 0, missing, issues };
}

export function canAccessNeedQualification(role: UserRole): boolean {
  return role === "admin" || role === "commercial";
}
