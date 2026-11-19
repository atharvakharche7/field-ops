# FieldOps: Project Requirements Document

Network maintenance web app (PWA) · React + Spring Boot + PostgreSQL · Oct 13, 2026 · revised Nov 17, 2026

## Overview

FieldOps is a mobile-first web app that lets field technicians receive, update and close network fault tickets from their phone's browser, with a supervisor dashboard for creating, assigning and tracking tickets. It has a React frontend, one Spring Boot REST API and a PostgreSQL database. It is built in about 7 days as a portfolio project for 0–2 year full-stack developer roles in India.

**The problem.** A telecom operator runs Wi-Fi, fibre and network equipment at hundreds of sites such as railway stations. When something breaks, a technician is sent to fix it. Updates often happen over phone calls and WhatsApp, so supervisors cannot see progress and there is no photo proof or location record.

**The solution.** Tickets are created centrally and assigned to technicians. The technician opens FieldOps on their phone, sees their tickets, opens directions to the site, marks progress, attaches photos and GPS location, and resolves the ticket. Updates made without internet are saved in the browser and sent automatically when the connection returns. The site can be installed on the phone's home screen like an app (a PWA, Progressive Web App), so no app store or APK is needed.

**Users.**

- **Technician:** sees only their assigned tickets and updates them, usually on a phone.
- **Supervisor:** sees all tickets, creates and assigns tickets, and views summary counts, usually on a laptop.

**Why this project for 0–2 year roles.** Java + Spring Boot + React + SQL is the most commonly requested full-stack combination in Indian job listings, from service companies to product startups. FieldOps covers what interviewers ask about at this level: REST API design, layered Spring Boot, JPA and SQL (relationships, `GROUP BY`, N+1), JWT security, React hooks and state, and a real deployment with a live link. The offline sync with idempotent retries gives you one story that most fresher projects don't have.

Keep the name and visuals generic: no real operator's logo, name or branding (for example RailTel) anywhere in the site or repo.

## Scope

Build the MVP first and only start stretch goals once every MVP item works end to end. A finished small app beats an unfinished big one.

| Priority | Feature | Notes |
| --- | --- | --- |
| MVP | Login with JWT, two roles | Seeded users, no sign-up page. Token in an httpOnly cookie |
| MVP | Technician: list of assigned tickets | Filter by status, refresh button, refetch when the tab regains focus |
| MVP | Ticket detail | Site, issue, priority, map link, update history with photos |
| MVP | Update ticket status with a note | Assigned → In Progress → Resolved |
| MVP | Attach photos from the phone camera | One or more photos per update, resized in the browser before upload |
| MVP | Capture GPS location with each update | Browser Geolocation API; latitude and longitude saved |
| MVP | Offline queue with auto-sync | IndexedDB queue, described in Offline sync design |
| MVP | Installable PWA | Web app manifest + service worker, opens offline |
| MVP | Supervisor: all tickets + summary counts | Counts by status and priority, per-technician load |
| MVP | Supervisor: create and assign a ticket | Simple form |
| MVP | Live deployment | Vercel (web) + Render (API) + Supabase (database and photos) |
| Stretch | Dark mode | Follow the system theme, with a toggle on Profile |
| Stretch | Web push notification on new assignment | Push API + service worker, small backend addition |
| Stretch | Docker Compose | One command starts PostgreSQL and the backend locally |

**Out of scope:** user registration, password reset, chat, real maps inside the app (we open Google Maps instead), multi-language, native Android/iOS apps, microservices, and refresh tokens.

## Prerequisites

Install everything before the build days, so they go to code. Use the latest stable versions at the time you install.

**Software to install**

| Tool | Why you need it | Check it works |
| --- | --- | --- |
| JDK 21 | The backend uses Java 21 | `java -version` |
| IntelliJ IDEA | Backend code | Opens the `backend/` Maven project |
| PostgreSQL 17 (in Docker) | Local database | `docker start fieldops-postgres`, then pgAdmin connects to `localhost:5432` |
| pgAdmin or DBeaver | Look at tables and run SQL | Can open the `fieldops` database |
| Postman | Test APIs before the pages exist | Sends a request |
| Node.js LTS (22 / 24) | Runs Vite and the frontend tools | `node -v` |
| pnpm (via Corepack) | Package manager for the whole project instead of npm | `corepack enable pnpm`, then `pnpm -v` |
| VS Code | Frontend code | — |
| Google Chrome | DevTools: device mode, Network → Offline, Application tab (IndexedDB, service worker) | — |
| Git + GitHub account | Version control and portfolio | `git --version` |
| Supabase account (free) | Hosted PostgreSQL + photo storage for the live site | Can create a project |
| Render account (free) | Hosts the Spring Boot API | Can create a web service |
| Vercel account (free) | Hosts the React site | Can import a GitHub repo |
| Docker Desktop | Runs the local PostgreSQL container; builds the backend image | `docker --version` |

**Local network setup.** During development everything runs on your laptop: the backend on `http://localhost:8080` and the site on `http://localhost:5173`. The Vite dev server forwards every `/api/...` request to the backend, so the browser only ever talks to one address. Use Chrome DevTools device mode (Ctrl+Shift+M) to see the phone layout.

**Testing on a real phone.** Browsers only allow the camera, GPS and service workers on secure pages: `https://` or `localhost`. Opening `http://192.168.x.x:5173` on your phone will **not** give you GPS or offline support. Test on the phone using the deployed Vercel URL (it's HTTPS), which you'll have from Day 7, or earlier from a Vercel preview deployment.

**Knowledge to brush up (half a day)**

- React: components, props, `useState`, `useEffect`, lists and `key`, controlled form inputs, custom hooks, context.
- React Router: routes, nested layout routes, `useNavigate`, `useParams`, protecting routes by role.
- Tailwind CSS: utility classes, responsive prefixes (`md:`), mobile-first thinking.
- shadcn/ui: components are copied into your project (`src/components/ui/`), so you own and can edit the code.
- TanStack Query (React Query): `useQuery`, `useMutation`, query keys, invalidation.
- Browser APIs: `fetch` and `FormData`, Geolocation, `<input type="file" capture>`, IndexedDB, the `online`/`offline` events, service workers and the web app manifest.
- Spring Security with JWT read from a cookie. This is the riskiest backend change, so do it first on Day 3.

## Architecture and tech stack

Three parts: a React PWA in the browser, one Spring Boot REST API, and PostgreSQL plus photo storage. Every request, including replayed offline updates, passes through the JWT filter.

```
                 ┌───────────────────────────────────────────┐
  Phone/laptop   │ React PWA (Vite build)                    │
  browser        │  pages · TanStack Query · offline queue   │
                 │  (IndexedDB) · service worker (app shell) │
                 └──────────────────┬────────────────────────┘
                                    │ same origin: /api/... + httpOnly cookie
                 ┌──────────────────▼────────────────────────┐
  Vercel         │ static files + rewrite /api/* → Render    │   (locally: Vite dev proxy)
                 └──────────────────┬────────────────────────┘
                                    │
                 ┌──────────────────▼────────────────────────┐
  Render         │ Spring Boot API (one app, Docker)         │
                 │  JWT filter → controller → service →      │
                 │  repository                               │
                 └────────┬────────────────────────┬─────────┘
                          │ JDBC                   │ HTTPS
                 ┌────────▼─────────┐     ┌────────▼─────────┐
  Supabase       │ PostgreSQL       │     │ Storage bucket   │   (locally: Postgres +
                 │ (5 tables)       │     │ "attachments"    │    uploads/ folder)
                 └──────────────────┘     └──────────────────┘
```

Because Vercel (and the Vite proxy during development) forwards `/api` to the backend, the browser sees the site and the API as **one origin**. That keeps the login cookie first-party and lets `<img src="/api/attachments/12">` send the cookie automatically.

| Layer | Technology | Used for |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite | Single-page app, fast dev server and build |
| Routing | React Router | Pages per role, protected routes |
| UI | Tailwind CSS, shadcn/ui, lucide-react icons | Mobile-first responsive layout, accessible components |
| Server data | TanStack Query + a small `fetch` wrapper | Fetching, caching, refetching |
| Offline | IndexedDB (`idb-keyval`), TanStack Query persister | Offline queue with photos; cached tickets readable offline |
| PWA | `vite-plugin-pwa` (Workbox) | Manifest, service worker, install to home screen |
| Device | `<input type="file" capture>`, Geolocation API | Camera, GPS |
| Backend | Spring Boot 4, Java 21 | REST API |
| Security | Spring Security, JJWT, BCrypt | Login, roles, protected endpoints, cookie-based JWT |
| Data | Spring Data JPA, PostgreSQL | Persistence, grouped queries |
| File storage | Local `uploads/` folder (dev), Supabase Storage (prod) | Photos |
| Build and deploy | Maven, Docker, Vite; Render, Vercel, Supabase | Backend image, static site, hosting |
| Testing | JUnit 5, Mockito, Postman, Vitest, Playwright | Service tests, API checks, unit tests, end-to-end tests |

**Why a monolith, not microservices.** FieldOps is one Spring Boot application with clear package boundaries (auth, tickets, updates, files, dashboard): a modular monolith. Microservices solve problems this project doesn't have: many teams releasing independently and parts that must scale separately. They'd add a gateway, service discovery, cross-service auth, distributed transactions, several deployments and slower free-tier cold starts, with nothing visible to show for it. The backend is stateless (JWT), so it can already run as several copies behind a load balancer. If it grew, photo upload and notifications would be the first parts to split out.

**Why React + Vite, not Next.js.** Spring Boot is already the server, every page sits behind a login (so server rendering and SEO add nothing), and the core feature is offline use, which needs the app to run fully in the browser. A Vite single-page app does exactly that with fewer concepts, and `vite-plugin-pwa` makes offline support simple.

**Why PostgreSQL.** The data is relational (sites → tickets → updates → attachments), and the project relies on SQL features: foreign keys, a unique constraint for idempotency, and `GROUP BY` for the dashboard. PostgreSQL is a widely used open-source relational database with free managed hosting (Supabase). Interviews at this level ask about SQL concepts more than about a particular database, and everything here applies to MySQL too.

## Database design

Five tables in a PostgreSQL database called `fieldops` (on Supabase, the default `postgres` database). Let JPA create them with `ddl-auto=update` during development; that's fine for a portfolio project, and you can say in interviews that production would use Flyway migrations.

**Relationships:** a site has many tickets; a ticket has many updates; an update has many attachments; a user (technician) is assigned many tickets.

**users**

| Column | Type | Rules |
| --- | --- | --- |
| id | BIGINT | PK, identity (auto increment) |
| name | VARCHAR(100) | not null |
| email | VARCHAR(120) | not null, unique (used to log in) |
| password\_hash | VARCHAR(255) | BCrypt hash, never plain text |
| role | VARCHAR(20) | TECHNICIAN or SUPERVISOR |
| phone | VARCHAR(15) | optional |
| created\_at | TIMESTAMP | set automatically |

**sites**

| Column | Type | Rules |
| --- | --- | --- |
| id | BIGINT | PK |
| code | VARCHAR(20) | unique, for example NGP-01 |
| name | VARCHAR(120) | for example Central Station, Platform 3 |
| city | VARCHAR(60) | not null |
| latitude | NUMERIC(9,6) | for the Navigate button |
| longitude | NUMERIC(9,6) | for the Navigate button |

**tickets**

| Column | Type | Rules |
| --- | --- | --- |
| id | BIGINT | PK |
| ticket\_no | VARCHAR(20) | unique, readable, for example FO-1001 |
| title | VARCHAR(150) | not null |
| description | TEXT | optional |
| category | VARCHAR(20) | WIFI\_DOWN, FIBRE\_CUT, POWER, EQUIPMENT, OTHER |
| priority | VARCHAR(10) | CRITICAL, HIGH, MEDIUM, LOW |
| status | VARCHAR(15) | OPEN, ASSIGNED, IN\_PROGRESS, RESOLVED |
| site\_id | BIGINT | FK → sites.id |
| assigned\_to | BIGINT | FK → users.id, null while OPEN |
| created\_by | BIGINT | FK → users.id |
| created\_at, updated\_at | TIMESTAMP | set automatically |
| resolved\_at | TIMESTAMP | set when status becomes RESOLVED |

**ticket\_updates** (the history of every change)

| Column | Type | Rules |
| --- | --- | --- |
| id | BIGINT | PK |
| ticket\_id | BIGINT | FK → tickets.id |
| updated\_by | BIGINT | FK → users.id |
| from\_status | VARCHAR(15) | status before the update |
| to\_status | VARCHAR(15) | status after the update |
| note | VARCHAR(500) | what the technician did |
| latitude, longitude | NUMERIC(9,6) | where the update was made, optional |
| client\_update\_id | VARCHAR(36) | UUID made in the browser, **unique**: stops duplicates when an offline update is retried |
| device\_time | TIMESTAMP | when it happened on the phone (may be earlier than created\_at if offline) |
| created\_at | TIMESTAMP | when the server received it |

**attachments**

| Column | Type | Rules |
| --- | --- | --- |
| id | BIGINT | PK |
| update\_id | BIGINT | FK → ticket\_updates.id |
| file\_name | VARCHAR(200) | stored name (UUID + extension); also the object key in the storage bucket |
| content\_type | VARCHAR(50) | image/jpeg or image/png only |
| size\_bytes | BIGINT | max 5 MB |
| created\_at | TIMESTAMP | set automatically |

Only the file name goes in the database; the image itself lives in file storage. Locally that's the `uploads/` folder. On the live site it's a **private** Supabase Storage bucket called `attachments`, because free hosts like Render wipe their local disk on every restart. This is the same pattern as AWS S3; say that in interviews.

**Seed data** (inserted by `DataSeeder` on startup when the users table is empty, so passwords get proper BCrypt hashes):

- 1 supervisor: `supervisor@fieldops.dev` / `Password@123`
- 2 technicians: `tech1@fieldops.dev`, `tech2@fieldops.dev` / `Password@123`
- 5 sites with real coordinates from Google Maps
- 10 tickets with mixed priorities and statuses, 4 assigned to tech1 and 4 to tech2

## Backend design (Spring Boot)

A standard layered Spring Boot app: controller → service → repository, with DTOs at the edges so entities never leave the service layer. This is the same pattern as your Student Management System, plus JWT security and file upload.

The project was generated at start.spring.io: Maven, Java 21, Spring Boot 4, group `com.fieldops`, artifact `fieldops-api`. Dependencies: Spring Web, Spring Data JPA, PostgreSQL Driver, Spring Security, Validation, Lombok, plus `io.jsonwebtoken:jjwt-api`, `jjwt-impl` and `jjwt-jackson` for JWT.

**Package structure**

```
com.fieldops
├── FieldOpsApplication.java
├── config/
│   ├── SecurityConfig.java        // filter chain, CORS, which URLs need which role
│   ├── DataSeeder.java            // seed users, sites, tickets on startup
│   └── WebConfig.java             // CORS: allowed origins come from app.cors.allowed-origins
├── security/
│   ├── JwtService.java            // create + validate tokens
│   ├── JwtAuthFilter.java         // reads the Bearer header, or else the fieldops_token cookie
│   ├── AuthCookies.java           // builds the login cookie and the logout (expired) cookie
│   ├── AppUser.java
│   └── AppUserDetailsService.java // loads user by email
├── entity/
│   ├── User.java  Site.java  Ticket.java  TicketUpdate.java  Attachment.java
│   └── enums/ Role.java  Priority.java  Status.java  Category.java
├── repository/
│   └── UserRepository  SiteRepository  TicketRepository
│       TicketUpdateRepository  AttachmentRepository
├── dto/
│   ├── request/  LoginRequest  CreateTicketRequest  AssignRequest
│   │             TicketUpdateRequest
│   └── response/ LoginResponse  TicketSummaryDto  TicketDetailDto  UpdateDto
│                 AttachmentDto  DashboardDto  PageResponse  PersonDto  SiteDto
│                 UserDto  ApiError
├── service/
│   ├── AuthService.java
│   ├── TicketService.java         // list, detail, create, assign, update status
│   ├── UpdateService.java         // save update + photos, idempotent by clientUpdateId
│   ├── DashboardService.java
│   └── storage/
│       ├── FileStorageService.java          // interface: save(), load(); validates type and size
│       ├── LocalFileStorageService.java     // app.storage.type=local    → uploads/ folder
│       └── SupabaseFileStorageService.java  // app.storage.type=supabase → Supabase Storage
├── controller/
│   ├── AuthController  TicketController  AttachmentController
│   └── DashboardController  UserController  SiteController
└── exception/
    ├── NotFoundException  BadRequestException  ForbiddenException
    └── GlobalExceptionHandler.java // @RestControllerAdvice → ApiError JSON
```

`FileStorageService` is an interface with two implementations, and a property picks one at startup (`@ConditionalOnProperty`). The rest of the code doesn't know or care where photos live. This is a clean interview example of programming to an interface.

**Key rules the service layer enforces**

1. A technician can only see and update tickets assigned to them. Check `ticket.assignedTo.id == currentUser.id` in `TicketService`, and throw `ForbiddenException` otherwise.
2. Status can only move forward: ASSIGNED → IN\_PROGRESS → RESOLVED. Moving from ASSIGNED directly to RESOLVED is allowed; going backwards is rejected with 400. Put this in one method, `Status.canMoveTo(Status next)`, so it's easy to show in an interview.
3. A note is required when resolving.
4. Every status change creates a `TicketUpdate` row, so the ticket has a full history.
5. If an update arrives with a `client_update_id` that already exists, return the existing result instead of saving it again. This makes offline retries safe (idempotency).
6. Photos: only `image/jpeg` and `image/png`, max 5 MB, saved with a random UUID file name so users can't overwrite files or guess paths.

**Security**

- Passwords hashed with `BCryptPasswordEncoder`.
- Stateless sessions: `SessionCreationPolicy.STATELESS`.
- Token lifetime 24 hours; the token holds the user id, email and role. No refresh tokens for this project; when the token expires, the site sends the user back to login.
- **The token travels in a cookie, not in JavaScript.** On login, the server sets:
  `fieldops_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
  - `HttpOnly`: page scripts can't read it, so an XSS bug can't steal the token.
  - `Secure`: only sent over HTTPS (switched off by `app.cookie.secure=false` for local http).
  - `SameSite=Strict`: the browser never sends it on requests started by another site, which blocks CSRF (cross-site request forgery). That's why CSRF protection can stay disabled in Spring.
  - Build it with Spring's `ResponseCookie` in `AuthCookies`.
- `JwtAuthFilter` reads `Authorization: Bearer <token>` first and falls back to the `fieldops_token` cookie, so Postman and tests can still use the header.
- `POST /api/auth/logout` replies with the same cookie set to `Max-Age=0`, which deletes it.
- Role checks: `/api/auth/login` and `/api/auth/logout` are public; `/api/dashboard/**`, `POST /api/tickets` and `PATCH /api/tickets/*/assign` need SUPERVISOR; everything else needs any logged-in user. Use `@PreAuthorize("hasRole('SUPERVISOR')")` on those methods and enable `@EnableMethodSecurity`.
- CORS: allow only the site's own origin (`http://localhost:5173` in development, the Vercel URL in production). Vercel passes the browser's `Origin` header through its proxy, so Spring still checks it.
- Secrets (JWT secret, database password, Supabase service key) come from environment variables, or from the git-ignored `backend/.env` locally. Never commit a real secret to GitHub.

**Error format** (every error returns this shape from `GlobalExceptionHandler`)

```json
{
  "timestamp": "2026-10-14T10:15:30",
  "status": 400,
  "error": "Bad Request",
  "message": "Cannot move ticket from RESOLVED to IN_PROGRESS",
  "path": "/api/tickets/7/updates"
}
```

**application.properties**

```properties
spring.application.name=fieldops-api
server.port=${PORT:8080}

# Local secrets can live in backend/.env, which is git-ignored. Real environment variables win.
spring.config.import=optional:file:.env[.properties]

spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/fieldops}
spring.datasource.username=${DB_USERNAME:postgres}
spring.datasource.password=${DB_PASSWORD:postgres}
spring.datasource.hikari.maximum-pool-size=5
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false

spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=20MB

app.jwt.secret=${JWT_SECRET:change-this-to-a-long-random-string-of-32-plus-chars}
app.jwt.expiration-ms=86400000
app.cookie.secure=${COOKIE_SECURE:false}
app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173}

app.storage.type=${STORAGE_TYPE:local}
app.upload-dir=uploads
app.supabase.url=${SUPABASE_URL:}
app.supabase.service-key=${SUPABASE_SERVICE_KEY:}
app.supabase.bucket=attachments
```

PostgreSQL has no `createDatabaseIfNotExist` option, so the database must exist before the app starts. Locally, the Docker container creates it:

```bash
docker run -d --name fieldops-postgres -e POSTGRES_DB=fieldops -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -v fieldops-pgdata:/var/lib/postgresql/data --restart unless-stopped postgres:17
```

The small connection pool (`maximum-pool-size=5`) stays within Supabase's free-tier connection limit.

**Time zone.** `main()` sets the app's time zone to `Asia/Kolkata` before Spring starts, and `pom.xml` passes `-Duser.timezone=Asia/Kolkata` to tests. Without it, Windows reports the old name `Asia/Calcutta`, which PostgreSQL refuses when connecting. Render runs on UTC, which would make "resolved today" start at 5:30 AM IST.

**Supabase Storage from Spring.** Use Spring's `RestClient` and the storage REST API, with the service key in the `Authorization: Bearer` header:

- Upload: `POST {SUPABASE_URL}/storage/v1/object/attachments/{fileName}` with the image bytes and its `Content-Type`.
- Download: `GET {SUPABASE_URL}/storage/v1/object/attachments/{fileName}`. `AttachmentController` streams it back after the access check.

The bucket is private and the service key lives only on the backend, so photos are still only reachable through `/api/attachments/{id}`.

**Watch out for:** infinite JSON recursion if you ever return entities directly (always map to DTOs), and the N+1 query problem when listing tickets with their site and technician. Use `@EntityGraph(attributePaths = {"site", "assignedTo"})` on the list query. Both make good interview talking points.

## API specification

Eleven endpoints cover the whole app. In the browser, the base URL is the site's own origin (`/api/...`). In Postman, use `http://localhost:8080`. Every endpoint except login and logout needs the `fieldops_token` cookie or the header `Authorization: Bearer <token>`. Postman keeps cookies automatically after the login request. Test each endpoint in Postman before building its page, and keep the collection in the repo as `postman/FieldOps.postman_collection.json`.

| # | Method | Path | Role | Purpose |
| --- | --- | --- | --- | --- |
| 1 | POST | /api/auth/login | Public | Log in, sets the cookie, returns the user |
| 2 | GET | /api/auth/me | Any | Current user profile |
| 3 | GET | /api/tickets | Any | List tickets (technician: own only; supervisor: all) |
| 4 | GET | /api/tickets/{id} | Any (own for technician) | Ticket detail with site and update history |
| 5 | POST | /api/tickets/{id}/updates | Technician | Change status, add note, GPS, photos |
| 6 | GET | /api/attachments/{id} | Any with access | Download a photo |
| 7 | POST | /api/tickets | Supervisor | Create ticket |
| 8 | PATCH | /api/tickets/{id}/assign | Supervisor | Assign to technician |
| 9 | GET | /api/dashboard/summary | Supervisor | Counts for dashboard |
| 10 | GET | /api/users?role=TECHNICIAN and /api/sites | Supervisor | Dropdown data for the create form |
| 11 | POST | /api/auth/logout | Public | Clears the cookie |

Photos are served through endpoint 6, not as public static files, so only people with access to the ticket can see them. Because the cookie is sent automatically, a plain `<img src="/api/attachments/12">` works in the browser. That wasn't possible with a token held in JavaScript, because an `<img>` tag can't add an `Authorization` header.

### 1. POST /api/auth/login

```json
// Request
{ "email": "tech1@fieldops.dev", "password": "Password@123" }

// 200 OK  (plus header: Set-Cookie: fieldops_token=eyJhbGciOi...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400)
{
  "user": { "id": 2, "name": "Ravi Kumar", "email": "tech1@fieldops.dev", "role": "TECHNICIAN" }
}
```

The token is no longer in the response body; returning it there would let page scripts read it and defeat the point of `HttpOnly`. Errors: 400 if a field is missing, 401 `Invalid email or password` (same message for both cases, so attackers can't tell which emails exist).

### 3. GET /api/tickets

Query params, all optional: `status` (ASSIGNED, IN\_PROGRESS, RESOLVED), `priority`, `page` (default 0), `size` (default 20). Sorted by priority (CRITICAL first), then oldest first.

```json
// 200 OK
{
  "content": [
    {
      "id": 7,
      "ticketNo": "FO-1007",
      "title": "Wi-Fi down on Platform 3",
      "priority": "CRITICAL",
      "status": "ASSIGNED",
      "category": "WIFI_DOWN",
      "siteName": "Central Station, Platform 3",
      "city": "Nagpur",
      "assignedToName": "Ravi Kumar",
      "updatedAt": "2026-10-14T09:20:00"
    }
  ],
  "page": 0, "size": 20, "totalElements": 4, "totalPages": 1
}
```

### 4. GET /api/tickets/{id}

```json
// 200 OK
{
  "id": 7,
  "ticketNo": "FO-1007",
  "title": "Wi-Fi down on Platform 3",
  "description": "Access point not responding since 6 AM. Passengers reporting no signal.",
  "priority": "CRITICAL",
  "status": "IN_PROGRESS",
  "category": "WIFI_DOWN",
  "site": { "id": 1, "code": "NGP-01", "name": "Central Station, Platform 3", "city": "Nagpur", "latitude": 21.152, "longitude": 79.088 },
  "assignedTo": { "id": 2, "name": "Ravi Kumar" },
  "createdAt": "2026-10-14T06:30:00",
  "resolvedAt": null,
  "updates": [
    {
      "id": 31,
      "fromStatus": "ASSIGNED",
      "toStatus": "IN_PROGRESS",
      "note": "Reached site, checking the access point",
      "latitude": 21.1521, "longitude": 79.0882,
      "updatedByName": "Ravi Kumar",
      "deviceTime": "2026-10-14T09:18:00",
      "attachments": [ { "id": 12, "url": "/api/attachments/12", "contentType": "image/jpeg" } ]
    }
  ]
}
```

Errors: 404 if the ticket doesn't exist, 403 if a technician opens someone else's ticket.

### 5. POST /api/tickets/{id}/updates

This is the most important endpoint. It is `multipart/form-data` with two kinds of parts:

- `data`: a JSON part (sent with content type `application/json`)
- `photos`: zero or more image files

```json
// "data" part
{
  "clientUpdateId": "6f1c2a9e-8b1d-4c5e-9a77-2d3f4e5a6b7c",
  "toStatus": "RESOLVED",
  "note": "Replaced faulty PoE injector. AP back online, speed test 45 Mbps.",
  "latitude": 21.1521,
  "longitude": 79.0882,
  "deviceTime": "2026-10-14T10:05:00"
}
```

Controller signature:

```java
@PostMapping(value = "/{id}/updates", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<UpdateDto> addUpdate(
    @PathVariable Long id,
    @RequestPart("data") @Valid TicketUpdateRequest data,
    @RequestPart(value = "photos", required = false) List<MultipartFile> photos,
    @AuthenticationPrincipal AppUser user) { ... }
```

Responses:

- **201 Created** with the saved update (same shape as one item in `updates` above).
- **200 OK** with the existing update if this `clientUpdateId` was already saved. The site treats 200 and 201 the same: success, remove it from the queue.
- **400** invalid status move, missing note on resolve, bad file type, file over 5 MB.
- **401** cookie missing or expired.
- **403** ticket not assigned to this technician.
- **404** ticket not found.

### 7. POST /api/tickets (supervisor)

```json
// Request
{
  "title": "Fibre link down",
  "description": "Link between Wardha and Nagpur showing loss of signal",
  "category": "FIBRE_CUT",
  "priority": "HIGH",
  "siteId": 3,
  "assignedToId": 2
}
// 201 Created → TicketDetailDto. Status is ASSIGNED if assignedToId is given, else OPEN.
```

### 8. PATCH /api/tickets/{id}/assign (supervisor)

```json
// Request
{ "technicianId": 3 }
// 200 OK → TicketDetailDto. Status becomes ASSIGNED. 400 if the ticket is RESOLVED or the user is not a technician.
```

### 9. GET /api/dashboard/summary (supervisor)

```json
// 200 OK
{
  "byStatus": { "OPEN": 2, "ASSIGNED": 3, "IN_PROGRESS": 3, "RESOLVED": 2 },
  "byPriority": { "CRITICAL": 2, "HIGH": 4, "MEDIUM": 3, "LOW": 1 },
  "resolvedToday": 1,
  "openCritical": 1,
  "technicians": [
    { "id": 2, "name": "Ravi Kumar", "activeTickets": 3 },
    { "id": 3, "name": "Priya Sharma", "activeTickets": 3 }
  ]
}
```

Use `GROUP BY` queries in the repository (for example `SELECT t.status, COUNT(t) FROM Ticket t GROUP BY t.status`) instead of loading all tickets into memory.

### 11. POST /api/auth/logout

No request body. Responds **204 No Content** with `Set-Cookie: fieldops_token=; Max-Age=0; ...`, which tells the browser to delete the cookie. It's public, so logging out works even with an expired token.

## Web app design (React + Vite)

One React app serves both roles. After login, the router shows technician pages or supervisor pages based on `user.role`. It is designed **mobile-first**: build every page at phone width (about 375 px) first, then use `md:` classes to widen it for laptops.

**Create the project** (from the repo root)

```bash
pnpm create vite@latest web --template react-ts
cd web
pnpm add react-router @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister idb-keyval lucide-react
pnpm add -D tailwindcss @tailwindcss/vite vite-plugin-pwa @types/node
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card badge input textarea select label tabs dialog skeleton sonner
pnpm add -D vitest jsdom fake-indexeddb @testing-library/react @testing-library/jest-dom @playwright/test
pnpm exec playwright install chromium
```

Follow shadcn's Vite guide before `shadcn init`: add Tailwind's `@import "tailwindcss";` to `src/index.css` and the `@/` path alias in `tsconfig.json` and `vite.config.ts`. `crypto.randomUUID()` (built into browsers) gives you the `clientUpdateId`, so no UUID library is needed.

**vite.config.ts essentials**

```ts
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({ /* see Offline sync design */ })],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
});
```

**vercel.json** (production equivalent of the proxy, plus single-page-app routing)

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<your-render-service>.onrender.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Folder structure**

```
web/
├── index.html
├── vite.config.ts               // React, Tailwind, PWA plugins; /api proxy to :8080
├── vercel.json                  // /api → Render, everything else → index.html
├── components.json              // shadcn/ui settings
├── playwright.config.ts
├── public/                      // PWA icons (192 and 512 px), favicon
├── e2e/                         // Playwright tests
└── src/
    ├── main.tsx                 // PersistQueryClientProvider + AuthProvider + RouterProvider + Toaster
    ├── router.tsx               // routes, RequireAuth and RequireRole guards
    ├── index.css                // Tailwind import, theme colours (shadcn CSS variables)
    ├── api/
    │   ├── client.ts            // fetch wrapper: JSON, ApiError, 401 → logout
    │   ├── auth.ts              // login(), me(), logout()
    │   ├── tickets.ts           // getTickets(), getTicket(), addUpdate(), createTicket(), assign()
    │   └── dashboard.ts         // getSummary(), getTechnicians(), getSites()
    ├── auth/
    │   ├── AuthContext.tsx      // user, login(), logout(); last user cached for offline start
    │   └── guards.tsx           // RequireAuth, RequireRole, HomeRedirect
    ├── offline/
    │   ├── queue.ts             // add(), getAll(), remove(), count() using IndexedDB
    │   └── useSync.ts           // listens to online/visibility events, flushes the queue
    ├── lib/
    │   ├── geo.ts               // getCoords(): GPS with timeout, null on failure
    │   ├── photos.ts            // resizePhoto(): shrink camera photos before upload
    │   ├── status.ts            // allowedNextStatuses(), mirrors Status.canMoveTo
    │   ├── format.ts            // labels for enums, date format, Google Maps links
    │   ├── errors.ts            // errorMessage(): any error → a sentence for the user
    │   └── utils.ts             // shadcn's cn() helper
    ├── layouts/
    │   └── AppLayout.tsx        // bottom nav on phones, sidebar on md+ screens; OfflineBanner
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── TicketsPage.tsx      // technician: own tickets; supervisor: all (backend decides)
    │   ├── TicketDetailPage.tsx // both roles: Update (technician), Reassign (supervisor)
    │   ├── UpdateTicketPage.tsx // technician
    │   ├── DashboardPage.tsx    // supervisor
    │   ├── CreateTicketPage.tsx // supervisor
    │   └── ProfilePage.tsx      // name, role, pending + failed sync items, Sync now, Log out
    ├── components/
    │   ├── ui/                  // generated by shadcn/ui
    │   ├── TicketCard.tsx  PriorityBadge.tsx  StatusChip.tsx  StatCard.tsx
    │   ├── OfflineBanner.tsx    // "You're offline · 2 updates waiting to sync"
    │   └── PhotoPicker.tsx  EmptyState.tsx  ErrorState.tsx
    └── types/index.ts           // Ticket, TicketDetail, Update, User, enums
```

**Pages and routes**

| Route | Page | Role | What it shows | Main actions |
| --- | --- | --- | --- | --- |
| `/login` | Login | Public | Email, password, error message | Log in |
| `/tickets` | Tickets | Both | Cards: ticket no, title, site, priority badge, status chip; status filter tabs | Refresh, tap card |
| `/tickets/:id` | Ticket Detail | Both | Description, site, assigned date, update timeline with photos | Navigate (Google Maps); Update (technician); Reassign (supervisor) |
| `/tickets/:id/update` | Update Ticket | Technician | Status picker (only allowed next statuses), note, photo thumbnails, "Location captured" line | Take photo, Save |
| `/dashboard` | Dashboard | Supervisor | Stat cards (Open, In Progress, Resolved today, Critical open), per-technician load | Tap a card to see that list |
| `/tickets/new` | Create Ticket | Supervisor | Title, description, category, priority, site, technician pickers | Create |
| `/profile` | Profile | Both | Name, role, pending and failed updates | Sync now, Log out |

After login, technicians land on `/tickets` and supervisors on `/dashboard`. Navigation: technicians get **Tickets** and **Profile**; supervisors get **Dashboard**, **Tickets**, **New** and **Profile**. These show as a bottom bar on phones and a sidebar on wider screens. A technician who types a supervisor URL is redirected; the backend would return 403 anyway.

**State management**

- Server data (tickets, dashboard) → TanStack Query. Query keys: `['tickets', filters]`, `['ticket', id]`, `['dashboard']`. After a successful update, call `queryClient.invalidateQueries({ queryKey: ['tickets'] })` and the ticket's key.
- The query cache is saved to IndexedDB with `PersistQueryClientProvider`, so a technician who opens the app with no signal still sees their tickets and details from the last visit. Set `gcTime` to 24 hours so cached data isn't thrown away before it's saved.
- Logged-in user → `AuthContext`. On start, call `/api/auth/me`. Only a 401 means "logged out". If it fails for any other reason (no network, or a 5xx while the server is down or waking up), use the last user saved in `localStorage` (name and role only, never the token) so the app still opens offline.
- Offline queue → IndexedDB via `queue.ts`.
- Form state → local `useState`. No Redux needed; you can say so in an interview and explain why.

**Useful code patterns**

The fetch wrapper (`api/client.ts`):

```ts
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, init);           // same origin, so the cookie is sent automatically
  if (res.status === 401 && path !== '/api/auth/login') onUnauthorized();  // clear user, go to /login
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
// A network failure (offline, server unreachable) makes fetch throw a TypeError instead,
// so code can tell "no connection" apart from "the server said no".
```

Open directions in Google Maps:

```tsx
<a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
   target="_blank" rel="noopener noreferrer">Navigate</a>
```

Take a photo (opens the rear camera on phones, a file picker on laptops):

```tsx
<input type="file" accept="image/jpeg,image/png" capture="environment" multiple
  onChange={async e => {
    const files = Array.from(e.target.files ?? []);
    const resized = await Promise.all(files.map(f => resizePhoto(f)));
    setPhotos(p => [...p, ...resized]);
  }} />
```

Resize before upload (`lib/photos.ts`). Phone photos are 3–8 MB; this makes them about 200–400 KB, which is faster on mobile data, cheaper to store, and safely under the 5 MB limit:

```ts
export async function resizePhoto(file: File, maxSide = 1600): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.7));
}
```

Get location (`lib/geo.ts`; don't block saving if it fails):

```ts
export const getCoords = () =>
  new Promise<{ latitude: number; longitude: number } | null>(resolve => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),                       // denied, unavailable or timed out
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
```

Send the multipart update:

```ts
const form = new FormData();
form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
photos.forEach((blob, i) => form.append('photos', blob, `photo_${i}.jpg`));
await api<UpdateDto>(`/api/tickets/${ticketId}/updates`, { method: 'POST', body: form });
// Don't set Content-Type yourself: the browser adds it with the multipart boundary.
```

Wrapping the JSON in a `Blob` with type `application/json` is what lets Spring's `@RequestPart("data")` parse it. If you get a 415 error, check that line first.

**UI rules for a polished look:**

- Every list has a loading state (shadcn `Skeleton`), an empty state, and an error state with Retry.
- Buttons show a spinner and are disabled while saving.
- Priority colours are consistent everywhere: Critical red, High orange, Medium blue, Low grey.
- Tap targets are at least 44 px tall.
- Toasts (shadcn `sonner`) confirm saves.
- Nothing scrolls sideways at 375 px.

## User flows

The technician's update flow is the heart of the app: every save either reaches the server or waits in the queue until it can.

```
 Tap Save ──► build update + new clientUpdateId
                 │
                 ▼
          send to /api/tickets/{id}/updates
                 │
   ┌─────────────┼───────────────────────┬──────────────────────┐
   ▼             ▼                       ▼                      ▼
 200/201     network error           400/403/404               401
 success     (offline, timeout)      server said no            login expired
   │             │                       │                      │
 refresh     save to IndexedDB queue  show the error,        save to queue,
 ticket,     toast "Saved offline",   don't queue            go to login;
 go back     show "Pending sync"      (retry won't help)     sync after login
```

Only a 400, 403 or 404 stops an update for good, because retrying won't change the answer.

**Login flow**

1. The site loads (from the service worker cache if offline) and calls `/api/auth/me`.
2. Success → go to the home page for that role. 401 → show Login.
3. Network error → if a user is cached in `localStorage`, open their home page in offline mode with cached data; otherwise show Login with "You're offline".
4. On login success, the server sets the cookie; save the user and go to the home page.

**Technician flow**

1. Tickets loads assigned tickets, Critical first.
2. Tap a ticket → Ticket Detail with the history timeline.
3. Tap **Navigate** → Google Maps opens with directions to the site.
4. On site, tap **Update** → choose In Progress, add a note, take photos. Location is captured in the background.
5. Tap **Save** → follows the diagram above.
6. Later, choose Resolved with a closing note (required) and an "after" photo.

**Supervisor flow**

1. Dashboard shows open, in-progress, resolved-today and critical-open counts, plus each technician's active ticket count.
2. Tap **New** → fill in title, category, priority, site, technician → Create. The ticket appears on that technician's list the next time it refreshes.
3. Open any ticket → see its full update timeline with photos and locations → **Reassign** if needed.

## Offline sync design

Offline mode has two parts:

1. **The app itself opens offline.** A service worker caches the built HTML, JS and CSS, and the TanStack Query cache in IndexedDB holds the last tickets seen.
2. **Updates made offline are queued** in IndexedDB and replayed through the same endpoint later. The server's `clientUpdateId` check makes replays safe.

The queue is about 100 lines of code and the strongest interview story in the project.

**PWA setup** (`vite-plugin-pwa` in `vite.config.ts`)

```ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'FieldOps', short_name: 'FieldOps', start_url: '/', display: 'standalone',
    theme_color: '#0f172a', background_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  workbox: {
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],     // never let the service worker answer API calls
  },
})
```

The service worker caches only the app shell, never `/api` responses. There is exactly one place for offline data (IndexedDB, managed by our code), which keeps it easy to reason about. The service worker is off in `pnpm dev`; test offline with `pnpm build && pnpm preview`.

**What one queued item looks like** (stored with `idb-keyval` as an array under the key `fieldops.queue`):

```ts
type QueuedUpdate = {
  clientUpdateId: string;     // crypto.randomUUID(), created when the user taps Save
  ticketId: number;
  toStatus: 'IN_PROGRESS' | 'RESOLVED';
  note: string;
  latitude?: number;
  longitude?: number;
  deviceTime: string;         // ISO time on the phone when Save was tapped
  photos: Blob[];             // resized JPEGs; IndexedDB stores Blobs directly
  attempts: number;
  lastError?: string;
};
```

The photos themselves are stored in IndexedDB, not just a link to them, so they can't disappear before the update syncs.

**When the user taps Save**

1. Build the update and give it a new `clientUpdateId`.
2. Try sending it. Don't trust `navigator.onLine` alone: a phone can be "connected" to Wi-Fi with no internet. A failed `fetch` is the real signal.
3. If the request succeeds (200 or 201), refresh the ticket and go back.
4. If it fails with a network error, or with 502, 503 or 504 (the proxy, Vite or Vercel, couldn't reach the backend, for example while Render wakes up), add it to the queue. Show the toast "Saved offline. Will sync when you're back online", and show the ticket with its new status and a small "Pending sync" label.
5. If the server returns 400, 403 or 404, do **not** queue it. Show the error message, because retrying won't fix it.
6. If the server returns 401 (login expired), queue it and send the user to login. It syncs after they log back in.

**When the sync runs** (`useSync` hook, mounted once in `AppLayout`)

- When the app starts with a logged-in user.
- When the browser fires the `online` event.
- When the tab becomes visible again (`visibilitychange`), for example when the technician switches back to FieldOps.
- When the user taps **Sync now** on the Profile page.

**How the sync works**

1. If a sync is already running, stop (use a simple `isSyncing` flag so two syncs can't run at once).
2. Read the queue and send items **one at a time, oldest first**, so updates to the same ticket stay in order.
3. 200 or 201 → remove the item from the queue.
4. Network error, 502, 503 or 504 → stop the loop and try again next time; keep the rest of the queue as it is.
5. 401 → stop the loop, keep the queue, and send the user to login.
6. 400, 403 or 404 → remove the item, keep it in a separate `fieldops.failed` list, and show it on the Profile page so the user knows it didn't go through. Example: the supervisor reassigned the ticket while the technician was offline.
7. After the loop, invalidate the ticket queries so lists refresh.

**Logging out with pending updates:** warn "You have 2 updates waiting to sync. Logging out will delete them." If the user confirms, clear the queue, the failed list, the query cache and the cached user. This stops one technician's updates from being sent under another technician's login on a shared phone.

**Conflict rule:** the server is the source of truth. Status rules are checked when the update arrives, so an offline update that's no longer valid is rejected with a clear reason, not silently applied. `deviceTime` records when the work actually happened; `created_at` records when the server received it.

**Browser limits worth knowing (good interview points):**

- **Why not the Background Sync API?** It can retry even after the tab is closed, but only Chromium browsers support it. Our queue works everywhere and syncs as soon as the app is open and online.
- **Storage can be cleared.** Browsers may evict site data under storage pressure, and Safari can remove it after weeks of no use unless the PWA is installed. Call `navigator.storage.persist()` once after login to ask the browser to keep it.

**How to demo it:**

- On a laptop: open Chrome DevTools → Network → Offline, resolve a ticket with a photo, and show the banner "1 update waiting". Switch back to Online and show it sync.
- On a phone with the installed PWA: do the same with airplane mode.

Then log in as the supervisor and show the ticket updated on the dashboard. Put this in the demo video.

## Deployment

The live link is part of the MVP. Everything below is on free tiers.

1. **Supabase.** Create a project. Under Storage, create a **private** bucket called `attachments`. Note these values:
   - The **Session pooler** connection string. Use the pooler, because the direct connection needs IPv6 and Render can't reach it.
   - The database password.
   - The project URL.
   - The `service_role` key. It is secret; it goes on the backend only.
2. **Backend Dockerfile.** Render has no built-in Java runtime, so the backend ships as a Docker image. Use a two-stage `backend/Dockerfile`: stage 1 uses a Maven + JDK 21 image to run `./mvnw -DskipTests package`; stage 2 uses `eclipse-temurin:21-jre` to run the jar.
3. **Render.** Create a Web Service from the GitHub repo with root directory `backend` and the Docker runtime. Set these environment variables:
   - `DB_URL` (`jdbc:postgresql://<pooler-host>:5432/postgres`), `DB_USERNAME`, `DB_PASSWORD`
   - `JWT_SECRET`
   - `STORAGE_TYPE=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - `COOKIE_SECURE=true`
   - `CORS_ALLOWED_ORIGINS=https://<your-site>.vercel.app`
4. **Vercel.** Import the repo with root directory `web` and the Vite framework preset (build: `pnpm build`, output: `dist`). Put the Render URL into `vercel.json`.
5. **Smoke test** on your phone: open the Vercel URL, log in, install to the home screen, take a photo, and try airplane mode.

**Free-tier behaviour to mention in the README:**

- Render puts the backend to sleep after about 15 minutes without traffic. The first request after that can take up to a minute while it wakes; open the site a minute before a demo or interview.
- Supabase pauses a free project after a week of no activity; resume it from the dashboard.

## 7-day build plan

Plan on 5–6 focused hours a day. Each day ends with a "done when" check; don't start the next day until it passes. Commit at the end of every day with a clear message, so the history shows steady work. If you fall behind, cut in this order: Playwright tests → persisted query cache → Reassign button. Never cut the offline queue or the live link.

**Day 0: setup** ✅

- [x] Install the backend tools, Node and pnpm; create the repo with `backend/`
- [ ] Install PostgreSQL + pgAdmin; create Supabase, Render and Vercel accounts (do this before Day 3)

**Day 1: backend foundation and auth** ✅

- [x] Spring Boot project, all 5 entities and enums, repositories
- [x] `DataSeeder` with users, sites and tickets
- [x] `JwtService`, `JwtAuthFilter`, `SecurityConfig`, `AuthController` (login, me)
- [x] `GlobalExceptionHandler` with the `ApiError` shape

**Day 2: backend ticket APIs** ✅

- [x] DTOs and mapping methods
- [x] Endpoints 3–10, including photos, idempotency and the status rule
- [x] Postman collection in the repo

**Day 3: backend changes for the web** ✅

- [x] Merge the `feat/ticket-api` branch into `main` (pull request on GitHub)
- [x] Remove the `mobile/` folder; update `CLAUDE.md` for the web stack
- [x] Switch to PostgreSQL: replace `mysql-connector-j` with `org.postgresql:postgresql`, update `application.properties`, create the `fieldops` database
- [x] Cookie auth: `AuthCookies`, login sets the cookie and returns only the user, filter reads the cookie, endpoint 11 (logout)
- [x] CORS origins from `app.cors.allowed-origins`
- [x] `FileStorageService` interface with local and Supabase implementations (Supabase is tested on Day 7, when the account exists)
- [x] `backend/Dockerfile`
- [x] Update the Postman collection (cookie login, logout)

* Done when: every Postman request passes against local PostgreSQL using the cookie from login, and a photo upload works with `STORAGE_TYPE=local`.

**Day 4: web shell, login, ticket list** ✅

- [x] Create `web/` with Vite, Tailwind, shadcn/ui, React Router, TanStack Query
- [x] `api/client.ts`, `AuthContext`, `RequireAuth` and `RequireRole` guards
- [x] `AppLayout` with bottom nav (phone) and sidebar (desktop)
- [x] Login page (with one-tap demo accounts)
- [x] Tickets page with `TicketCard`, badges, status tabs, refresh, loading / empty / error states
- [x] Ticket Detail page with timeline, photos and the Navigate link

* Done when: you log in as tech1 and see only tech1's tickets from the real backend, a page reload keeps you logged in, and DevTools shows that `document.cookie` can't see the token.

**Day 5: updates with camera + GPS, supervisor pages**

- [ ] Update Ticket page: allowed statuses only, note, `PhotoPicker` with resizing, location
- [ ] Multipart upload working
- [ ] Dashboard with stat cards and per-technician load
- [ ] Create Ticket form and Reassign on Ticket Detail

* Done when: you resolve a ticket with 2 photos as tech1, then log in as supervisor and see the photos in the timeline and the counts change on the dashboard.

**Day 6: offline and PWA**

- [ ] `vite-plugin-pwa` with manifest and icons
- [ ] `queue.ts` and `useSync`; `OfflineBanner` with pending count; "Pending sync" labels; failed list and Sync now on Profile
- [ ] Persist the query cache to IndexedDB; cached user for offline start
- [ ] Vitest tests for `queue.ts`, `useSync` and `status.ts`

* Done when: with `pnpm build && pnpm preview`, the DevTools-offline demo works three times in a row, including reloading the page while offline.

**Day 7: deploy and ship**

- [ ] Deploy: Supabase, Render, Vercel (see Deployment)
- [ ] Test on your phone: install the PWA, camera, GPS, airplane-mode sync
- [ ] 2–3 Playwright tests
- [ ] Take 6–8 screenshots (phone and desktop) and record a 60–90 second demo video
- [ ] Write the README; add the project to your resume and LinkedIn

* Done when: someone else can open your live link, log in with a test account and watch your video without asking you anything.

**After Day 7: stretch goals** (in this order)

1. **Dark mode.** Use shadcn's theme variables and Tailwind's `dark:` variant. Follow `prefers-color-scheme` by default, with a Light / Dark / System toggle on Profile. About 1–2 hours.
2. **Docker Compose.** Add a `docker-compose.yml` at the repo root with a `postgres:17` service and the backend built from `backend/Dockerfile`, so `docker compose up` starts both. The site still runs with `pnpm dev`. About 2 hours.
3. **Web push on new assignment.**
   - Backend: generate VAPID keys (the key pair that identifies your server to push services) and add a `push_subscriptions` table (`id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`). Add `POST /api/push/subscribe` for any logged-in user, and send a push from `TicketService` after a ticket is created or assigned, using the `nl.martijndwars:web-push` library.
   - Frontend: ask for notification permission from Profile, subscribe through the service worker, and handle the `push` and `notificationclick` events.
   - On iPhones it only works for an installed PWA (iOS 16.4+). About half a day.

## Testing checklist

Run through the manual list on Day 7 on a real phone and a laptop. The automated tests take a few hours in total and give you something concrete to say when asked "how did you test it?"

**Backend unit tests (JUnit 5 + Mockito)**

- [ ] `Status.canMoveTo`: allowed and rejected moves
- [ ] `TicketService`: technician gets 403 on another technician's ticket
- [ ] `UpdateService`: same `clientUpdateId` twice saves only one row
- [ ] Resolve without a note returns 400
- [ ] `FileStorageService` rejects a PDF and a 6 MB image
- [ ] Login response sets an `HttpOnly` cookie and has no token in the body

**Frontend unit tests (Vitest, with `fake-indexeddb` standing in for the browser's IndexedDB)**

- [ ] `queue.ts`: add, read back in oldest-first order, remove, count
- [ ] `useSync`: removes items on 200/201, stops on a network error, moves 400/403/404 to the failed list, stops on 401
- [ ] `allowedNextStatuses`: matches the backend rules

**End-to-end tests (Playwright, against the local backend and `pnpm preview`)**

Each test creates its own ticket through the API as the supervisor first, so tests don't depend on seed data left over from earlier runs.

- [ ] Technician logs in and sees only their own tickets
- [ ] Technician moves a ticket to In Progress with a note; it appears in the timeline
- [ ] Offline sync: `context.setOffline(true)` → save → banner shows 1 pending → `context.setOffline(false)` → the update reaches the server

**Auth and access**

- [ ] Wrong password shows an error; nothing crashes
- [ ] Reload and closing/reopening the browser keep you logged in
- [ ] Logout clears the cookie, the cached data and the cached user
- [ ] Technician never sees supervisor navigation, and typing `/dashboard` redirects
- [ ] `document.cookie` in the console doesn't show the token

**Tickets**

- [ ] Status tabs change the list
- [ ] Empty filter shows the empty state, not a blank page
- [ ] Backend stopped → error state with Retry, which works once the backend is back
- [ ] Navigate opens Google Maps at the right site
- [ ] Layout works at 375 px and on a laptop, with no sideways scrolling

**Updates**

- [ ] Only valid next statuses are offered
- [ ] Camera opens on the phone; a large photo is resized before upload
- [ ] Location permission denied → can still save; the update has no location
- [ ] Save button can't be double-tapped into two updates

**Offline and PWA**

- [ ] Offline → save → banner shows 1 pending
- [ ] Back online → syncs within a few seconds, banner disappears
- [ ] Two offline updates to the same ticket sync in the right order
- [ ] Close the tab while offline, reopen online → queue still syncs
- [ ] Reload while offline → app opens and shows cached tickets
- [ ] Supervisor reassigns while technician is offline → the update fails cleanly and shows in the failed list
- [ ] Site installs to the phone's home screen and opens full-screen

**Supervisor**

- [ ] Dashboard numbers match the database
- [ ] Created ticket appears on the technician's list after refresh

## Deliverables

The hiring manager will spend about two minutes on this, so the README must show the app working before they read anything. Lead with the live link, the video and screenshots.

**README at the repo root, in this order**

1. Title and one line: "FieldOps: offline-first field service web app for network technicians. React, TypeScript, Spring Boot, PostgreSQL."
2. **Live link**, the test logins and the demo video link at the very top, with a one-line note that the free backend may take up to a minute to wake
3. 4–6 screenshots: login, ticket list (phone), detail with photos, update with photo, offline banner, dashboard (desktop)
4. Features (6–8 bullets)
5. Architecture diagram (from this doc)
6. Tech stack
7. How offline sync works (3–4 sentences, link to `queue.ts` and `useSync.ts`)
8. How to run locally (PostgreSQL, backend, web) step by step
9. How it's tested (JUnit, Vitest, Playwright) and how to run the tests
10. What I'd add next: refresh tokens, Flyway migrations, web push, CI pipeline, monitoring

**Demo video (60–90 seconds, no voice needed; captions are fine)**

1. Log in as technician on the phone (installed PWA), show the ticket list (10 s)
2. Open a critical ticket, tap Navigate (10 s)
3. Mark In Progress, take a photo, save (15 s)
4. Airplane mode on, resolve with a note and photo, show the offline banner (15 s)
5. Airplane mode off, show it sync (10 s)
6. Switch to the laptop, log in as supervisor, show the dashboard updated and the photo in the ticket timeline (15 s)

Record the phone with Android's built-in screen recorder and the laptop with any screen recorder, upload to YouTube as unlisted, and link it.

**Checklist before you send the resume**

- [ ] Repo public, with no passwords, keys or `.env` files committed
- [ ] Live link and video open without a login (other than the test accounts)
- [ ] Backend awake and Supabase project not paused on the day you apply
- [ ] Postman collection in the repo
- [ ] Commit history across several days with clear messages
- [ ] GitHub and live links on the resume and in your message to the recruiter

## Resume bullets and interview preparation

Use these bullets only for what you actually built; delete any line that doesn't match your final app.

**FieldOps: Field Service Ticketing Platform** · Java, Spring Boot, PostgreSQL, React, TypeScript, Tailwind CSS · Live | GitHub | Demo

- Built a full-stack field service web app where supervisors create and assign network fault tickets and technicians update them from their phones with notes, photos and GPS location, with role-based access control.
- Developed a Spring Boot REST API secured with Spring Security and JWT in httpOnly cookies, enforcing ticket ownership and status-transition rules in the service layer.
- Implemented offline-first updates in a React PWA: updates and photos queue in IndexedDB and sync automatically on reconnect, with idempotent client-generated IDs preventing duplicate records on retry.
- Built a supervisor dashboard backed by aggregated JPA `GROUP BY` queries, and deployed the system on Vercel, Render and Supabase (PostgreSQL + object storage).
- Tested with JUnit/Mockito, Vitest and Playwright end-to-end tests, including an offline sync scenario.

**Questions you should be ready for**

| Question | What your answer should cover |
| --- | --- |
| Walk me through the project. | Problem (field updates over calls, no proof), users, the flow, the offline feature, the stack, the live link. Under 2 minutes. |
| Why React and not Next.js or Angular? | Spring is already the server and every page is behind a login, so server rendering adds nothing; the core feature needs the app to run fully in the browser. Next.js fits SEO-heavy or full-stack JS projects; Angular is common in enterprise teams and you'd pick it up if the team uses it. |
| Why a monolith and not microservices? | One team, 11 endpoints, clear package boundaries (modular monolith). Microservices add gateways, service discovery, distributed transactions and more deployments. Stateless JWT already allows horizontal scaling; photo upload and notifications would be split out first if needed. |
| Why PostgreSQL? Why not MongoDB? | Data is relational with foreign keys, a unique constraint for idempotency and `GROUP BY` reporting. A document database would push joins and consistency into application code. |
| How does offline sync work? | Service worker for the app shell, IndexedDB queue with photos as Blobs, triggers (online, visibility, Sync now), one at a time oldest first, `clientUpdateId` for idempotency, 4xx not retried, 401 waits for login, server is the source of truth. |
| What is idempotency and why did you need it? | Doing the same request twice has the same effect as once. The phone can send an update, lose connection before the reply, and resend it. The unique ID stops a duplicate row. |
| How does JWT auth work here? Why a cookie and not localStorage? | Login checks the BCrypt hash and returns a signed token with id and role in an httpOnly cookie; the filter validates it on every request; stateless sessions. localStorage can be read by any script, so one XSS bug leaks the token; httpOnly can't be read by scripts. `SameSite=Strict` blocks CSRF. |
| What are CORS and CSRF? | CORS: the browser rule that decides which other origins may read your API's responses; we allow only our site. CSRF: tricking a logged-in browser into sending a request from another site; blocked here by `SameSite=Strict`. |
| What is a PWA? What does the service worker do? | A website that can be installed and work offline: a manifest (name, icons) plus a service worker, a script that sits between the page and the network. Ours caches the app shell, not API data. |
| How do you stop a technician from opening another technician's ticket? | Ownership check in the service layer, not just hiding it in the UI; returns 403. |
| Where are photos stored? Is it secure? | Resized in the browser, stored in a private Supabase Storage bucket with UUID names, served only through an authenticated endpoint with an access check; type and size validated. Same pattern as S3. |
| Explain the N+1 problem. | Listing 20 tickets then loading each one's site and technician separately = 1 + 20 + 20 queries. Fixed with `@EntityGraph` to fetch them in one join. |
| What was the hardest bug? | Have a real one ready. Multipart JSON parts (415 errors), cookies not being sent, or the service worker serving an old build are likely candidates. |
| What would you change for production? | Refresh tokens, Flyway migrations, rate limiting on login, monitoring and logs, CI running the tests, paid hosting without cold starts. |
| How would this scale to thousands of technicians? | Pagination (already there), indexes on `assigned_to` and `status`, stateless backend behind a load balancer, object storage for photos (already there), caching dashboard counts. |
| How did you use AI while building? | Honestly: for boilerplate, setup and debugging, while you designed the data model, the sync logic and the rules, reviewed every line and can explain it. |

**Concepts to revise the night before:**

- **Core Java** (Indian interviews ask this heavily even for full-stack roles): OOP, collections, `equals`/`hashCode`, streams, exceptions.
- **Spring Boot:** layering, dependency injection, `@Transactional`, JPA relationships and N+1.
- **SQL:** joins, indexes, `GROUP BY` / `HAVING`, normalisation.
- **REST:** status codes.
- **React:** hooks (`useState`, `useEffect` and cleanup, `useMemo`, `useCallback`), keys and re-renders, controlled forms, context.
- **The browser:** cookies, CORS, the event loop and promises.

## Using AI while building

Use AI to go faster, but make sure you understand the key parts well enough to explain them in an interview. If you can't explain a file line by line, you don't own it yet.

**Rules**

1. Give the AI this whole document as context at the start of each session, so it follows the same names, endpoints and structure.
2. Ask for one file or one feature at a time, never "build the whole app".
3. Study these until you can explain them without notes: `Status.canMoveTo`, the ownership check, the idempotency check, the cookie setup in `AuthCookies` and `JwtAuthFilter`, `queue.ts` and `useSync.ts`. They are what interviewers will ask about.
4. After each generated file, ask "explain this file line by line" and read the answer.
5. Run and test each piece before asking for the next one.
6. Commit your own changes in small steps.

**Starter prompt for each session**

```
I'm building FieldOps. The full requirements document is below; follow its
names, endpoints, package structure and folder structure exactly.
Today I'm working on: <Day N task>.
Give me one file at a time. After each file, wait for me to say it works.
Don't add libraries or features that aren't in the document.
Explain any non-obvious line with a short comment.

<paste this document>
```

**Useful follow-up prompts**

- "Here's the error and the file. What's the cause? Explain before giving the fix."
- "Review my `useSync.ts` for race conditions and edge cases. Don't rewrite it; list problems."
- "Ask me 10 interview questions about this file, one at a time, and tell me what my answer missed."
- "Write JUnit tests for `TicketService` covering the rules in section Backend design."

**Keeping this document:** it lives in the repo root as `FieldOps Project Requirements Document.md`, so it's versioned with the code. When an AI tool can't take the whole file, paste the API specification and Database design sections so it stays consistent.
