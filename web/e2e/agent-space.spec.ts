import { test, expect } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  loginAs,
  logoutIfNeeded,
  uniqueEmail,
} from "./helpers";

test.describe("Espace agent (création admin)", () => {
  test("admin crée un agent, l’agent accède à mon-espace", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const email = uniqueEmail("agent");
    const password = "AgentTest2026!";
    const name = "E2E Agent Terrain";

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).not.toHaveURL(/\/admin\/login/, { timeout: 20_000 });

    await page.goto("/admin/utilisateurs");
    await expect(
      page.getByRole("heading", { name: /Utilisateurs/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "+ Agent terrain" }).click();
    await expect(
      page.getByRole("heading", { name: "Nouvel utilisateur" }),
    ).toBeVisible();

    const form = page.locator(".settings-user-form");
    await form.getByPlaceholder("Ex. Amina Moussa").fill(name);
    await form.getByPlaceholder("prenom@necs.cm").fill(email);
    await form.locator('input[type="password"]').fill(password);
    await form.getByRole("button", { name: "Créer le compte" }).click();

    await expect(page.getByText(email).first()).toBeVisible({ timeout: 20_000 });

    await logoutIfNeeded(page);
    await loginAs(page, email, password);

    await expect(page).toHaveURL(/\/admin\/mon-espace/, { timeout: 20_000 });
    await expect(
      page.getByText(/Espace agent|Parcours du jour|Pointage mobile/i).first(),
    ).toBeVisible();
  });
});
