import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAs } from "./helpers";
import {
  DEFAULT_HIRING_CHECKLIST,
  buildPieceViews,
  computePieceStatus,
  hiringReadinessRequirements,
  type HiringPiece,
} from "../src/lib/dossier-embauche-shared";

function piece(
  itemId: string,
  partial: Partial<HiringPiece> = {},
): HiringPiece {
  return {
    itemId,
    present: false,
    receivedAt: null,
    expiresAt: null,
    note: "",
    fileRef: "",
    ...partial,
  };
}

test.describe("Dossier d’embauche (Must)", () => {
  test("recette : pièces manquantes et expirées clairement identifiées", () => {
    const checklist = DEFAULT_HIRING_CHECKLIST.filter((c) => c.active);
    const today = "2026-09-21";
    const now = new Date(`${today}T12:00:00.000Z`);

    const pieces: HiringPiece[] = checklist.map((c) => {
      if (c.id === "cni") {
        return piece("cni", {
          present: true,
          receivedAt: "2025-01-01",
          expiresAt: "2026-01-01", // expiré
        });
      }
      if (c.id === "cv") {
        return piece("cv", {
          present: true,
          receivedAt: "2026-09-01",
          expiresAt: null,
        });
      }
      // reste manquant si required
      return piece(c.id);
    });

    const views = buildPieceViews(checklist, pieces, now);
    const readiness = hiringReadinessRequirements(views);

    expect(readiness.ok).toBe(false);
    expect(readiness.expired.some((l) => /identité/i.test(l))).toBe(true);
    expect(readiness.missing.length).toBeGreaterThan(0);
    expect(readiness.blocking.some((b) => b.startsWith("manquant"))).toBe(true);
    expect(readiness.blocking.some((b) => b.startsWith("expiré"))).toBe(true);

    const cni = views.find((v) => v.def.id === "cni");
    expect(cni?.status).toBe("expire");
    expect(
      computePieceStatus(
        checklist.find((c) => c.id === "cv")!,
        pieces.find((p) => p.itemId === "cv"),
        now,
      ),
    ).toBe("present");

    // Dossier prêt : toutes obligatoires présentes non expirées
    const allPresent = checklist.map((c) =>
      piece(c.id, {
        present: true,
        receivedAt: today,
        expiresAt: c.validityDays
          ? "2027-09-21"
          : null,
      }),
    );
    const readyViews = buildPieceViews(checklist, allPresent, now);
    const ready = hiringReadinessRequirements(readyViews);
    expect(ready.ok).toBe(true);
    expect(ready.missing).toEqual([]);
    expect(ready.expired).toEqual([]);
  });

  test("alerte avant expiration", () => {
    const cni = DEFAULT_HIRING_CHECKLIST.find((c) => c.id === "cni")!;
    const now = new Date("2026-09-21T12:00:00.000Z");
    // expire dans 20j < alertDaysBefore 30
    const status = computePieceStatus(
      cni,
      piece("cni", {
        present: true,
        receivedAt: "2026-09-01",
        expiresAt: "2026-10-10",
      }),
      now,
    );
    expect(status).toBe("alerte");
  });

  test("UI : hub embauche accessible", async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Credentials admin manquants");
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/rh?tab=embauche");
    await expect(
      page.getByRole("heading", { name: /Dossier d’embauche|Embauche/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
