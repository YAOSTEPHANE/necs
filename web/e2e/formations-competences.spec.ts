import { test, expect } from "@playwright/test";
import {
  DEFAULT_POSTE_PROFILES,
  DEFAULT_SKILL_CATALOG,
  buildGapViews,
  canAccessFormationsCompetences,
  canEditCollaboratorSkills,
  canManageSkillCatalog,
  computeExpiryFromCertification,
  listIdentifiableGaps,
  listRenewalAlerts,
  skillGapsRecipe,
  summarizeGaps,
  type AcquiredSkill,
} from "../src/lib/formations-competences-shared";

test.describe("Formation & compétences (Must RH-06)", () => {
  test("ACL : RH et managers accèdent ; RH gère le catalogue", () => {
    expect(canAccessFormationsCompetences("rh")).toBe(true);
    expect(canAccessFormationsCompetences("manager")).toBe(true);
    expect(canAccessFormationsCompetences("admin")).toBe(true);
    expect(canAccessFormationsCompetences("nettoyeur")).toBe(false);
    expect(canAccessFormationsCompetences("commercial")).toBe(false);

    expect(canEditCollaboratorSkills("manager")).toBe(true);
    expect(canManageSkillCatalog("rh")).toBe(true);
    expect(canManageSkillCatalog("manager")).toBe(false);
  });

  test("catalogue et postes couvrent sécurité, métier, qualité", () => {
    const cats = new Set(
      DEFAULT_SKILL_CATALOG.filter((c) => c.active).map((c) => c.category),
    );
    expect(cats.has("securite")).toBe(true);
    expect(cats.has("metier")).toBe(true);
    expect(cats.has("qualite")).toBe(true);

    const agent = DEFAULT_POSTE_PROFILES.find((p) => p.id === "agent");
    expect(agent).toBeTruthy();
    expect(agent!.requiredSkills.length).toBeGreaterThanOrEqual(5);
  });

  test("recette : écarts de compétences identifiables + alertes renouvellement", () => {
    const poste = DEFAULT_POSTE_PROFILES.find((p) => p.id === "agent")!;
    const catalog = DEFAULT_SKILL_CATALOG;

    const expiredCert = new Date();
    expiredCert.setMonth(expiredCert.getMonth() - 14);
    const soonCert = new Date();
    soonCert.setMonth(soonCert.getMonth() - 11);

    const hse = catalog.find((c) => c.id === "sec_hse")!;
    const gestes = catalog.find((c) => c.id === "sec_gestes")!;

    const skills: AcquiredSkill[] = [
      {
        skillId: "sec_hse",
        level: 2,
        certifiedAt: expiredCert.toISOString(),
        expiresAt: computeExpiryFromCertification(
          expiredCert.toISOString(),
          hse.renewalMonths,
        ),
        trainingTitle: "HSE ancien",
        note: "",
      },
      {
        skillId: "sec_gestes",
        level: 2,
        certifiedAt: soonCert.toISOString(),
        expiresAt: computeExpiryFromCertification(
          soonCert.toISOString(),
          gestes.renewalMonths,
        ),
        trainingTitle: "Gestes",
        note: "",
      },
      {
        skillId: "met_protocole",
        level: 3,
        certifiedAt: new Date().toISOString(),
        expiresAt: null,
        trainingTitle: "Protocole",
        note: "",
      },
    ];

    const views = buildGapViews({ catalog, poste, skills });
    const gaps = listIdentifiableGaps(views);
    const renewals = listRenewalAlerts(views);
    const summary = summarizeGaps(views);
    const recipe = skillGapsRecipe(views);

    expect(gaps.some((g) => g.skillId === "sec_chimiques")).toBe(true);
    expect(gaps.some((g) => g.status === "manquant")).toBe(true);
    expect(gaps.some((g) => g.skillId === "sec_hse")).toBe(true);
    expect(
      gaps.find((g) => g.skillId === "sec_hse")?.status === "expire" ||
        gaps.find((g) => g.skillId === "sec_hse")?.status === "insuffisant",
    ).toBe(true);

    expect(renewals.length).toBeGreaterThan(0);
    expect(summary.gapCount).toBeGreaterThan(0);
    expect(recipe.ok).toBe(false);
    expect(recipe.blocking.length).toBeGreaterThan(0);
    expect(recipe.gaps.some((g) => g.includes("manquante") || g.includes("expir"))).toBe(
      true,
    );
  });

  test("couverture 100 % sans écart bloquant", () => {
    const poste = DEFAULT_POSTE_PROFILES.find((p) => p.id === "agent")!;
    const catalog = DEFAULT_SKILL_CATALOG;
    const now = new Date().toISOString();
    const skills: AcquiredSkill[] = poste.requiredSkills.map((req) => {
      const def = catalog.find((c) => c.id === req.skillId)!;
      return {
        skillId: req.skillId,
        level: req.minLevel,
        certifiedAt: now,
        expiresAt: computeExpiryFromCertification(now, def.renewalMonths),
        trainingTitle: def.label,
        note: "",
      };
    });
    const views = buildGapViews({ catalog, poste, skills });
    const recipe = skillGapsRecipe(views);
    expect(summarizeGaps(views).coveragePct).toBe(100);
    expect(recipe.ok).toBe(true);
    expect(recipe.blocking).toEqual([]);
  });
});
