import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAs } from "./helpers";
import {
  ncClosureRequirements,
  type NonConformity,
} from "../src/lib/non-conformities-shared";

function stubNc(partial: Partial<NonConformity>): NonConformity {
  return {
    id: "NC-TEST",
    ref: "NC-TEST",
    title: "Écart test",
    description: "",
    siteId: "S1",
    siteName: "Site test",
    criticality: "majeure",
    status: "en_cours",
    source: "terrain",
    qualityControlId: "",
    qualityControlRef: "",
    assigneeId: "",
    assigneeName: "",
    dueDate: "",
    correctiveAction: "",
    proofs: [],
    validated: false,
    validatedAt: null,
    validatedBy: "",
    validatedByName: "",
    validationNote: "",
    closedAt: null,
    closedBy: "",
    closedByName: "",
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "u1",
    createdByName: "Test",
    ...partial,
  };
}

test.describe("Non-conformités (Must)", () => {
  test("recette : clôture exige tous les éléments requis", () => {
    const empty = ncClosureRequirements(stubNc({}));
    expect(empty.ok).toBe(false);
    expect(empty.missing).toEqual([
      "responsable",
      "échéance",
      "action corrective",
      "preuve",
      "validation",
    ]);

    const partial = ncClosureRequirements(
      stubNc({
        assigneeId: "u2",
        assigneeName: "Ops",
        dueDate: "2026-12-31",
        correctiveAction: "Nettoyage zone B",
        proofs: [
          {
            id: "p1",
            url: "https://example.com/p.jpg",
            caption: "",
            at: new Date().toISOString(),
            by: "u2",
            byName: "Ops",
          },
        ],
      }),
    );
    expect(partial.ok).toBe(false);
    expect(partial.missing).toEqual(["validation"]);

    const ready = ncClosureRequirements(
      stubNc({
        assigneeId: "u2",
        assigneeName: "Ops",
        dueDate: "2026-12-31",
        correctiveAction: "Nettoyage zone B",
        proofs: [
          {
            id: "p1",
            url: "https://example.com/p.jpg",
            caption: "",
            at: new Date().toISOString(),
            by: "u2",
            byName: "Ops",
          },
        ],
        validated: true,
        validatedAt: new Date().toISOString(),
        validatedBy: "q1",
        validatedByName: "Qualité",
      }),
    );
    expect(ready.ok).toBe(true);
    expect(ready.missing).toEqual([]);
  });

  test("UI hub : checklist de clôture visible", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).not.toHaveURL(/\/admin\/login/, { timeout: 20_000 });

    await page.goto("/admin/operations?tab=qualite&feature=nc");
    await expect(
      page.getByRole("heading", { name: /Non-conformités|Opérations/i }).first(),
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      page.getByRole("button", { name: /Nouvelle NC/i }),
    ).toBeVisible({ timeout: 15_000 });

    const firstCard = page.locator(".nc-card").first();
    if (await firstCard.count()) {
      await firstCard.click();
      await expect(page.getByTestId("nc-closure-checklist")).toBeVisible();
      await expect(page.getByTestId("nc-close-btn")).toBeVisible();
    }
  });
});
