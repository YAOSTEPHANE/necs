import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

test.describe("Inscription client", () => {
  test("crée un compte client puis demande la confirmation de l’e-mail", async ({ page }) => {
    const email = uniqueEmail("client");
    const password = "ClientTest2026!";

    await page.goto("/admin/inscription");
    await expect(
      page.getByRole("heading", { name: "Inscription client" }),
    ).toBeVisible();

    await page.locator('input[name="name"]').fill("E2E Client SARL");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="phone"]').fill("+237 600000001");
    await page.getByRole("button", { name: "Continuer" }).click();

    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirm"]').fill(password);
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: "Créer mon compte client" }).click();

    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 25_000 });

    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText(/Adresse e-mail non confirmée/i)).toBeVisible({
      timeout: 20_000,
    });
  });
});
