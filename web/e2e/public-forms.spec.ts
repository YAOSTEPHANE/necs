import { test, expect } from "@playwright/test";

function uniquePublicEmail(prefix: string): string {
  return `${prefix}.${Date.now()}@e2e.public.necs.test`;
}

test.describe("Formulaires page publique", () => {
  test("accueil : ouvrir le devis modal et envoyer", async ({ page }) => {
    test.setTimeout(90_000);
    const email = uniquePublicEmail("devis-home");

    await page.goto("/");
    await page
      .getByRole("button", { name: /Demander un devis|Ouvrir le formulaire/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: /Demande de devis/i }),
    ).toBeVisible();

    await dialog.locator("#modal-name").fill("Jean Paul E2E");
    await dialog.locator("#modal-company").fill("Cabinet E2E Douala");
    await dialog.locator("#modal-email").fill(email);
    await dialog.locator("#modal-phone").fill("+237 600000010");
    await dialog.locator("#modal-subject").selectOption("Visite technique");
    await dialog
      .locator("#modal-message")
      .fill("Besoin d’une visite technique pour 300 m² de bureaux à Bonanjo.");
    await dialog.locator('input[name="consent"]').check();

    await dialog.getByRole("button", { name: "Envoyer ma demande" }).click();

    await expect(
      dialog.getByRole("heading", { name: /Demande bien reçue/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("contact : formulaire devis complet", async ({ page }) => {
    test.setTimeout(90_000);
    const email = uniquePublicEmail("devis-contact");

    await page.goto("/contact");
    await expect(
      page.getByRole("heading", { name: /Demandez votre devis/i }),
    ).toBeVisible({ timeout: 15_000 });

    const form = page.locator("form.cxf-form");
    await form.locator('input[name="name"]').fill("Marie E2E Contact");
    await form.locator('input[name="phone"]').fill("+237 600000011");
    await form.locator('input[name="company"]').fill("Société E2E SA");
    await form.locator('input[name="email"]').fill(email);

    await form.getByText("Professionnel", { exact: true }).click();
    const firstService = form.locator(".cxf-checks label").first();
    if (await firstService.count()) {
      await firstService.click();
    }

    await form.locator('input[name="city"]').fill("Douala");
    await form
      .locator('textarea[name="message"]')
      .fill("Entretien quotidien de bureaux, 5j/7, environ 200 m².");
    await form.locator('input[name="consent"]').check();

    await form.getByRole("button", { name: /Envoyer|Demander/i }).click();

    await expect(
      page.getByRole("heading", { name: /Demande bien reçue/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("accueil : validation champs obligatoires du modal", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: /Demander un devis|Ouvrir le formulaire/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Envoyer ma demande" }).click();

    // HTML5 required : le modal reste ouvert, pas de succès
    await expect(
      dialog.getByRole("heading", { name: /Demande de devis/i }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /Demande bien reçue/i }),
    ).toHaveCount(0);

    const nameValidity = await dialog
      .locator("#modal-name")
      .evaluate((el: HTMLInputElement) => el.validity.valueMissing);
    expect(nameValidity).toBe(true);
  });

  test("contact : validation champs obligatoires", async ({ page }) => {
    await page.goto("/contact");
    const form = page.locator("form.cxf-form");
    await expect(form).toBeVisible({ timeout: 15_000 });

    await form.getByRole("button", { name: /Envoyer|Demander/i }).click();

    await expect(
      page.getByRole("heading", { name: /Demande bien reçue/i }),
    ).toHaveCount(0);

    const nameMissing = await form
      .locator('input[name="name"]')
      .evaluate((el: HTMLInputElement) => el.validity.valueMissing);
    expect(nameMissing).toBe(true);
  });
});
