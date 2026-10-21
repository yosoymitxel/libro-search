import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 12 * 60 * 1000,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3000/api/sources",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
