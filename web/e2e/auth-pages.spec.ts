import { test, expect } from "@playwright/test";

test.describe("Pages auth", () => {
  test("affiche la page de connexion", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await expect(page.getByPlaceholder("vous@email.com")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("link", { name: "S’inscrire" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Mot de passe oublié ?" }),
    ).toBeVisible();
  });

  test("affiche la page mot de passe oublié", async ({ page }) => {
    await page.goto("/admin/mot-de-passe-oublie");
    await expect(
      page.getByRole("heading", { level: 1, name: "Mot de passe oublié" }),
    ).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test("affiche l’inscription client uniquement", async ({ page }) => {
    await page.goto("/admin/inscription");
    await expect(
      page.getByRole("heading", { name: "Inscription client" }),
    ).toBeVisible();
    await expect(page.getByText("Type de compte")).toHaveCount(0);
    await expect(page.getByRole("radio", { name: /Agent/i })).toHaveCount(0);
    await expect(page.getByText("Nom / entreprise")).toBeVisible();
  });
});
