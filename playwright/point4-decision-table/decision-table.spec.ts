import { Page } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import { getTestData } from "../fixtures/db";
import { users } from "../fixtures/test-data";

/**
 * Point 4 - Decision table testing (ISTQB CTFL v4.0.1, 4.2.3).
 *
 * Business rule (HU-TRANSACCION-001, CA-01..CA-03): a payment can only be confirmed when
 *   C1 a recipient is selected,
 *   C2 the amount is valid (> 0) - extended entry: empty | zero | positive,
 *   C3 the note is not empty.
 * Actions: A1 Pay enabled, A2 amount error shown, A3 note error shown, A4 transaction created.
 *
 * Without a recipient (C1 = F) the payment form is never rendered, so C2 and C3 are "-" and
 * those six combinations collapse into R1. That leaves 7 feasible columns, all automated here.
 */

type AmountEntry = "empty" | "zero" | "positive";

type Rule = {
  id: string;
  testCase: string;
  recipient: boolean;
  amount: AmountEntry | "-";
  note: boolean | "-";
  expected: {
    payEnabled: boolean;
    amountError: boolean;
    noteError: boolean;
    transactionCreated: boolean;
  };
  knownDefect?: string;
};

const AMOUNT_ERROR = "Please enter a valid amount";
const NOTE_ERROR = "Please enter a note";
const NOTE_TEXT = "Sushi dinner";

const rules: Rule[] = [
  {
    id: "R1",
    testCase: "TC-TRANS-010",
    recipient: false,
    amount: "-",
    note: "-",
    expected: { payEnabled: false, amountError: false, noteError: false, transactionCreated: false },
  },
  {
    id: "R2",
    testCase: "TC-TRANS-011",
    recipient: true,
    amount: "positive",
    note: true,
    expected: { payEnabled: true, amountError: false, noteError: false, transactionCreated: true },
  },
  {
    id: "R3",
    testCase: "TC-TRANS-012",
    recipient: true,
    amount: "positive",
    note: false,
    expected: { payEnabled: false, amountError: false, noteError: true, transactionCreated: false },
  },
  {
    id: "R4",
    testCase: "TC-TRANS-013",
    recipient: true,
    amount: "empty",
    note: true,
    expected: { payEnabled: false, amountError: true, noteError: false, transactionCreated: false },
  },
  {
    id: "R5",
    testCase: "TC-TRANS-014",
    recipient: true,
    amount: "zero",
    note: true,
    // CA-02: amount must be greater than 0, so zero has to be rejected like an empty amount
    expected: { payEnabled: false, amountError: true, noteError: false, transactionCreated: false },
    knownDefect: "BUG-001: amount 0 is accepted; Pay is enabled and POST /transactions returns 200",
  },
  {
    id: "R6",
    testCase: "TC-TRANS-015",
    recipient: true,
    amount: "empty",
    note: false,
    expected: { payEnabled: false, amountError: true, noteError: true, transactionCreated: false },
  },
  {
    id: "R7",
    testCase: "TC-TRANS-016",
    recipient: true,
    amount: "zero",
    note: false,
    expected: { payEnabled: false, amountError: true, noteError: true, transactionCreated: false },
    knownDefect: "BUG-001: amount 0 is not flagged as invalid (no amount error)",
  },
];

/** Types a value, or touches and leaves the field empty so Formik shows its validation. */
async function setField(page: Page, placeholder: string, value: string | null) {
  const field = page.getByPlaceholder(placeholder);
  if (value === null) {
    await field.click();
    await field.press("Tab");
  } else {
    await field.fill(value);
  }
}

const amountValue: Record<AmountEntry, string | null> = { empty: null, zero: "0", positive: "35" };

test.describe("Point 4 - Decision table: confirm a payment", () => {
  for (const rule of rules) {
    const title = `${rule.id} ${rule.testCase}: recipient=${rule.recipient ? "T" : "F"}, amount=${rule.amount}, note=${rule.note === "-" ? "-" : rule.note ? "T" : "F"}`;

    test(title, async ({ page, request }) => {
      if (rule.knownDefect) {
        test.info().annotations.push({ type: "issue", description: rule.knownDefect });
      }
      const transactionsBefore = (await getTestData(request, "transactions")).length;

      await page.goto("/transaction/new");
      const payButton = page.getByRole("button", { name: "Pay" });

      if (!rule.recipient) {
        // R1: without a recipient the wizard stays on "Select Contact"; the form does not exist
        await expect(page.getByTestId("users-list")).toBeVisible();
        await expect(payButton).toHaveCount(0);
        await expect(page.getByPlaceholder("Amount")).toHaveCount(0);
        await page.screenshot({ path: `docs/evidencias/p4-${rule.id.toLowerCase()}-no-recipient.png` });
      } else {
        await page.getByText(users.kristian.fullName, { exact: true }).click();
        await setField(page, "Amount", amountValue[rule.amount as AmountEntry]);
        await setField(page, "Add a note", rule.note ? NOTE_TEXT : null);

        // A2 / A3: validation messages
        const amountError = page.getByText(AMOUNT_ERROR);
        const noteError = page.getByText(NOTE_ERROR);
        if (rule.expected.amountError) await expect.soft(amountError).toBeVisible();
        else await expect.soft(amountError).toBeHidden();
        if (rule.expected.noteError) await expect.soft(noteError).toBeVisible();
        else await expect.soft(noteError).toBeHidden();

        // A1: Pay enabled or disabled
        if (rule.expected.payEnabled) await expect(payButton).toBeEnabled();
        else await expect.soft(payButton).toBeDisabled();

        // Taken after the checks so the button has finished its enabled/disabled transition
        await page.screenshot({
          path: `docs/evidencias/p4-${rule.id.toLowerCase()}-${rule.amount}-amount-note-${rule.note ? "t" : "f"}.png`,
        });

        // A4: try to confirm. If Pay is (wrongly) enabled, clicking shows whether a transaction is stored.
        if (await payButton.isEnabled()) {
          await payButton.click();
          if (rule.expected.transactionCreated) {
            await expect(page.getByText(`Paid $35.00 for ${NOTE_TEXT}`)).toBeVisible();
          } else {
            await page.screenshot({
              path: `docs/evidencias/p4-${rule.id.toLowerCase()}-zero-amount-bug.png`,
            });
          }
        }
      }

      const transactionsAfter = (await getTestData(request, "transactions")).length;
      // A4: transaction created only when the rule says so
      expect(transactionsAfter - transactionsBefore).toBe(rule.expected.transactionCreated ? 1 : 0);
    });
  }
});
