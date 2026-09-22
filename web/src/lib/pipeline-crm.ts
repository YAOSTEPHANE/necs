import { randomUUID } from "crypto";
import {
  getOpportunity,
  listOpportunities,
  setOpportunityStage,
} from "@/lib/need-qualification-crm";
import {
  clampProbability,
  DEFAULT_PROBABILITY_BY_STAGE,
  isOpportunityStage,
  isRelanceChannel,
  type CrmOpportunity,
  type OpportunityRelance,
  type OpportunityStage,
} from "@/lib/need-qualification-shared";
import {
  buildPipelineDashboard,
  type PipelineDashboard,
  type PipelineUpdateInput,
  type RelanceInput,
} from "@/lib/pipeline-shared";
import type { UserRole } from "@/lib/settings";
import { getDb } from "@/lib/mongo";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function hist(actor: Actor, detail: string) {
  return {
    id: `PH-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
  };
}

async function saveOpp(doc: CrmOpportunity): Promise<CrmOpportunity> {
  const next = { ...doc, updatedAt: nowIso() };
  const db = await getDb();
  await db.collection<CrmOpportunity>("crm_opportunities").replaceOne(
    { id: doc.id },
    next,
    { upsert: true },
  );
  return next;
}

export async function listPipeline(
  actor: Actor,
): Promise<{ items: CrmOpportunity[]; dashboard: PipelineDashboard }> {
  const items = await listOpportunities(actor);
  const dashboard = buildPipelineDashboard(items, Date.now());
  return { items, dashboard };
}

export async function updatePipelineOpportunity(
  id: string,
  patch: PipelineUpdateInput,
  actor: Actor,
): Promise<CrmOpportunity> {
  const existing = await getOpportunity(id);
  if (!existing) throw new Error("Opportunité introuvable.");

  if (patch.stage && patch.stage !== existing.stage) {
    if (!isOpportunityStage(patch.stage)) throw new Error("Étape invalide.");
    const moved = await setOpportunityStage(id, patch.stage, actor, {
      lossReason: patch.lossReason,
    });
    // Apply remaining fields after stage move
    return applyFields(moved, patch, actor, false);
  }

  return applyFields(existing, patch, actor, true);
}

async function applyFields(
  existing: CrmOpportunity,
  patch: PipelineUpdateInput,
  actor: Actor,
  writeHistory: boolean,
): Promise<CrmOpportunity> {
  const next: CrmOpportunity = { ...existing };
  const changes: string[] = [];

  if (patch.valueEstimate !== undefined) {
    next.valueEstimate = Math.max(0, Number(patch.valueEstimate) || 0);
    changes.push(`valeur ${next.valueEstimate}`);
  }
  if (patch.probability !== undefined) {
    next.probability = clampProbability(patch.probability);
    changes.push(`proba ${next.probability}%`);
  }
  if (patch.nextAction !== undefined) {
    next.nextAction = clean(patch.nextAction, 400);
    changes.push(`action « ${next.nextAction || "—"} »`);
  }
  if (patch.dueAt !== undefined) {
    next.dueAt =
      patch.dueAt === null || patch.dueAt === ""
        ? null
        : clean(patch.dueAt, 40);
    changes.push(
      next.dueAt ? `échéance ${next.dueAt.slice(0, 16)}` : "échéance retirée",
    );
  }
  if (patch.note !== undefined) {
    next.note = clean(patch.note, 4000);
  }

  if (writeHistory && changes.length) {
    next.history = [
      hist(actor, `Pipeline mis à jour · ${changes.join(" · ")}`),
      ...next.history,
    ].slice(0, 80);
  }

  return saveOpp(next);
}

export async function addOpportunityRelance(
  id: string,
  input: RelanceInput,
  actor: Actor,
): Promise<CrmOpportunity> {
  const existing = await getOpportunity(id);
  if (!existing) throw new Error("Opportunité introuvable.");
  if (existing.stage === "gagne" || existing.stage === "perdu") {
    throw new Error("Impossible de relancer une affaire clôturée.");
  }

  const channel = isRelanceChannel(input.channel) ? input.channel : "autre";
  const note = clean(input.note, 2000);
  if (!note) throw new Error("Note de relance obligatoire.");

  const stamp = nowIso();
  const nextAction =
    input.nextAction !== undefined
      ? clean(input.nextAction, 400)
      : existing.nextAction;
  const dueAt =
    input.dueAt !== undefined
      ? input.dueAt === null || input.dueAt === ""
        ? null
        : clean(input.dueAt, 40)
      : existing.dueAt;

  const entry: OpportunityRelance = {
    id: `RL-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: stamp,
    by: actor.userId,
    byName: actor.name,
    channel,
    note,
    nextAction,
    dueAt,
  };

  const next: CrmOpportunity = {
    ...existing,
    nextAction,
    dueAt,
    lastRelanceAt: stamp,
    relances: [entry, ...existing.relances].slice(0, 80),
    history: [
      hist(actor, `Relance ${channel} · ${note.slice(0, 120)}`),
      ...existing.history,
    ].slice(0, 80),
  };

  return saveOpp(next);
}

export async function markOpportunityLost(
  id: string,
  lossReason: string,
  actor: Actor,
): Promise<CrmOpportunity> {
  return setOpportunityStage(id, "perdu", actor, { lossReason });
}

export async function markOpportunityWon(
  id: string,
  actor: Actor,
): Promise<CrmOpportunity> {
  return setOpportunityStage(id, "gagne", actor);
}

export async function movePipelineStage(
  id: string,
  stage: OpportunityStage,
  actor: Actor,
  lossReason?: string,
): Promise<CrmOpportunity> {
  const existing = await getOpportunity(id);
  if (!existing) throw new Error("Opportunité introuvable.");
  const moved = await setOpportunityStage(id, stage, actor, { lossReason });
  // Align default probability when moving if still at old default
  if (
    stage !== "perdu" &&
    stage !== "gagne" &&
    (existing.probability === DEFAULT_PROBABILITY_BY_STAGE[existing.stage] ||
      existing.probability === 0)
  ) {
    return saveOpp({
      ...moved,
      probability: DEFAULT_PROBABILITY_BY_STAGE[stage],
    });
  }
  return moved;
}
