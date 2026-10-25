import { test, expect } from "./fixtures/test";
import { users } from "./fixtures/test-data";

test("smoke: logged-in user sees the New button", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("sidenav-username")).toHaveText(`@${users.heath.username}`);
  await expect(page.getByTestId("nav-top-new-transaction")).toBeVisible();
});
