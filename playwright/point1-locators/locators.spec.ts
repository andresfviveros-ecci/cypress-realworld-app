import { test, expect } from "../fixtures/test";
import { users } from "../fixtures/test-data";

/**
 * Point 1 - Locators.
 * Four RWA elements, each found with the strategy that fits it best,
 * plus a strictness demo. Every locator gets one assertion that proves
 * it resolved to the intended element.
 */
test.describe("Point 1 - Locators", () => {
  test("E1 getByRole: New transaction button in the top bar", async ({ page }) => {
    await page.goto("/");

    // Role + accessible name is how a user (or screen reader) identifies this control
    const newButton = page.getByRole("link", { name: "New" });

    await expect(newButton).toBeVisible();
    await expect(newButton).toHaveAttribute("href", "/transaction/new");
    await page.screenshot({ path: "docs/evidencias/p1-e1-getbyrole-new-button.png" });
  });

  test("E2 getByPlaceholder: contact search field", async ({ page }) => {
    await page.goto("/transaction/new");

    // The field has no visible label, only the placeholder "Search..."
    const searchField = page.getByPlaceholder("Search...");

    await expect(searchField).toBeEditable();
    await expect(searchField).toHaveAttribute("name", "q");
  });

  test("E3 getByText: recipient Kristian Bradtke in the contact list", async ({ page }) => {
    await page.goto("/transaction/new");

    // The user picks the recipient by reading the full name in the list
    const recipient = page.getByText(users.kristian.fullName, { exact: true });

    await expect(recipient).toBeVisible();
    await expect(page.getByTestId(`user-list-item-${users.kristian.id}`)).toContainText(
      users.kristian.fullName
    );
    await page.screenshot({ path: "docs/evidencias/p1-e2-e3-placeholder-and-text.png" });
  });

  test("E4 getByTestId: account balance in the side menu", async ({ page }) => {
    await page.goto("/");

    // The balance is plain text with no role or label, so the data-test contract fits best
    const balance = page.getByTestId("sidenav-user-balance");

    // $1,509.53 is Heath93's balance in data/database-seed.json (150953 cents)
    await expect(balance).toHaveText("$1,509.53");
    await page.screenshot({ path: "docs/evidencias/p1-e4-getbytestid-balance.png" });
  });

  test("CSS locator compared with a user-facing locator for the Mine tab", async ({ page }) => {
    await page.goto("/");

    const cssLocator = page.locator('[data-test="nav-transaction-tabs"] a[href="/personal"]');
    const roleLocator = page.getByRole("tab", { name: "Mine" });

    // Both point to the same element, but the CSS one depends on markup details
    await expect(cssLocator).toHaveText("Mine");
    await expect(roleLocator).toHaveText("Mine");
  });

  test("strictness: an ambiguous locator fails and a precise one fixes it", async ({ page }) => {
    await page.goto("/");

    // Three tabs (Everyone, Friends, Mine) match the bare role
    const ambiguous = page.getByRole("tab");
    await expect(ambiguous).toHaveCount(3);

    const error = await ambiguous.click({ timeout: 2_000 }).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("strict mode violation");
    // Keep the real error text in the run log as evidence
    console.log(`[strictness] ${(error as Error).message.split("\n").slice(0, 5).join(" | ")}`);

    // Fix: narrow the locator with the accessible name
    const mineTab = page.getByRole("tab", { name: "Mine" });
    await mineTab.click();
    await expect(page).toHaveURL(/\/personal$/);
    await expect(mineTab).toHaveAttribute("aria-selected", "true");
    // Wait for the personal list so the screenshot shows the finished tab change
    await expect(page.getByText("Personal", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/p1-strictness-fixed-mine-tab.png" });
  });
});
