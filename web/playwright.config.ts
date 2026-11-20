import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests: a real browser clicking through the real app.
 *
 * They run against the production build ("pnpm preview", so the service worker and
 * offline mode work) and the local backend on port 8080, which needs the local
 * PostgreSQL container running: docker start fieldops-postgres
 *
 * Both servers are started for you if they aren't running already.
 * Run with: pnpm test:e2e
 */
const isWindows = process.platform === 'win32'

export default defineConfig({
  testDir: './e2e',
  // The tests share one database, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Pixel 7'], // a phone-sized screen, like the technicians use
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      // The backend. "url" is checked until it answers (a 401 counts: it means the server is up).
      command: isWindows ? '.\\mvnw.cmd spring-boot:run' : './mvnw spring-boot:run',
      cwd: '../backend',
      url: 'http://localhost:8080/api/auth/me',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      // The website: build it, then serve dist/ on port 4173 (it forwards /api to 8080).
      command: 'pnpm build && pnpm preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
})
