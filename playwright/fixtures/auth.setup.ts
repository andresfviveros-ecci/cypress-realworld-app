import { test as setup } from "@playwright/test";
import { seedDatabase } from "./db";
import { loginViaUi } from "./auth";
import { HEATH_STORAGE_STATE, users } from "./test-data";

setup("log in as Heath93 and store the session", async ({ page, request }) => {
  await seedDatabase(request);
  await loginViaUi(page, users.heath);
  // Saves the connect.sid cookie and the localStorage authState used by the UI
  await page.context().storageState({ path: HEATH_STORAGE_STATE });
});
