import { Browser, BrowserContext, Page, expect } from "@playwright/test";
import { SeedUser } from "./test-data";

/**
 * Logs in through the sign-in form.
 * An API-only login is not enough in RWA: the UI keeps its auth state in
 * localStorage ("authState"), so the form is the reliable way to get both
 * the session cookie and the client state.
 */
export async function loginViaUi(page: Page, user: SeedUser) {
  await page.goto("/signin");
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByTestId("sidenav-username")).toHaveText(`@${user.username}`);
}

/**
 * Opens a separate browser context logged in as another user.
 * Used in point 5, where the request receiver has to act on the request.
 */
export async function newSessionAs(
  browser: Browser,
  user: SeedUser
): Promise<{ context: BrowserContext; page: Page }> {
  // Start without cookies so the login never reuses another user's session
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await loginViaUi(page, user);
  return { context, page };
}
