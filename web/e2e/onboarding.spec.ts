import { test, expect } from "@playwright/test";
import {
  DEFAULT_ONBOARDING_CHECKLIST,
  buildTaskViews,
  canAccessOnboarding,
  canToggleOnboardingTask,
  canValidateOnboardingEnd,
  isOnboardingReadyToValidate,
  onboardingEndRequirements,
  summarizeOnboarding,
  type OnboardingTask,
} from "../src/lib/onboarding-shared";

function task(
  taskId: string,
  partial: Partial<OnboardingTask> = {},
): OnboardingTask {
  return {
    taskId,
    done: false,
    doneAt: null,
    doneByEmail: "",
    doneByName: "",
    note: "",
    ...partial,
  };
}

test.describe("Onboarding (Must)", () => {
  test("ACL : RH, manager et ops accèdent / cochent", () => {
    expect(canAccessOnboarding("rh")).toBe(true);
    expect(canAccessOnboarding("manager")).toBe(true);
    expect(canAccessOnboarding("ops")).toBe(true);
    expect(canAccessOnboarding("admin")).toBe(true);
    expect(canAccessOnboarding("nettoyeur")).toBe(false);
    expect(canAccessOnboarding("commercial")).toBe(false);

    expect(canValidateOnboardingEnd("manager")).toBe(true);
    expect(canValidateOnboardingEnd("ops")).toBe(true);
    expect(canToggleOnboardingTask("rh", "rh")).toBe(true);
    expect(canToggleOnboardingTask("manager", "rh")).toBe(false);
    expect(canToggleOnboardingTask("manager", "manager")).toBe(true);
    expect(canToggleOnboardingTask("ops", "manager")).toBe(true);
    expect(canToggleOnboardingTask("ops", "rh")).toBe(false);
    expect(canToggleOnboardingTask("rh", "manager")).toBe(true);
  });

  test("checklist couvre documents, accès, EPI, matériel, formation, affectation", () => {
    const cats = new Set(
      DEFAULT_ONBOARDING_CHECKLIST.filter((c) => c.active).map((c) => c.category),
    );
    expect(cats.has("documents")).toBe(true);
    expect(cats.has("acces")).toBe(true);
    expect(cats.has("uniforme_epi")).toBe(true);
    expect(cats.has("materiel")).toBe(true);
    expect(cats.has("formation")).toBe(true);
    expect(cats.has("affectation")).toBe(true);
    expect(
      DEFAULT_ONBOARDING_CHECKLIST.some((c) => c.id === "validation_fin"),
    ).toBe(true);
  });

  test("recette : fin d’intégration validée", () => {
    const checklist = DEFAULT_ONBOARDING_CHECKLIST.filter((c) => c.active);
    const emptyViews = buildTaskViews(checklist, []);
    expect(isOnboardingReadyToValidate(emptyViews)).toBe(false);
    expect(
      onboardingEndRequirements({
        status: "en_cours",
        validatedAt: null,
        views: emptyViews,
      }).ok,
    ).toBe(false);

    // Toutes tâches sauf validation_fin
    const almost: OnboardingTask[] = checklist
      .filter((c) => c.id !== "validation_fin")
      .map((c) =>
        task(c.id, {
          done: true,
          doneAt: "2026-09-21T10:00:00.000Z",
          doneByEmail: "rh@necs.cm",
          doneByName: "RH",
        }),
      );
    const almostViews = buildTaskViews(checklist, almost);
    expect(summarizeOnboarding(almostViews).pendingBeforeValidate).toEqual([]);
    expect(isOnboardingReadyToValidate(almostViews)).toBe(true);
    expect(
      onboardingEndRequirements({
        status: "pret",
        validatedAt: null,
        views: almostViews,
      }).ok,
    ).toBe(false);

    const complete: OnboardingTask[] = [
      ...almost,
      task("validation_fin", {
        done: true,
        doneAt: "2026-09-21T12:00:00.000Z",
        doneByEmail: "manager@necs.cm",
        doneByName: "Manager",
      }),
    ];
    const readyViews = buildTaskViews(checklist, complete);
    const recipe = onboardingEndRequirements({
      status: "valide",
      validatedAt: "2026-09-21T12:00:00.000Z",
      views: readyViews,
    });
    expect(recipe.ok).toBe(true);
    expect(recipe.missing).toEqual([]);
  });
});
