export type AssignmentStatus = "planifie" | "absent" | "remplace";

export type AssignmentRole = "titulaire" | "remplacant";

export type PlanningAlertKind =
  | "conflit"
  | "sous_effectif"
  | "absence";

export type PlanningAssignment = {
  id: string;
  agentUserId: string;
  agentName: string;
  agentEmail: string;
  role: AssignmentRole;
  status: AssignmentStatus;
  replacedAssignmentId: string;
  note: string;
};

export type PlanningSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  clientId: string;
  contractId: string;
  siteId: string;
  prestationId: string;
  clientName: string;
  siteName: string;
  prestationLabel: string;
  requiredStaff: number;
  assignments: PlanningAssignment[];
  alerts: PlanningAlertKind[];
  note: string;
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

export const PLANNING_ALERT_LABELS: Record<PlanningAlertKind, string> = {
  conflit: "Conflit d’horaire",
  sous_effectif: "Sous-effectif",
  absence: "Absence non remplacée",
};

/** Recette OPS-02 : les affectations restent liées au créneau modifié. */
export function assertAssignmentsPropagated(
  before: { assignmentIds: string[]; date: string; startTime: string; endTime: string },
  after: PlanningSlot,
): {
  ok: boolean;
  checks: Array<{ key: string; ok: boolean; detail: string }>;
} {
  const afterIds = after.assignments.map((a) => a.id);
  const checks = [
    {
      key: "count",
      ok: after.assignments.length >= before.assignmentIds.length,
      detail: `${after.assignments.length} affectation(s) sur le créneau`,
    },
    {
      key: "ids",
      ok: before.assignmentIds.every((id) => afterIds.includes(id)),
      detail: "Affectations conservées après modification",
    },
    {
      key: "schedule",
      ok: Boolean(after.date && after.startTime && after.endTime),
      detail: `${after.date} · ${after.startTime}–${after.endTime}`,
    },
    {
      key: "moved",
      ok: true,
      detail:
        after.date !== before.date ||
        after.startTime !== before.startTime ||
        after.endTime !== before.endTime
          ? "Créneau déplacé — agents suivent"
          : "Horaires inchangés — affectations intactes",
    },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

export function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function computeSlotAlerts(
  slot: PlanningSlot,
  allSlots: PlanningSlot[],
): PlanningAlertKind[] {
  const alerts: PlanningAlertKind[] = [];
  const active = slot.assignments.filter((a) => a.status === "planifie");
  if (active.length < slot.requiredStaff) {
    alerts.push("sous_effectif");
  }
  if (slot.assignments.some((a) => a.status === "absent")) {
    const hasReplacement = slot.assignments.some(
      (a) => a.status === "planifie" && a.role === "remplacant",
    );
    if (!hasReplacement) alerts.push("absence");
  }
  for (const a of active) {
    const conflict = allSlots.some((other) => {
      if (other.id === slot.id || other.date !== slot.date) return false;
      const otherActive = other.assignments.filter((x) => x.status === "planifie");
      if (!otherActive.some((x) => x.agentUserId === a.agentUserId)) return false;
      return timesOverlap(
        slot.startTime,
        slot.endTime,
        other.startTime,
        other.endTime,
      );
    });
    if (conflict) {
      alerts.push("conflit");
      break;
    }
  }
  return alerts;
}
