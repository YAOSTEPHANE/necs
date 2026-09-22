import type { UserRole } from "@/lib/settings";
import type {
  CrmOpportunity,
  OpportunityStage,
  RelanceChannel,
} from "@/lib/need-qualification-shared";
import {
  OPEN_PIPELINE_STAGES,
  OPPORTUNITY_STAGE_LABELS,
} from "@/lib/need-qualification-shared";

export type PipelineAlertKind =
  | "overdue"
  | "due_soon"
  | "no_action"
  | "stalled"
  | "no_value";

export type PipelineAlert = {
  kind: PipelineAlertKind;
  opportunityId: string;
  company: string;
  message: string;
  dueAt: string | null;
  severity: "danger" | "warn" | "info";
};

export type PipelineStageBucket = {
  stage: OpportunityStage;
  label: string;
  count: number;
  value: number;
  weighted: number;
};

export type PipelineDashboard = {
  openCount: number;
  wonCount: number;
  lostCount: number;
  totalValue: number;
  weightedValue: number;
  overdueCount: number;
  dueSoonCount: number;
  byStage: PipelineStageBucket[];
  alerts: PipelineAlert[];
  topOpportunities: Array<{
    id: string;
    company: string;
    stage: OpportunityStage;
    valueEstimate: number;
    probability: number;
    weighted: number;
    nextAction: string;
    dueAt: string | null;
    ownerName: string;
  }>;
};

export const PIPELINE_ALERT_LABELS: Record<PipelineAlertKind, string> = {
  overdue: "Échéance dépassée",
  due_soon: "Échéance sous 48 h",
  no_action: "Sans prochaine action",
  stalled: "Sans relance (>14 j)",
  no_value: "Valeur non renseignée",
};

const STALL_MS = 14 * 24 * 60 * 60 * 1000;
const DUE_SOON_MS = 48 * 60 * 60 * 1000;

export function canAccessPipeline(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "commercial" ||
    role === "manager"
  );
}

export function canEditPipeline(role: UserRole): boolean {
  return role === "admin" || role === "commercial" || role === "manager";
}

export function isOpenStage(stage: OpportunityStage): boolean {
  return OPEN_PIPELINE_STAGES.includes(stage);
}

export function weightedValue(opp: CrmOpportunity): number {
  if (!isOpenStage(opp.stage) && opp.stage !== "gagne") return 0;
  if (opp.stage === "gagne") return Math.max(0, opp.valueEstimate);
  return Math.round(
    Math.max(0, opp.valueEstimate) * (Math.max(0, opp.probability) / 100),
  );
}

export function buildPipelineAlerts(
  items: CrmOpportunity[],
  nowMs: number,
): PipelineAlert[] {
  const alerts: PipelineAlert[] = [];
  for (const opp of items) {
    if (!isOpenStage(opp.stage)) continue;

    if (!opp.nextAction.trim()) {
      alerts.push({
        kind: "no_action",
        opportunityId: opp.id,
        company: opp.company,
        message: "Définir la prochaine action",
        dueAt: opp.dueAt,
        severity: "warn",
      });
    }

    if (!(opp.valueEstimate > 0)) {
      alerts.push({
        kind: "no_value",
        opportunityId: opp.id,
        company: opp.company,
        message: "Renseigner la valeur estimée",
        dueAt: opp.dueAt,
        severity: "info",
      });
    }

    if (opp.dueAt) {
      const due = new Date(opp.dueAt).getTime();
      if (!Number.isNaN(due)) {
        if (due < nowMs) {
          alerts.push({
            kind: "overdue",
            opportunityId: opp.id,
            company: opp.company,
            message: `Échéance dépassée · ${opp.nextAction || "action"}`,
            dueAt: opp.dueAt,
            severity: "danger",
          });
        } else if (due - nowMs <= DUE_SOON_MS) {
          alerts.push({
            kind: "due_soon",
            opportunityId: opp.id,
            company: opp.company,
            message: `À traiter sous 48 h · ${opp.nextAction || "action"}`,
            dueAt: opp.dueAt,
            severity: "warn",
          });
        }
      }
    }

    const lastTouch = opp.lastRelanceAt || opp.updatedAt || opp.createdAt;
    const touchMs = new Date(lastTouch).getTime();
    if (!Number.isNaN(touchMs) && nowMs - touchMs > STALL_MS) {
      alerts.push({
        kind: "stalled",
        opportunityId: opp.id,
        company: opp.company,
        message: "Aucune relance depuis plus de 14 jours",
        dueAt: opp.dueAt,
        severity: "warn",
      });
    }
  }

  const severityRank = { danger: 0, warn: 1, info: 2 };
  return alerts.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );
}

export function buildPipelineDashboard(
  items: CrmOpportunity[],
  nowMs: number,
): PipelineDashboard {
  const open = items.filter((o) => isOpenStage(o.stage));
  const won = items.filter((o) => o.stage === "gagne");
  const lost = items.filter((o) => o.stage === "perdu");
  const alerts = buildPipelineAlerts(items, nowMs);

  const byStage: PipelineStageBucket[] = (
    [
      "qualification",
      "etude",
      "proposition",
      "negociation",
      "gagne",
      "perdu",
    ] as OpportunityStage[]
  ).map((stage) => {
    const rows = items.filter((o) => o.stage === stage);
    const value = rows.reduce((s, o) => s + Math.max(0, o.valueEstimate), 0);
    const weighted = rows.reduce((s, o) => s + weightedValue(o), 0);
    return {
      stage,
      label: OPPORTUNITY_STAGE_LABELS[stage],
      count: rows.length,
      value,
      weighted,
    };
  });

  const totalValue = open.reduce((s, o) => s + Math.max(0, o.valueEstimate), 0);
  const weightedPipeline = open.reduce((s, o) => s + weightedValue(o), 0);

  const topOpportunities = [...open]
    .sort((a, b) => weightedValue(b) - weightedValue(a))
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      company: o.company,
      stage: o.stage,
      valueEstimate: o.valueEstimate,
      probability: o.probability,
      weighted: weightedValue(o),
      nextAction: o.nextAction,
      dueAt: o.dueAt,
      ownerName: o.ownerName,
    }));

  return {
    openCount: open.length,
    wonCount: won.length,
    lostCount: lost.length,
    totalValue,
    weightedValue: weightedPipeline,
    overdueCount: alerts.filter((a) => a.kind === "overdue").length,
    dueSoonCount: alerts.filter((a) => a.kind === "due_soon").length,
    byStage,
    alerts: alerts.slice(0, 40),
    topOpportunities,
  };
}

export function formatPipelineFcfa(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}

export type PipelineUpdateInput = {
  valueEstimate?: number;
  probability?: number;
  nextAction?: string;
  dueAt?: string | null;
  stage?: OpportunityStage;
  lossReason?: string;
  note?: string;
};

export type RelanceInput = {
  channel: RelanceChannel;
  note: string;
  nextAction?: string;
  dueAt?: string | null;
};
