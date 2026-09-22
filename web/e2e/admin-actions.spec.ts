import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAs, uniqueEmail } from "./helpers";

test.describe("Actions admin", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).not.toHaveURL(/\/admin\/login/, { timeout: 20_000 });
  });

  test("tableau de bord : période et export", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: /Bon retour/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Hebdo" }).click();
    await page.getByRole("button", { name: "Mensuel" }).click();

    const exportBtn = page.getByRole("button", { name: /Export/i });
    if (await exportBtn.count()) {
      await exportBtn.first().click();
    }
  });

  test("demandes site : actualiser et filtrer", async ({ page }) => {
    await page.goto("/admin/demandes");
    await expect(
      page.getByRole("heading", { name: "Demandes site" }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Actualiser" }).click();
    await expect(
      page.getByRole("heading", { name: "Demandes site" }),
    ).toBeVisible();

    const filters = page.locator(".leads-filters, [role='tablist']").first();
    if (await filters.count()) {
      const chip = filters.getByRole("button").first();
      if (await chip.count()) await chip.click();
    }
  });

  test("utilisateurs : créer un compte client", async ({ page }) => {
    const email = uniqueEmail("admin-client");
    const password = "ClientAdmin2026!";

    await page.goto("/admin/utilisateurs");
    await expect(
      page.getByRole("heading", { name: /Utilisateurs/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "+ Compte client" }).click();
    await expect(
      page.getByRole("heading", { name: "Nouveau compte client" }),
    ).toBeVisible();

    const form = page.locator(".settings-user-form");
    await form.getByPlaceholder("Ex. Amina Moussa").fill("E2E Admin Client");
    await form.getByPlaceholder("contact@entreprise.cm").fill(email);
    await form.locator('input[type="password"]').fill(password);
    await form.getByRole("button", { name: /Créer le compte/i }).click();

    await expect(page.getByText(email).first()).toBeVisible({ timeout: 20_000 });
  });

  test("pointage : tableau du jour et détail", async ({ page }) => {
    await page.goto("/admin/pointage");
    await expect(
      page.getByRole("heading", { name: "Pointage des employés" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.locator(".pointage-board").first()).toBeVisible();

    const firstCard = page.locator(".pointage-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page.locator(".pointage-detail")).toBeVisible();
  });

  test("photos terrain : créer une visite", async ({ page }) => {
    await page.goto("/admin/terrain");
    await expect(
      page.getByRole("heading", { name: "Photos terrain" }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "+ Nouvelle visite" }).click();
    await expect(
      page.getByRole("heading", { name: /Nouvelle visite/i }),
    ).toBeVisible();

    const form = page.locator(".settings-user-form");
    await form
      .getByPlaceholder(/Immeuble Horizon/i)
      .fill("Site E2E Horizon");
    await form
      .locator(".settings-field", { hasText: /^Client/ })
      .locator("input")
      .fill("Client E2E SA");
    await form.getByRole("button", { name: "Créer la visite" }).click();

    await expect(page.getByText("Site E2E Horizon").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("bibliothèque : ouvrir un modèle", async ({ page }) => {
    await page.goto("/admin/templates");
    await expect(
      page.getByRole("heading", { name: /Documents|Bibliothèque/i }),
    ).toBeVisible({ timeout: 15_000 });

    const firstDoc = page.locator("a[href*='/admin/templates/']").first();
    await expect(firstDoc).toBeVisible();
    await firstDoc.click();
    await expect(page).toHaveURL(/\/admin\/templates\//);
  });

  test("paramètres : page accessible", async ({ page }) => {
    await page.goto("/admin/parametres");
    await expect(
      page.getByRole("heading", { name: "Paramètres" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("navigation Accueil : liens principaux", async ({ page }) => {
    const links: Array<{ href: string; name: RegExp }> = [
      { href: "/admin/demandes", name: /Demandes site/i },
      { href: "/admin/utilisateurs", name: /Utilisateurs/i },
      { href: "/admin/pointage", name: /^Pointage$/i },
      { href: "/admin/terrain", name: /Photos terrain/i },
      { href: "/admin/templates", name: /Bibliothèque/i },
      { href: "/admin/parametres", name: /Paramètres/i },
    ];

    for (const item of links) {
      await page.goto("/admin");
      await page
        .locator(".dash-nav, .dash-sidebar, aside")
        .getByRole("link", { name: item.name })
        .first()
        .click();
      await expect(page).toHaveURL(new RegExp(item.href.replace(/\//g, "\\/")));
    }

    await page.goto("/admin/demandes");
    await page
      .locator(".dash-nav, .dash-sidebar, aside")
      .getByRole("link", { name: /Tableau de bord/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/?$/);
  });
});
