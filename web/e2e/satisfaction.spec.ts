import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAs } from "./helpers";
import {
  buildSatisfactionDashboard,
  planCloseRequirements,
  scoreHistoryFor,
  type ImprovementPlan,
  type SatisfactionScore,
} from "../src/lib/satisfaction-shared";

function stubScore(partial: Partial<SatisfactionScore>): SatisfactionScore {
  return {
    id: "SAT-TEST",
    ref: "SAT-TEST",
    clientId: "c1",
    clientName: "Horizon",
    company: "Horizon SA",
    siteId: "S1",
    siteName: "Horizon · Siège",
    score: 80,
    period: "2026-09",
    comment: "",
    channel: "questionnaire",
    createdAt: "2026-09-10T10:00:00.000Z",
    createdBy: "u1",
    createdByName: "Qualité",
    ...partial,
  };
}

function stubPlan(partial: Partial<ImprovementPlan>): ImprovementPlan {
  return {
    id: "PLN-TEST",
    ref: "PLN-TEST",
    clientId: "c1",
    clientName: "Horizon",
    company: "Horizon SA",
    siteId: "S1",
    siteName: "Horizon · Siège",
    title: "Améliorer accueil",
    description: "",
    status: "ouvert",
    dueDate: "2026-10-01",
    ownerId: "u2",
    ownerName: "Ops",
    triggerScoreId: "",
    triggerScore: null,
    history: [],
    closedAt: null,
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
    createdBy: "u1",
    createdByName: "Qualité",
    ...partial,
  };
}

test.describe("Satisfaction (Must)", () => {
  test("recette : historique des scores et KPI dashboard", () => {
    const scores = [
      stubScore({ score: 70, period: "2026-08", createdAt: "2026-08-15T10:00:00.000Z" }),
      stubScore({
        id: "SAT-2",
        score: 90,
        period: "2026-09",
        createdAt: "2026-09-15T10:00:00.000Z",
      }),
    ];
    const plans = [
      stubPlan({}),
      stubPlan({ id: "PLN-2", status: "clos", closedAt: "2026-09-20T10:00:00.000Z" }),
    ];

    const dash = buildSatisfactionDashboard(scores, plans, {
      period: "2026-09",
    });
    expect(dash.satisfactionRate).toBe(90);
    expect(dash.previousAvgScore).toBe(70);
    expect(dash.deltaPoints).toBe(20);
    expect(dash.plansOpen).toBe(1);
    expect(dash.byClient[0]?.avgScore).toBe(80);
    expect(dash.bySite[0]?.siteName).toContain("Horizon");

    const hist = scoreHistoryFor(scores, { clientId: "c1" });
    expect(hist.map((s) => s.score)).toEqual([70, 90]);
  });

  test("recette : clôture plan exige titre et responsable", () => {
    const empty = planCloseRequirements(
      stubPlan({ title: "", ownerId: "", ownerName: "" }),
    );
    expect(empty.ok).toBe(false);
    expect(empty.missing).toEqual(["titre", "responsable"]);

    const ready = planCloseRequirements(stubPlan({}));
    expect(ready.ok).toBe(true);
  });

  test("UI : hub satisfaction accessible", async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Credentials admin manquants");
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/operations?tab=qualite&feature=satisfaction");
    await expect(page.getByRole("heading", { name: "Satisfaction" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("sat-kpi-rate")).toBeVisible();
  });
});
