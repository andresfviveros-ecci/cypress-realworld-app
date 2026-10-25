import { test, expect } from "../fixtures/test";
import { users } from "../fixtures/test-data";

/**
 * Point 2 - Actions.
 * Short payment flow with five different actions: click, fill, press, hover and check.
 *
 * fill() vs pressSequentially(): the contact search (UserListSearchForm.tsx) reacts to the
 * input's change event and debounces the request by 200 ms (TransactionCreateContainer.tsx),
 * so it does not need per-key events. The amount and note fields are Formik inputs that also
 * read the final value. fill() is enough everywhere, so pressSequentially() is not used.
 */
test.describe("Point 2 - Actions", () => {
  test("payment flow: New -> search contact -> pick recipient -> amount and note -> Pay", async ({
    page,
  }) => {
    await page.goto("/");

    // click(): open the new transaction wizard
    await page.getByRole("link", { name: "New" }).click();

    // fill(): search the contact list
    await page.getByPlaceholder("Search...").fill("Kristian");

    // click(): choose the recipient
    await page.getByText(users.kristian.fullName, { exact: true }).click();

    // fill(): amount and note
    await page.getByPlaceholder("Amount").fill("35");
    await page.getByPlaceholder("Add a note").fill("Sushi dinner");

    // press(): leave the note field with Tab, as a keyboard user would
    await page.getByPlaceholder("Add a note").press("Tab");

    // hover(): move the pointer over Pay before clicking it
    const payButton = page.getByRole("button", { name: "Pay" });
    await payButton.hover();
    await page.screenshot({ path: "docs/evidencias/p2-flow-form-filled.png" });

    // click(): submit the payment
    await payButton.click();

    // Minimal end check so the flow is known to have finished; point 3 adds the real assertions
    await expect(page.getByText("Transaction Submitted!")).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/p2-flow-payment-submitted.png" });
  });

  test.describe("signed out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("check(): Remember me checkbox on the sign-in form", async ({ page }) => {
      await page.goto("/signin");

      const rememberMe = page.getByRole("checkbox", { name: "Remember me" });
      await rememberMe.check();

      await expect(rememberMe).toBeChecked();
    });
  });
});
