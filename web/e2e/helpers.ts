import { test, expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL || "direction@necs.cm";
export const ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD || "NecsAdmin2026!";

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}@e2e.necs.test`;
}

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function logoutIfNeeded(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/admin/login");
  await page.evaluate(() => {
    try {
      localStorage.removeItem("necs_admin_session_v1");
    } catch {
      /* ignore */
    }
  });
  await page.reload();
}
