import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAs } from "./helpers";
import {
  nextAllowedStatuses,
  recruitmentJourneyRequirements,
  type RecruitmentHistoryEntry,
  type RecruitmentJourneyDoc,
} from "../src/lib/recrutement-shared";

function hist(
  partial: Partial<RecruitmentHistoryEntry> &
    Pick<RecruitmentHistoryEntry, "kind">,
): RecruitmentHistoryEntry {
  return {
    id: `h-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    from: null,
    to: null,
    decision: null,
    score: null,
    note: "",
    byEmail: "rh@necs.cm",
    byName: "RH",
    byRole: "rh",
    ...partial,
  };
}

function stubJourney(
  partial: Partial<RecruitmentJourneyDoc>,
): RecruitmentJourneyDoc {
  return {
    status: "candidature",
    decision: "en_attente",
    score: null,
    history: [hist({ kind: "created", to: "candidature" })],
    ...partial,
  };
}

test.describe("Recrutement (Must)", () => {
  test("ACL : transitions séquentielles RH / manager", () => {
    expect(nextAllowedStatuses("candidature", "rh")).toEqual(["preselection"]);
    expect(nextAllowedStatuses("preselection", "rh")).toEqual([
      "entretien",
      "candidature",
    ]);
    expect(nextAllowedStatuses("candidature", "rh")).not.toContain("decision");

    expect(nextAllowedStatuses("entretien", "manager")).toEqual(["evaluation"]);
    expect(nextAllowedStatuses("evaluation", "manager")).toEqual([
      "entretien",
      "decision",
    ]);
    expect(nextAllowedStatuses("candidature", "manager")).toEqual([]);
  });

  test("recette : parcours complet historisé", () => {
    const empty = recruitmentJourneyRequirements(stubJourney({}));
    expect(empty.ok).toBe(false);
    expect(empty.missing.length).toBeGreaterThan(0);

    const complete = recruitmentJourneyRequirements(
      stubJourney({
        status: "decision",
        decision: "retenu",
        score: 82,
        history: [
          hist({ kind: "created", to: "candidature" }),
          hist({
            kind: "status",
            from: "candidature",
            to: "preselection",
          }),
          hist({
            kind: "status",
            from: "preselection",
            to: "entretien",
          }),
          hist({
            kind: "status",
            from: "entretien",
            to: "evaluation",
          }),
          hist({
            kind: "evaluation",
            to: "evaluation",
            score: 82,
            note: "Bon profil",
          }),
          hist({
            kind: "status",
            from: "evaluation",
            to: "decision",
          }),
          hist({
            kind: "decision",
            from: "evaluation",
            to: "decision",
            decision: "retenu",
          }),
        ],
      }),
    );
    expect(complete.ok).toBe(true);
    expect(complete.statusesSeen).toEqual([
      "candidature",
      "preselection",
      "entretien",
      "evaluation",
      "decision",
    ]);
  });

  test("UI : hub recrutement accessible", async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Credentials admin manquants");
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/rh?tab=recrutement");
    await expect(page.getByRole("heading", { name: "Recrutement" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
