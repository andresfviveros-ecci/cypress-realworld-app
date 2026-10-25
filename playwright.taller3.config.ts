import { defineConfig, devices } from "@playwright/test";
import { HEATH_STORAGE_STATE } from "./playwright/fixtures/test-data";

/**
 * Playwright config for "Taller investigativo tercer corte".
 * The app is started separately (docker compose), so there is no webServer block.
 * The BVA exercise keeps using playwright.config.ts.
 */
export default defineConfig({
  testDir: "./playwright",
  // Every test reseeds the shared backend database, so tests must run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: "test-results-taller3",
  reporter: [["list"], ["html", { outputFolder: "playwright-report-taller3", open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    // RWA tags its elements with data-test instead of data-testid
    testIdAttribute: "data-test",
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: [
    // Logs in once through the UI and stores the session for the chromium project
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: HEATH_STORAGE_STATE },
      dependencies: ["setup"],
    },
  ],
});
