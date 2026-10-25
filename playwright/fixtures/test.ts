import { test as base, expect } from "@playwright/test";
import { seedDatabase } from "./db";

/**
 * Base test for the workshop specs: every test starts from the seed data,
 * like the Cypress specs do with cy.task("db:seed") in beforeEach.
 */
export const test = base.extend<{ seededDb: void }>({
  seededDb: [
    async ({ request }, use) => {
      await seedDatabase(request);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
