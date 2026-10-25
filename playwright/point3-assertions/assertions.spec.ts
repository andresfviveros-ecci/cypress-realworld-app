import { test, expect } from "../fixtures/test";
import { getBalance } from "../fixtures/db";
import { API_URL, users } from "../fixtures/test-data";

/**
 * Point 3 - Assertions.
 * Same flow as point 2 (TC-TRANS-001 of HU-TRANSACCION-001), now with assertions
 * that check each expected result of the test case.
 */
test.describe("Point 3 - Assertions", () => {
  test("payment flow with state, text/value, page, API and negative/generic assertions", async ({
    page,
    request,
  }) => {
    const initialBalance = await getBalance(request, users.heath.id);

    await page.goto("/");
    // (c) page: the app is loaded under its real title
    await expect(page).toHaveTitle("Cypress Real World App");

    await page.getByRole("link", { name: "New" }).click();
    // (c) page: the New button leads to the wizard route
    await expect(page).toHaveURL(/\/transaction\/new$/);

    await page.getByPlaceholder("Search...").fill("Kristian");
    // structure: the search narrows the list to a single contact
    await expect(page.getByTestId("users-list").getByRole("listitem")).toHaveCount(1);
    await page.getByText(users.kristian.fullName, { exact: true }).click();

    const payButton = page.getByRole("button", { name: "Pay" });
    // (a) state: Pay stays disabled while amount and note are empty (CA-02, CA-03)
    await expect(payButton).toBeDisabled();

    await page.getByPlaceholder("Amount").fill("35");
    await page.getByPlaceholder("Add a note").fill("Sushi dinner");

    // (b) value: the amount field shows the formatted value the user typed
    await expect(page.getByPlaceholder("Amount")).toHaveValue("$35");
    // (a) state: with valid data Pay becomes enabled
    await expect(payButton).toBeEnabled();
    // (d) negative: no validation error is shown for valid data
    await expect(page.getByText("Please enter a valid amount")).not.toBeVisible();

    const responsePromise = page.waitForResponse(
      (r) => r.url().endsWith("/transactions") && r.request().method() === "POST"
    );
    await payButton.click();
    const response = await responsePromise;

    // (d) generic: the browser's POST /transactions got a 2xx status.
    // toBeOK() only accepts an APIResponse, so a page Response is checked with ok().
    expect(response.ok()).toBe(true);
    const { transaction } = await response.json();
    // (d) generic: the stored transaction has the amount in cents and the note
    expect(transaction.amount).toBe(3500);
    expect(transaction.description).toEqual("Sushi dinner");

    // soft: the snackbar message is checked without stopping the test if it fails (CA-05)
    await expect.soft(page.getByText("Transaction Submitted!")).toBeVisible();
    // (b) text: the confirmation step names amount and note (CA-05)
    await expect(page.getByText("Paid $35.00 for Sushi dinner")).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/p3-assertions-confirmation.png" });

    // (b) text: the side menu balance went down by $35.00 (CA-04)
    await expect(page.getByTestId("sidenav-user-balance")).toHaveText("$1,474.53");
    // (d) generic: the backend balance matches the debit
    expect(await getBalance(request, users.heath.id)).toBe(initialBalance - 3500);

    // API: with the user's session the new transaction can be read back (CA-04)
    const apiResponse = await page.request.get(`${API_URL}/transactions/${transaction.id}`);
    await expect(apiResponse).toBeOK();
    expect((await apiResponse.json()).transaction.status).toBe("complete");
  });
});
