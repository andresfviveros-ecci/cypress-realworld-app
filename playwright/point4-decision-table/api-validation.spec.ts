import { test, expect } from "../fixtures/test";
import { getBalance } from "../fixtures/db";
import { dollars, saveEvidence } from "../fixtures/api";
import { API_URL, users } from "../fixtures/test-data";

/**
 * Point 4 - same business rule checked at the API layer (POST /transactions).
 * The UI is not the only way in: backend/validators.ts must enforce CA-02 and CA-03 too.
 */
const cases = [
  {
    id: "TC-TRANS-017",
    title: "amount 0 is rejected by the API (CA-02)",
    payload: { amount: 0, description: "QA zero amount test" },
    evidence: "bug-001-api-zero-amount.json",
    knownBug: "BUG-001: POST /transactions accepts amount 0",
  },
  {
    id: "TC-TRANS-018",
    title: "empty note is rejected by the API (CA-03)",
    payload: { amount: 10, description: "" },
    evidence: "bug-005-api-empty-note.json",
    knownBug: "BUG-005: POST /transactions accepts an empty note",
  },
];

test.describe("Point 4 - API validation of the payment rule", () => {
  for (const c of cases) {
    test(`${c.id}: ${c.title}`, async ({ page, request }) => {
      test.info().annotations.push({ type: "issue", description: c.knownBug });
      const before = {
        sender: await getBalance(request, users.heath.id),
        receiver: await getBalance(request, users.kristian.id),
      };

      const body = { transactionType: "payment", receiverId: users.kristian.id, ...c.payload };
      const response = await page.request.post(`${API_URL}/transactions`, { data: body });
      const responseBody = await response.text();

      const after = {
        sender: await getBalance(request, users.heath.id),
        receiver: await getBalance(request, users.kristian.id),
      };
      saveEvidence(c.evidence, {
        actor: users.heath.username,
        request: { method: "POST", url: `${API_URL}/transactions`, body },
        response: { status: response.status(), body: JSON.parse(responseBody || "null") },
        balances: {
          before: { [users.heath.username]: dollars(before.sender), [users.kristian.username]: dollars(before.receiver) },
          after: { [users.heath.username]: dollars(after.sender), [users.kristian.username]: dollars(after.receiver) },
        },
      });

      // Expected: a validation error and no transaction stored
      expect(response.status(), "API should answer 400 Bad Request").toBe(400);
    });
  }
});
