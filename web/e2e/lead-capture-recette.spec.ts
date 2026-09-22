import { test, expect } from "@playwright/test";
import { loginAs, ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers";

/**
 * Critère Must — Capture leads site → CRM
 * Soumettre un formulaire et vérifier la création du lead sans ressaisie.
 */
test.describe("Recette Must — lead site → CRM", () => {
  test("soumission devis → lead visible dans /admin/demandes", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const stamp = Date.now();
    const email = `recette.must.${stamp}@e2e.necs.test`;
    const name = `Recette Must ${stamp}`;
    const company = `Société Recette ${stamp}`;
    const phone = "+237 699001122";
    const message =
      "Recette Must : travaux éventuels dans nos locaux — création CRM sans ressaisie.";

    await page.goto(
      "/contact?utm_source=recette&utm_campaign=must-lead&utm_medium=e2e",
    );
    await expect(
      page.getByRole("heading", { name: /Demandez votre devis/i }),
    ).toBeVisible({ timeout: 15_000 });

    const form = page.locator("form.cxf-form");
    await form.locator('input[name="name"]').fill(name);
    await form.locator('input[name="phone"]').fill(phone);
    await form.locator('input[name="company"]').fill(company);
    await form.locator('input[name="email"]').fill(email);
    await form.getByText("Professionnel", { exact: true }).click();
    const firstService = form.locator(".cxf-checks label").first();
    if (await firstService.count()) {
      await firstService.click();
    }
    await form.locator('input[name="city"]').fill("Douala");
    await form.locator('textarea[name="message"]').fill(message);
    await form.locator('input[name="consent"]').check();

    const [postRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/leads") &&
          r.request().method() === "POST" &&
          r.status() < 500,
      ),
      form.getByRole("button", { name: /Envoyer ma demande/i }).click(),
    ]);

    expect(postRes.ok()).toBeTruthy();
    const postBody = (await postRes.json()) as {
      ok?: boolean;
      created?: boolean;
      id?: string;
    };
    expect(postBody.ok).toBe(true);
    expect(postBody.created).toBe(true);

    await expect(
      page.getByRole("heading", { name: /Demande bien reçue/i }),
    ).toBeVisible({ timeout: 20_000 });

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/demandes");
    await expect(
      page.getByRole("heading", { name: /Demandes/i }),
    ).toBeVisible({ timeout: 20_000 });

    await page
      .getByRole("searchbox", { name: /Rechercher une demande/i })
      .fill(email);

    await expect(page.getByText(company).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("saisie équipe : créer un prospect depuis /admin/demandes", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const stamp = Date.now();
    const email = `staff.lead.${stamp}@e2e.necs.test`;
    const company = `Prospect Staff ${stamp}`;

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/demandes");
    await page.getByRole("button", { name: /Nouveau prospect/i }).click();

    const composer = page.locator("section.leads-composer");
    await expect(composer.getByRole("heading")).toBeVisible();

    await composer.locator('input[placeholder*="Jean Paul"]').fill(`Staff ${stamp}`);
    await composer.locator('input[placeholder*="Cabinet"]').fill(company);
    await composer.locator('input[type="email"]').fill(email);
    await composer.locator('input[placeholder*="237"]').fill("+237 600000099");
    await composer.locator('input[placeholder*="Douala"]').fill("Yaoundé");
    await composer
      .locator('textarea')
      .fill("Travaux nettoyage bureaux 250 m², 5j/7.");
    await composer.locator('input[type="checkbox"]').check();

    const [postRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/leads") &&
          r.request().method() === "POST",
      ),
      composer.getByRole("button", { name: /Enregistrer le prospect/i }).click(),
    ]);
    expect(postRes.ok()).toBeTruthy();

    await page
      .getByRole("searchbox", { name: /Rechercher une demande/i })
      .fill(email);
    await expect(page.getByText(company).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
