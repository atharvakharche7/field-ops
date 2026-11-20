# FieldOps web

The FieldOps website: React + TypeScript + Vite, styled with Tailwind CSS and shadcn/ui.
The full spec is in [`FieldOps Project Requirements Document.md`](../FieldOps%20Project%20Requirements%20Document.md).

## Run locally

1. Start the database and the backend (see the backend section of the requirements doc):
   ```bash
   docker start fieldops-postgres
   cd backend && ./mvnw spring-boot:run
   ```
2. Start the website:
   ```bash
   cd web
   pnpm install
   pnpm dev
   ```
3. Open http://localhost:5173 and use one of the demo accounts on the login page.

The dev server forwards every `/api/...` request to the backend on port 8080, so the browser
only talks to one address and the httpOnly login cookie works without extra CORS setup.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with instant reload |
| `pnpm build` | Type-check, then build the production files into `dist/` |
| `pnpm preview` | Serve the `dist/` build locally (also forwards `/api`) |
| `pnpm lint` | Check the code with oxlint |
| `pnpm test` | Unit tests (Vitest): offline queue, sync rules, status rules |
| `pnpm test:e2e` | End-to-end tests (Playwright) in a real browser. Starts the backend and `pnpm preview` if they aren't running; needs `docker start fieldops-postgres` first. One-time setup: `pnpm exec playwright install chromium` |

## Trying offline mode

The service worker only runs in a production build, so offline mode doesn't work in `pnpm dev`.

1. Run `pnpm build && pnpm preview` and open http://localhost:4173.
2. Log in as a technician and open a ticket or two, so they're saved on the device.
3. In Chrome DevTools, go to Network and choose **Offline**. Reload: the app still opens with your tickets.
4. Update a ticket. It shows **Pending sync**, and the banner counts it.
5. Switch back to **No throttling**. The update syncs within a few seconds.

Saved updates live in IndexedDB (DevTools → Application → IndexedDB → keyval-store).
