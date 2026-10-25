import fs from "fs";
import path from "path";
import { APIRequestContext, APIResponse, expect, request as playwrightRequest } from "@playwright/test";
import { API_URL, SeedUser } from "./test-data";

/**
 * API client with its own session cookie (POST /login, same call as Cypress loginByApi).
 * Inside the test runner, request.newContext() inherits the project's storageState, so it
 * must start without cookies. Otherwise the login reuses Heath93's session (passport 0.5
 * does not regenerate the session on login) and that session silently becomes this user's.
 */
export async function apiSessionAs(user: SeedUser): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({
    baseURL: API_URL,
    storageState: { cookies: [], origins: [] },
  });
  const response = await context.post(`${API_URL}/login`, {
    data: { username: user.username, password: user.password },
  });
  expect(response, `API login as ${user.username}`).toBeOK();
  return context;
}

/** Creates a money request from the logged-in user to receiverId (amount in dollars). */
export async function createRequest(
  api: APIRequestContext,
  receiverId: string,
  amount: number,
  description: string
) {
  const response = await api.post(`${API_URL}/transactions`, {
    data: { transactionType: "request", receiverId, amount, description },
  });
  expect(response, "request creation").toBeOK();
  return (await response.json()).transaction;
}

export async function getTransaction(api: APIRequestContext, transactionId: string) {
  const response = await api.get(`${API_URL}/transactions/${transactionId}`);
  expect(response).toBeOK();
  return (await response.json()).transaction;
}

/** Sends the same PATCH the Accept/Reject buttons send and returns a log-friendly record. */
export async function patchRequestStatus(
  api: APIRequestContext,
  transactionId: string,
  requestStatus: string
): Promise<{ response: APIResponse; record: object }> {
  const url = `${API_URL}/transactions/${transactionId}`;
  const body = { requestStatus };
  const response = await api.patch(url, { data: body });
  const text = await response.text();
  return {
    response,
    record: {
      request: { method: "PATCH", url, body },
      response: { status: response.status(), statusText: response.statusText(), body: text },
    },
  };
}

/** Writes a JSON evidence file to docs/evidencias/. */
export function saveEvidence(fileName: string, data: unknown) {
  const target = path.join("docs", "evidencias", fileName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(data, null, 2));
}

/** Formats cents as dollars for evidence files and logs. */
export const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
