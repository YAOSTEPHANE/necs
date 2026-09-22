import type { UserRole } from "@/lib/settings";

/** Score de satisfaction (0–100). Historique append-only. */
export type SatisfactionScore = {
  id: string;
  ref: string;
  clientId: string;
  clientName: string;
  company: string;
  siteId: string;
  siteName: string;
  /** Score 0–100 (CSAT transformé en % pour dashboards). */
  score: number;
  /** Période de mesure YYYY-MM. */
  period: string;
  comment: string;
  channel: SatisfactionChannel;
  createdAt: string;
  createdBy: string;
  createdByName: string;
};

export type SatisfactionChannel =
  | "entretien"
  | "questionnaire"
  | "email"
  | "visite"
  | "autre";

export type PlanStatus = "ouvert" | "en_cours" | "clos";

export type PlanHistoryEntry = {
  id: string;
  at: string;
  by: string;
  byName: string;
  detail: string;
};

/** Plan d’amélioration lié client / site. */
export type ImprovementPlan = {
  id: string;
  ref: string;
  clientId: string;
  clientName: string;
  company: string;
  siteId: string;
  siteName: string;
  title: string;
  description: string;
  status: PlanStatus;
  dueDate: string;
  ownerId: string;
  ownerName: string;
  /** Score déclencheur optionnel. */
  triggerScoreId: string;
  triggerScore: number | null;
  history: PlanHistoryEntry[];
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
};

export type SatisfactionScoreInput = {
  clientId?: string;
  clientName?: string;
  company?: string;
  siteId?: string;
  score: number;
  period?: string;
  comment?: string;
  channel?: SatisfactionChannel;
};

export type ImprovementPlanInput = {
  clientId?: string;
  clientName?: string;
  company?: string;
  siteId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  ownerId?: string;
  triggerScoreId?: string;
};

export const SATISFACTION_CHANNEL_LABELS: Record<SatisfactionChannel, string> =
  {
    entretien: "Entretien",
    questionnaire: "Questionnaire",
    email: "E-mail",
    visite: "Visite site",
    autre: "Autre",
  };

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  clos: "Clos",
};

export const SATISFACTION_CHANNELS = Object.keys(
  SATISFACTION_CHANNEL_LABELS,
) as SatisfactionChannel[];
export const PLAN_STATUSES = Object.keys(PLAN_STATUS_LABELS) as PlanStatus[];

/** Direction + qualité (+ admin). */
export function canAccessSatisfaction(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "qualite" ||
    role === "manager" ||
    role === "ops"
  );
}

export function canEditSatisfaction(role: UserRole): boolean {
  return role === "admin" || role === "qualite" || role === "manager";
}

export function isSatisfactionChannel(v: unknown): v is SatisfactionChannel {
  return (
    typeof v === "string" &&
    SATISFACTION_CHANNELS.includes(v as SatisfactionChannel)
  );
}

export function isPlanStatus(v: unknown): v is PlanStatus {
  return v === "ouvert" || v === "en_cours" || v === "clos";
}

export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatPeriodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

/** Agrégats pour dashboards (recette Q-04). */
export type SatisfactionDashboard = {
  avgScore: number | null;
  previousAvgScore: number | null;
  /** Variation en points vs période précédente. */
  deltaPoints: number | null;
  /** Taux affiché 0–100 (égal à avgScore). */
  satisfactionRate: number | null;
  scoresCount: number;
  plansOpen: number;
  plansTotal: number;
  plansClosed: number;
  bySite: Array<{
    siteId: string;
    siteName: string;
    avgScore: number;
    scoresCount: number;
    plansOpen: number;
  }>;
  byClient: Array<{
    clientKey: string;
    clientName: string;
    company: string;
    avgScore: number;
    scoresCount: number;
    lastScoreAt: string;
  }>;
  recentScores: SatisfactionScore[];
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
}

/**
 * Calcule les KPI dashboard à partir des scores et plans.
 * Deterministe — pas de Date.now() côté query Convex ; OK en API Next.
 */
export function buildSatisfactionDashboard(
  scores: SatisfactionScore[],
  plans: ImprovementPlan[],
  opts?: { period?: string },
): SatisfactionDashboard {
  const period = opts?.period || currentPeriod();
  const [y, m] = period.split("-").map(Number);
  const prevDate = new Date(y || 2026, (m || 1) - 2, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const inPeriod = scores.filter((s) => s.period === period);
  const inPrev = scores.filter((s) => s.period === prevPeriod);
  const pool = inPeriod.length > 0 ? inPeriod : scores;

  const avgScore = avg(pool.map((s) => s.score));
  const previousAvgScore = avg(inPrev.map((s) => s.score));
  const deltaPoints =
    avgScore !== null && previousAvgScore !== null
      ? Math.round((avgScore - previousAvgScore) * 10) / 10
      : null;

  const siteMap = new Map<
    string,
    { siteId: string; siteName: string; scores: number[]; plansOpen: number }
  >();
  for (const s of scores) {
    const key = s.siteId || s.siteName || "_";
    const row = siteMap.get(key) ?? {
      siteId: s.siteId,
      siteName: s.siteName || "Sans site",
      scores: [],
      plansOpen: 0,
    };
    row.scores.push(s.score);
    siteMap.set(key, row);
  }
  for (const p of plans) {
    if (p.status === "clos") continue;
    const key = p.siteId || p.siteName || "_";
    const row = siteMap.get(key) ?? {
      siteId: p.siteId,
      siteName: p.siteName || "Sans site",
      scores: [],
      plansOpen: 0,
    };
    row.plansOpen += 1;
    siteMap.set(key, row);
  }

  const clientMap = new Map<
    string,
    {
      clientKey: string;
      clientName: string;
      company: string;
      scores: number[];
      lastScoreAt: string;
    }
  >();
  for (const s of scores) {
    const key = s.clientId || s.company || s.clientName || "_";
    const row = clientMap.get(key) ?? {
      clientKey: key,
      clientName: s.clientName || s.company || "Client",
      company: s.company,
      scores: [],
      lastScoreAt: s.createdAt,
    };
    row.scores.push(s.score);
    if (s.createdAt > row.lastScoreAt) row.lastScoreAt = s.createdAt;
    clientMap.set(key, row);
  }

  const recentScores = [...scores]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);

  return {
    avgScore,
    previousAvgScore,
    deltaPoints,
    satisfactionRate: avgScore,
    scoresCount: scores.length,
    plansOpen: plans.filter((p) => p.status !== "clos").length,
    plansTotal: plans.length,
    plansClosed: plans.filter((p) => p.status === "clos").length,
    bySite: [...siteMap.values()]
      .map((r) => ({
        siteId: r.siteId,
        siteName: r.siteName,
        avgScore: avg(r.scores) ?? 0,
        scoresCount: r.scores.length,
        plansOpen: r.plansOpen,
      }))
      .sort((a, b) => a.avgScore - b.avgScore),
    byClient: [...clientMap.values()]
      .map((r) => ({
        clientKey: r.clientKey,
        clientName: r.clientName,
        company: r.company,
        avgScore: avg(r.scores) ?? 0,
        scoresCount: r.scores.length,
        lastScoreAt: r.lastScoreAt,
      }))
      .sort((a, b) => b.lastScoreAt.localeCompare(a.lastScoreAt)),
    recentScores,
  };
}

/** Recette : un plan clos doit avoir un titre et un propriétaire. */
export function planCloseRequirements(plan: ImprovementPlan): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!plan.title.trim()) missing.push("titre");
  if (!plan.ownerId && !plan.ownerName) missing.push("responsable");
  return { ok: missing.length === 0, missing };
}

export function scoreHistoryFor(
  scores: SatisfactionScore[],
  filter: { clientId?: string; siteId?: string },
): SatisfactionScore[] {
  return scores
    .filter((s) => {
      if (filter.clientId && s.clientId !== filter.clientId) return false;
      if (filter.siteId && s.siteId !== filter.siteId) return false;
      return true;
    })
    .sort((a, b) => {
      const p = a.period.localeCompare(b.period);
      if (p !== 0) return p;
      return a.createdAt.localeCompare(b.createdAt);
    });
}
