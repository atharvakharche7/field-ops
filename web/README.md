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
