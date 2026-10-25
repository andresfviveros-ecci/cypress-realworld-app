import { Page } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import { getBalance, getTestData } from "../fixtures/db";
import { newSessionAs } from "../fixtures/auth";
import {
  apiSessionAs,
  createRequest,
  dollars,
  getTransaction,
  patchRequestStatus,
  saveEvidence,
} from "../fixtures/api";
import { users } from "../fixtures/test-data";

/**
 * Point 5 - State transition testing (ISTQB CTFL v4.0.1, 4.2.4) on a money request.
 *
 * States (src/models/transaction.ts, backend/database.ts):
 *   S0 Not requested -> Pending (requestStatus=pending, status=pending)
 *   Accepted (requestStatus=accepted, status=complete)
 *   Rejected (requestStatus=rejected, status=complete)
 *
 * Valid transitions:
 *   T1 S0 --create request--> Pending / notify receiver
 *   T2 Pending --accept [receiver balance >= amount]--> Accepted / debit receiver, credit sender
 *   T3 Pending --accept [receiver balance < amount]--> Accepted / bank withdrawal, balance to 0, credit sender
 *   T4 Pending --reject--> Rejected / no money moves
 * Every other cell of the state table is invalid (e.g. accepting a request that is already resolved).
 *
 * Accept/Reject only appear for the receiver while the request is pending (TransactionDetail.tsx).
 */

const kristian = users.kristian;
const heath = users.heath;

async function balances(request: Parameters<typeof getBalance>[0]) {
  return {
    sender: await getBalance(request, heath.id),
    receiver: await getBalance(request, kristian.id),
  };
}

function detailButtons(page: Page, transactionId: string) {
  return {
    accept: page.getByTestId(`transaction-accept-request-${transactionId}`),
    reject: page.getByTestId(`transaction-reject-request-${transactionId}`),
    action: page.getByTestId(`transaction-action-${transactionId}`),
  };
}

/** Heath93 requests money from Kristian through the API, checking who really sent it. */
async function heathRequestsFromKristian(page: Page, amount: number, note: string) {
  const transaction = await createRequest(page.request, kristian.id, amount, note);
  // Guards against session mix-ups: the request must come from Heath93 and go to Kristian
  expect(transaction).toMatchObject({ senderId: heath.id, receiverId: kristian.id, requestStatus: "pending" });
  return transaction;
}

/** Marks a test that fails because of a confirmed defect, so the report shows the link. */
function knownBug(description: string) {
  test.info().annotations.push({ type: "issue", description });
}

test.describe("Point 5 - State transitions of a money request", () => {
  test("TC-STATE-01 valid sequence: create request (T1) -> receiver accepts (T2)", async ({
    page,
    request,
    browser,
  }) => {
    const before = await balances(request);

    // T1: Heath93 creates the request through the UI
    await page.goto("/transaction/new");
    await page.getByPlaceholder("Search...").fill("Kristian");
    await page.getByText(kristian.fullName, { exact: true }).click();
    await page.getByPlaceholder("Amount").fill("25");
    await page.getByPlaceholder("Add a note").fill("Concert tickets");
    const created = page.waitForResponse(
      (r) => r.url().endsWith("/transactions") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Request" }).click();
    const { transaction } = await (await created).json();
    await expect(page.getByText("Requested $25.00 for Concert tickets")).toBeVisible();

    // State Pending: stored as pending and no money moved yet
    expect(transaction.requestStatus).toBe("pending");
    expect(transaction.status).toBe("pending");
    expect(await balances(request)).toEqual(before);

    // The receiver sees the pending request with both controls
    const receiver = await newSessionAs(browser, kristian);
    await receiver.page.goto(`/transaction/${transaction.id}`);
    const ui = detailButtons(receiver.page, transaction.id);
    await expect(ui.action).toHaveText("requested");
    await expect(ui.accept).toBeVisible();
    await expect(ui.reject).toBeVisible();
    await receiver.page.screenshot({ path: "docs/evidencias/p5-tc01-pending-receiver-view.png" });

    // T2: accept with enough balance ($930.26 >= $25.00)
    await ui.accept.click();

    // State Accepted: controls gone, title says "charged", backend complete, money moved
    await expect(ui.accept).toHaveCount(0);
    await expect(ui.reject).toHaveCount(0);
    await expect(ui.action).toHaveText("charged");
    await receiver.page.screenshot({ path: "docs/evidencias/p5-tc01-accepted.png" });

    const stored = await getTransaction(receiver.page.request, transaction.id);
    expect(stored.requestStatus).toBe("accepted");
    expect(stored.status).toBe("complete");
    expect(await balances(request)).toEqual({
      sender: before.sender + 2500,
      receiver: before.receiver - 2500,
    });
    await receiver.context.close();
  });

  test("TC-STATE-02 valid: receiver rejects a pending request (T4) and no money moves", async ({
    page,
    request,
    browser,
  }) => {
    knownBug("BUG-002: rejecting a request moves the money as if it were accepted");
    const transaction = await heathRequestsFromKristian(page, 25, "Shared taxi");
    const before = await balances(request);

    const receiver = await newSessionAs(browser, kristian);
    await receiver.page.goto(`/transaction/${transaction.id}`);
    const ui = detailButtons(receiver.page, transaction.id);
    await expect(ui.reject).toBeVisible();

    const patch = receiver.page.waitForResponse(
      (r) => r.url().endsWith(`/transactions/${transaction.id}`) && r.request().method() === "PATCH"
    );
    await ui.reject.click();
    const patchResponse = await patch;

    // State Rejected: controls gone and the backend stores "rejected"
    await expect(ui.accept).toHaveCount(0);
    await expect(ui.reject).toHaveCount(0);
    await receiver.page.screenshot({ path: "docs/evidencias/p5-tc02-rejected.png" });
    const stored = await getTransaction(receiver.page.request, transaction.id);
    expect(stored.requestStatus).toBe("rejected");

    const after = await balances(request);
    saveEvidence("bug-002-reject-moves-money.json", {
      transactionId: transaction.id,
      amount: dollars(transaction.amount),
      request: {
        method: "PATCH",
        url: patchResponse.url(),
        body: patchResponse.request().postDataJSON(),
      },
      response: { status: patchResponse.status() },
      storedAfter: { requestStatus: stored.requestStatus, status: stored.status },
      balances: {
        before: { [heath.username]: dollars(before.sender), [kristian.username]: dollars(before.receiver) },
        after: { [heath.username]: dollars(after.sender), [kristian.username]: dollars(after.receiver) },
      },
    });

    // Expected (T4): rejecting must not move money
    expect(after).toEqual(before);
    await receiver.context.close();
  });

  test("TC-STATE-03 valid: accept with insufficient balance (T3) uses a bank withdrawal", async ({
    page,
    request,
    browser,
  }) => {
    // $1,000.00 is more than Kristian's seed balance of $930.26
    const transaction = await heathRequestsFromKristian(page, 1000, "New laptop");
    const before = await balances(request);
    const transfersBefore = await getTestData(request, "banktransfers");

    const receiver = await newSessionAs(browser, kristian);
    await receiver.page.goto(`/transaction/${transaction.id}`);
    const ui = detailButtons(receiver.page, transaction.id);
    await ui.accept.click();
    await expect(ui.action).toHaveText("charged");

    const transfersAfter = await getTestData<{ userId: string; type: string; transactionId: string }>(
      request,
      "banktransfers"
    );
    const withdrawal = transfersAfter.find((t) => t.transactionId === transaction.id);
    expect(transfersAfter.length).toBe(transfersBefore.length + 1);
    expect(withdrawal).toMatchObject({ userId: kristian.id, type: "withdrawal" });
    expect(await balances(request)).toEqual({ sender: before.sender + 100000, receiver: 0 });
    await receiver.context.close();
  });

  test("TC-STATE-04 invalid via UI: an accepted request offers no Accept/Reject", async ({
    page,
    browser,
  }) => {
    const transaction = await heathRequestsFromKristian(page, 25, "Pizza night");
    const receiverApi = await apiSessionAs(kristian);
    expect((await patchRequestStatus(receiverApi, transaction.id, "accepted")).response.status()).toBe(204);

    const receiver = await newSessionAs(browser, kristian);
    await receiver.page.goto(`/transaction/${transaction.id}`);
    const ui = detailButtons(receiver.page, transaction.id);

    // The request is resolved, so the UI must not offer a second transition
    await expect(ui.action).toHaveText("charged");
    await expect(ui.accept).toHaveCount(0);
    await expect(ui.reject).toHaveCount(0);
    await receiver.page.screenshot({ path: "docs/evidencias/p5-tc04-invalid-ui-no-buttons.png" });
    await receiver.context.close();
    await receiverApi.dispose();
  });

  test("TC-STATE-05 invalid via API: accepting an already accepted request again", async ({
    page,
    request,
  }) => {
    knownBug("BUG-003: the API changes the status of a request that is already resolved (204)");
    const transaction = await heathRequestsFromKristian(page, 25, "Gym pass");
    const receiverApi = await apiSessionAs(kristian);
    await patchRequestStatus(receiverApi, transaction.id, "accepted");
    const before = await balances(request);

    // Invalid transition Accepted --accept-->
    const { response, record } = await patchRequestStatus(receiverApi, transaction.id, "accepted");
    const after = await balances(request);
    saveEvidence("bug-003-accept-twice.json", {
      ...record,
      balances: {
        before: { [heath.username]: dollars(before.sender), [kristian.username]: dollars(before.receiver) },
        after: { [heath.username]: dollars(after.sender), [kristian.username]: dollars(after.receiver) },
      },
    });

    // Expected: the backend refuses the transition and no money moves again
    expect.soft(response.status(), "status for a resolved request").toBeGreaterThanOrEqual(400);
    expect(after).toEqual(before);
    await receiverApi.dispose();
  });

  test("TC-STATE-06 invalid via API: accepting a request that was rejected", async ({
    page,
    request,
  }) => {
    knownBug("BUG-003: the API changes the status of a request that is already resolved (204)");
    const transaction = await heathRequestsFromKristian(page, 25, "Book club");
    const receiverApi = await apiSessionAs(kristian);
    await patchRequestStatus(receiverApi, transaction.id, "rejected");
    const before = await balances(request);

    // Invalid transition Rejected --accept-->
    const { response, record } = await patchRequestStatus(receiverApi, transaction.id, "accepted");
    const after = await balances(request);
    const stored = await getTransaction(receiverApi, transaction.id);
    saveEvidence("bug-003-accept-after-reject.json", {
      ...record,
      storedAfter: { requestStatus: stored.requestStatus, status: stored.status },
      balances: {
        before: { [heath.username]: dollars(before.sender), [kristian.username]: dollars(before.receiver) },
        after: { [heath.username]: dollars(after.sender), [kristian.username]: dollars(after.receiver) },
      },
    });

    // Expected: a rejected request stays rejected and nobody is charged
    expect.soft(response.status(), "status for a resolved request").toBeGreaterThanOrEqual(400);
    expect.soft(stored.requestStatus).toBe("rejected");
    expect(after).toEqual(before);
    await receiverApi.dispose();
  });

  test("guard check via API: the requester cannot accept their own request", async ({
    page,
    request,
  }) => {
    knownBug("BUG-004: the requester can accept their own request; the API does not check who resolves it");
    const transaction = await heathRequestsFromKristian(page, 25, "Dinner split");
    const before = await balances(request);

    // Heath93 (the sender of the request) tries to approve the charge to Kristian
    const { response, record } = await patchRequestStatus(page.request, transaction.id, "accepted");
    const after = await balances(request);
    const stored = await getTransaction(page.request, transaction.id);
    saveEvidence("bug-004-requester-accepts-own-request.json", {
      actor: heath.username,
      ...record,
      storedAfter: { requestStatus: stored.requestStatus, status: stored.status },
      balances: {
        before: { [heath.username]: dollars(before.sender), [kristian.username]: dollars(before.receiver) },
        after: { [heath.username]: dollars(after.sender), [kristian.username]: dollars(after.receiver) },
      },
    });

    // Expected: only the receiver may resolve the request
    expect.soft(response.status(), "status when the sender accepts").toBeGreaterThanOrEqual(400);
    expect.soft(stored.requestStatus).toBe("pending");
    expect(after).toEqual(before);
  });
});
