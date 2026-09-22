import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAs } from "./helpers";
import {
  emptyValidation,
  staffingApprovalRequirements,
  staffingReadyToApprove,
  type StaffingNeed,
} from "../src/lib/staffing-needs-shared";

function stubNeed(partial: Partial<StaffingNeed>): StaffingNeed {
  return {
    id: "BES-TEST",
    ref: "BES-TEST",
    title: "2 agents site Horizon",
    description: "",
    status: "en_validation",
    source: "contrat",
    contractId: "CTR-1",
    contractLabel: "Horizon · CTR-1",
    contractStaffCount: 2,
    planningSlotId: "",
    planningLabel: "",
    planningRequiredStaff: 0,
    siteId: "S1",
    siteName: "Horizon · Siège",
    clientName: "Horizon SA",
    profile: "agent",
    headcount: 2,
    startDate: "2026-10-01",
    endDate: "",
    budgetEstimate: 350000,
    hierarchical: emptyValidation(),
    budget: emptyValidation(),
    approvedAt: null,
    approvedBy: "",
    approvedByName: "",
    refusedAt: null,
    refuseReason: "",
    history: [
      {
        id: "h1",
        at: "2026-09-20T10:00:00.000Z",
        kind: "created",
        by: "u1",
        byName: "RH",
        byRole: "rh",
        detail: "Créé",
      },
    ],
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
    createdBy: "u1",
    createdByName: "RH",
    createdByRole: "rh",
    ...partial,
  };
}

test.describe("Expression du besoin (Must)", () => {
  test("recette : demande approuvée et traçable", () => {
    const incomplete = staffingApprovalRequirements(stubNeed({}));
    expect(incomplete.ok).toBe(false);
    expect(incomplete.missing).toContain("validation hiérarchique");
    expect(incomplete.missing).toContain("validation budgétaire");

    const ready = stubNeed({
      hierarchical: {
        ok: true,
        at: "2026-09-21T08:00:00.000Z",
        by: "u2",
        byName: "Direction",
        note: "OK",
      },
      budget: {
        ok: true,
        at: "2026-09-21T09:00:00.000Z",
        by: "u3",
        byName: "Finance",
        note: "Budget OK",
      },
    });
    expect(staffingReadyToApprove(ready)).toBe(true);

    const approved = stubNeed({
      status: "approuve",
      hierarchical: {
        ok: true,
        at: "2026-09-21T08:00:00.000Z",
        by: "u2",
        byName: "Direction",
        note: "",
      },
      budget: {
        ok: true,
        at: "2026-09-21T09:00:00.000Z",
        by: "u3",
        byName: "Finance",
        note: "",
      },
      approvedAt: "2026-09-21T09:00:01.000Z",
      approvedBy: "u3",
      approvedByName: "Finance",
      history: [
        {
          id: "h2",
          at: "2026-09-21T09:00:01.000Z",
          kind: "approved",
          by: "u3",
          byName: "Finance",
          byRole: "finance",
          detail: "Approuvée",
        },
        {
          id: "h1",
          at: "2026-09-20T10:00:00.000Z",
          kind: "created",
          by: "u1",
          byName: "RH",
          byRole: "rh",
          detail: "Créé",
        },
      ],
    });
    const gate = staffingApprovalRequirements(approved);
    expect(gate.ok).toBe(true);
    expect(gate.traceable).toBe(true);
  });

  test("UI : hub besoin accessible", async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Credentials admin manquants");
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/rh?tab=besoin");
    await expect(
      page.getByRole("heading", { name: "Expression du besoin" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sn-kpi-approved")).toBeVisible();
  });
});
