import { APIRequestContext, expect } from "@playwright/test";
import { API_URL } from "./test-data";

/**
 * Resets the backend database to data/database-seed.json.
 * Same call as the Cypress task "db:seed" in cypress.config.ts (POST /testData/seed),
 * which only exists when the API runs with NODE_ENV=development or test.
 */
export async function seedDatabase(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/testData/seed`);
  expect(response, "database seed should succeed").toBeOK();
}

/** Reads one entity table through the test data API (GET /testData/:entity). */
export async function getTestData<T = any>(request: APIRequestContext, entity: string): Promise<T[]> {
  const response = await request.get(`${API_URL}/testData/${entity}`);
  expect(response).toBeOK();
  const { results } = await response.json();
  return results;
}

/** Current balance in cents for a user, read from the backend. */
export async function getBalance(request: APIRequestContext, userId: string): Promise<number> {
  const allUsers = await getTestData<{ id: string; balance: number }>(request, "users");
  const user = allUsers.find((u) => u.id === userId);
  if (!user) throw new Error(`User ${userId} not found in test data`);
  return user.balance;
}
