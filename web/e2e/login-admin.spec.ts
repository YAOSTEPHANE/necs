import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAs } from "./helpers";

test.describe("Connexion admin", () => {
  test("connecte l’administrateur bootstrap", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/admin\/login/);
  });

  test("refuse un mauvais mot de passe", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, "WrongPass999!");
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
