# FieldOps: Project Requirements Document

Network maintenance field app · React Native + Spring Boot · Oct 13, 2026

## Overview

FieldOps is a cross-platform mobile app that lets field technicians receive, update and close network fault tickets, with a Spring Boot backend and a small supervisor dashboard. It is built in 6–7 days as a portfolio project for an Application Developer role at a telecom PSU.

**The problem.** A telecom operator runs Wi-Fi, fibre and network equipment at hundreds of sites such as railway stations. When something breaks, a technician is sent to fix it. Updates often happen over phone calls and WhatsApp, so supervisors cannot see progress and there is no photo proof or location record.

**The solution.** Tickets are created centrally and assigned to technicians. The technician sees their tickets on the phone, opens directions to the site, marks progress, attaches photos and GPS location, and resolves the ticket. Updates made without internet are saved on the phone and sent automatically when the connection returns.

**Users.**

- **Technician:** sees only their assigned tickets and updates them.
- **Supervisor:** sees all tickets, creates and assigns tickets, and views summary counts.

**Why this project for this role.** It shows mobile skills the role asks for (React Native, camera, GPS, offline storage), backend skills you already have (Spring Boot, MySQL, JWT), and an understanding of the kind of operational software a telecom and railway-network organisation uses. Keep the name and visuals generic: no RailTel logo, name or branding anywhere in the app or repo.

## Scope

Build the MVP first and only start stretch goals once every MVP item works end to end. A finished small app beats an unfinished big one.

| Priority | Feature | Notes |
| --- | --- | --- |
| MVP | Login with JWT, two roles | Seeded users, no sign-up screen |
| MVP | Technician: list of assigned tickets | Filter by status, pull to refresh |
| MVP | Ticket detail | Site, issue, priority, map link, update history |
| MVP | Update ticket status with a note | Assigned → In Progress → Resolved |
| MVP | Attach a photo from the camera | One or more photos per update |
| MVP | Capture GPS location with each update | Latitude and longitude saved |
| MVP | Offline queue with auto-sync | Simple version, described in Offline sync design |
| MVP | Supervisor: all tickets + summary counts | Counts by status and priority |
| MVP | Supervisor: create and assign a ticket | Simple form |
| Stretch | Push notification on new assignment | Expo Notifications |
| Stretch | Dark mode | Follow the system theme |
| Stretch | Small Flutter version of 2 screens | Only if time remains after Day 7 |
| Stretch | Swagger API docs | springdoc-openapi, about 30 minutes |

**Out of scope:** user registration, password reset, chat, real maps inside the app (we open Google Maps instead), cloud photo storage, multi-language, and a web admin panel.

## Prerequisites

Install everything on Day 0 or the morning of Day 1, so the build days go to code. Use the latest stable versions at the time you install.

**Software to install**

| Tool | Why you need it | Check it works |
| --- | --- | --- |
| JDK 17 or 21 | Spring Boot 3 needs Java 17+ | `java -version` |
| IntelliJ IDEA | Backend code | Opens a Spring project |
| MySQL 8 + MySQL Workbench | Database | Can create a schema |
| Postman | Test APIs before the app exists | Sends a request |
| Node.js LTS (20+) | Runs Expo and the React Native tools | `node -v` |
| VS Code | App code | — |
| Expo Go app on your Android phone | Run the app on a real device | Scans a QR code |
| Git + GitHub account | Version control and portfolio | `git --version` |
| Expo account (free) | Build the APK with EAS | `npx eas-cli login` |
| Android Studio (optional) | Emulator if your phone isn't available | Starts an emulator |

**Network setup.** Your phone and laptop must be on the same Wi-Fi. The app calls the backend using your laptop's local IP address (for example `http://192.168.1.5:8080`), not `localhost`, because `localhost` on the phone means the phone itself. Find it with `ipconfig` on Windows. Allow port 8080 through Windows Firewall if requests time out.

**Knowledge to brush up (half a day, before Day 2)**

- React Native basics: `View`, `Text`, `TextInput`, `Pressable`, `FlatList`, `StyleSheet`, `Image`. They replace HTML tags and CSS.
- React Navigation: stack navigator and bottom tabs.
- Expo Router or React Navigation; this doc uses **React Navigation** because it's explicit and easier to explain.
- TanStack Query (React Query): `useQuery` and `useMutation`.
- Expo modules: `expo-image-picker` (camera), `expo-location` (GPS), `@react-native-community/netinfo` (network status), `@react-native-async-storage/async-storage` (local storage), `expo-secure-store` (token storage).
- Spring Security 6 with JWT. You may already know this; if not, it's the riskiest backend piece, so do it on Day 1.

## Architecture and tech stack

Three parts: a React Native app on the phone, one Spring Boot REST API, and MySQL plus a photo folder on the server. Every request, including replayed offline updates, passes through the JWT filter.

&#91;embedded content: system architecture · app, API, storage\]

Requests flow top to bottom through the backend layers; the offline queue sends through the same API once the phone is back online.

| Layer | Technology | Used for |
| --- | --- | --- |
| Mobile | React Native (Expo), TypeScript | One codebase for Android (and iOS) |
| Navigation | React Navigation (stack + bottom tabs) | Screen flow per role |
| Server data | TanStack Query + axios | Fetching, caching, refetching |
| Local storage | AsyncStorage, expo-secure-store | Offline queue; encrypted token |
| Device | expo-image-picker, expo-location, NetInfo | Camera, GPS, connection status |
| Backend | Spring Boot 3, Java 17/21 | REST API |
| Security | Spring Security 6, JJWT, BCrypt | Login, roles, protected endpoints |
| Data | Spring Data JPA, MySQL 8 | Persistence, grouped queries |
| Build | Maven, EAS Build | Backend jar, Android APK |
| Testing | JUnit 5, Mockito, Postman | Service tests, API checks |

## Database design

Five MySQL tables in a schema called `fieldops`. Let JPA create them with `ddl-auto=update` during development; that's fine for a portfolio project, and you can say in interviews that production would use Flyway migrations.

**Relationships:** a site has many tickets; a ticket has many updates; an update has many attachments; a user (technician) is assigned many tickets.

**users**

| Column | Type | Rules |
| --- | --- | --- |
| id | BIGINT | PK, auto increment |
| name | VARCHAR(100) | not null |
| email | VARCHAR(120) | not null, unique (used to log in) |
| password\_hash | VARCHAR(255) | BCrypt hash, never plain text |
| role | VARCHAR(20) | TECHNICIAN or SUPERVISOR |
| phone | VARCHAR(15) | optional |
| created\_at | DATETIME | set automatically |

**sites**

| Column | Type | Rules |
| --- | --- | --- |
| id | BIGINT | PK |
| code | VARCHAR(20) | unique, for example NGP-01 |
| name | VARCHAR(120) | for example Central Station, Platform 3 |
| city | VARCHAR(60) | not null |
| latitude | DECIMAL(9,6) | for the Navigate button |
| longitude | DECIMAL(9,6) | for the Navigate button |

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
| created\_at, updated\_at | DATETIME | set automatically |
| resolved\_at | DATETIME | set when status becomes RESOLVED |

**ticket\_updates** (the history of every change)

| Column | Type | Rules |
| --- | --- | --- |
| id | BIGINT | PK |
| ticket\_id | BIGINT | FK → tickets.id |
| updated\_by | BIGINT | FK → users.id |
| from\_status | VARCHAR(15) | status before the update |
| to\_status | VARCHAR(15) | status after the update |
| note | VARCHAR(500) | what the technician did |
| latitude, longitude | DECIMAL(9,6) | where the update was made, optional |
| client\_update\_id | VARCHAR(36) | UUID made on the phone, **unique**: stops duplicates when an offline update is retried |
| device\_time | DATETIME | when it happened on the phone (may be earlier than created\_at if offline) |
| created\_at | DATETIME | when the server received it |

**attachments**

| Column | Type | Rules |
| --- | --- | --- |
| id | BIGINT | PK |
| update\_id | BIGINT | FK → ticket\_updates.id |
| file\_name | VARCHAR(200) | stored name (UUID + extension) |
| content\_type | VARCHAR(50) | image/jpeg or image/png only |
| size\_bytes | BIGINT | max 5 MB |
| created\_at | DATETIME | set automatically |

Photos are saved to a local folder (`uploads/`) on the server, and only the file name goes in the database. Production would use object storage such as S3; say that in interviews.

**Seed data** (inserted by a `DataSeeder` class on startup, so passwords get proper BCrypt hashes):

- 1 supervisor: `supervisor@fieldops.dev` / `Password@123`
- 2 technicians: `tech1@fieldops.dev`, `tech2@fieldops.dev` / `Password@123`
- 5 sites with real coordinates from Google Maps
- 10 tickets with mixed priorities and statuses, 4 assigned to tech1 and 4 to tech2

## Backend design (Spring Boot)

A standard layered Spring Boot 3 app: controller → service → repository, with DTOs at the edges so entities never leave the service layer. This is the same pattern as your Student Management System, plus JWT security and file upload.

**Create the project** at start.spring.io: Maven, Java 17 or 21, group `com.fieldops`, artifact `fieldops-api`. Dependencies: Spring Web, Spring Data JPA, MySQL Driver, Spring Security, Validation, Lombok. Then add `io.jsonwebtoken:jjwt-api`, `jjwt-impl` and `jjwt-jackson` to `pom.xml` for JWT.

**Package structure**

```
com.fieldops
├── FieldOpsApplication.java
├── config/
│   ├── SecurityConfig.java        // filter chain, CORS, which URLs need which role
│   ├── DataSeeder.java            // seed users, sites, tickets on startup
│   └── WebConfig.java             // CORS for local development
├── security/
│   ├── JwtService.java            // create + validate tokens
│   ├── JwtAuthFilter.java         // reads "Authorization: Bearer ..." on every request
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
│   └── response/ LoginResponse  TicketSummaryDto  TicketDetailDto
│                 UpdateDto  DashboardDto  ApiError
├── service/
│   ├── AuthService.java
│   ├── TicketService.java         // list, detail, create, assign, update status
│   ├── UpdateService.java         // save update + photos, idempotent by clientUpdateId
│   ├── FileStorageService.java    // save photo, validate type and size
│   └── DashboardService.java
├── controller/
│   ├── AuthController  TicketController  AttachmentController
│   └── DashboardController  UserController  SiteController
└── exception/
    ├── NotFoundException  BadRequestException  ForbiddenException
    └── GlobalExceptionHandler.java // @RestControllerAdvice → ApiError JSON
```

**Key rules the service layer enforces**

1. A technician can only see and update tickets assigned to them. Check `ticket.assignedTo.id == currentUser.id` in `TicketService`, and throw `ForbiddenException` otherwise.
2. Status can only move forward: ASSIGNED → IN\_PROGRESS → RESOLVED. Moving from IN\_PROGRESS directly to RESOLVED is allowed; going backwards is rejected with 400. Put this in one method, `Status.canMoveTo(Status next)`, so it's easy to show in an interview.
3. A note is required when resolving.
4. Every status change creates a `TicketUpdate` row, so the ticket has a full history.
5. If an update arrives with a `client_update_id` that already exists, return the existing result instead of saving it again. This makes offline retries safe (idempotency).
6. Photos: only `image/jpeg` and `image/png`, max 5 MB, saved with a random UUID file name so users can't overwrite files or guess paths.

**Security**

- Passwords hashed with `BCryptPasswordEncoder`.
- Stateless sessions: `SessionCreationPolicy.STATELESS`.
- Token lifetime 24 hours; the token holds the user id, email and role. No refresh tokens for this project; if the token expires, the app sends the user back to login.
- Role checks: `/api/auth/**` is public; `/api/dashboard/**`, `POST /api/tickets` and `PATCH /api/tickets/*/assign` need SUPERVISOR; everything else needs any logged-in user. Use `@PreAuthorize("hasRole('SUPERVISOR')")` on those methods and enable `@EnableMethodSecurity`.
- The JWT secret lives in `application.properties` for development and in an environment variable for anything else. Never commit a real secret to GitHub.

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
server.port=8080
spring.datasource.url=jdbc:mysql://localhost:3306/fieldops?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=${DB_PASSWORD:root}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=20MB
app.jwt.secret=${JWT_SECRET:change-this-to-a-long-random-string-of-32-plus-chars}
app.jwt.expiration-ms=86400000
app.upload-dir=uploads
```

**Watch out for:** infinite JSON recursion if you ever return entities directly (always map to DTOs), and the N+1 query problem when listing tickets with their site and technician. Use `@EntityGraph(attributePaths = {"site", "assignedTo"})` on the list query. Both make good interview talking points.

## API specification

Ten endpoints cover the whole app. Base URL: `http://<laptop-ip>:8080`. Every endpoint except login needs the header `Authorization: Bearer <token>`. Test each one in Postman before building its screen, and save the collection to the repo as `postman/FieldOps.postman_collection.json`.

| # | Method | Path | Role | Purpose |
| --- | --- | --- | --- | --- |
| 1 | POST | /api/auth/login | Public | Log in, get token |
| 2 | GET | /api/auth/me | Any | Current user profile |
| 3 | GET | /api/tickets | Any | List tickets (technician: own only; supervisor: all) |
| 4 | GET | /api/tickets/{id} | Any (own for technician) | Ticket detail with site and update history |
| 5 | POST | /api/tickets/{id}/updates | Technician | Change status, add note, GPS, photos |
| 6 | GET | /api/attachments/{id} | Any with access | Download a photo |
| 7 | POST | /api/tickets | Supervisor | Create ticket |
| 8 | PATCH | /api/tickets/{id}/assign | Supervisor | Assign to technician |
| 9 | GET | /api/dashboard/summary | Supervisor | Counts for dashboard |
| 10 | GET | /api/users?role=TECHNICIAN and /api/sites | Supervisor | Dropdown data for the create form |

Photos are served through endpoint 6, not as public static files, so only people with access to the ticket can see them.

### 1. POST /api/auth/login

```json
// Request
{ "email": "tech1@fieldops.dev", "password": "Password@123" }

// 200 OK
{
  "token": "eyJhbGciOi...",
  "user": { "id": 2, "name": "Ravi Kumar", "email": "tech1@fieldops.dev", "role": "TECHNICIAN" }
}
```

Errors: 400 if a field is missing, 401 `Invalid email or password` (same message for both cases, so attackers can't tell which emails exist).

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

- `data`: a JSON part (send it with content type `application/json`)
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
- **200 OK** with the existing update if this `clientUpdateId` was already saved. The app treats 200 and 201 the same: success, remove it from the queue.
- **400** invalid status move, missing note on resolve, bad file type, file over 5 MB.
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

## Mobile app design (React Native + Expo)

One Expo app with TypeScript serves both roles; after login, the navigator shows technician screens or supervisor screens based on `user.role`.

**Create the project**

```bash
npx create-expo-app@latest fieldops-app --template blank-typescript
cd fieldops-app
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
npx expo install expo-secure-store @react-native-async-storage/async-storage @react-native-community/netinfo
npx expo install expo-image-picker expo-location expo-crypto
npm install @tanstack/react-query axios
```

Use `npx expo install` for native modules so you get versions that match your Expo SDK. `expo-crypto` gives you `randomUUID()` for `clientUpdateId`.

**Folder structure**

```
fieldops-app/
├── App.tsx                      // QueryClientProvider + AuthProvider + RootNavigator
├── app.json                     // app name, icon, camera/location permission text
└── src/
    ├── api/
    │   ├── client.ts            // axios instance, base URL, adds Bearer token, 401 → logout
    │   ├── auth.ts              // login(), me()
    │   ├── tickets.ts           // getTickets(), getTicket(), addUpdate(), createTicket(), assign()
    │   └── dashboard.ts         // getSummary()
    ├── auth/
    │   └── AuthContext.tsx      // user, token, login(), logout(); token in SecureStore
    ├── offline/
    │   ├── queue.ts             // add(), getAll(), remove(), count() using AsyncStorage
    │   └── useSync.ts           // listens to NetInfo, flushes the queue when online
    ├── navigation/
    │   └── RootNavigator.tsx    // Login stack OR Technician tabs OR Supervisor tabs
    ├── screens/
    │   ├── LoginScreen.tsx
    │   ├── technician/
    │   │   ├── MyTicketsScreen.tsx
    │   │   ├── TicketDetailScreen.tsx
    │   │   └── UpdateTicketScreen.tsx
    │   ├── supervisor/
    │   │   ├── DashboardScreen.tsx
    │   │   ├── AllTicketsScreen.tsx   // reuses TicketCard
    │   │   └── CreateTicketScreen.tsx
    │   └── ProfileScreen.tsx    // name, role, pending sync count, logout
    ├── components/
    │   ├── TicketCard.tsx  PriorityBadge.tsx  StatusChip.tsx
    │   ├── OfflineBanner.tsx    // "You're offline · 2 updates waiting to sync"
    │   ├── PhotoPicker.tsx  EmptyState.tsx  ErrorState.tsx
    │   └── StatCard.tsx
    ├── types/index.ts           // Ticket, TicketDetail, Update, User, enums
    └── theme.ts                 // colours, spacing, font sizes
```

**Screens**

| Screen | Role | What it shows | Main actions |
| --- | --- | --- | --- |
| Login | All | Email, password, error message | Log in |
| My Tickets | Technician | Cards: ticket no, title, site, priority badge, status chip; filter chips at top | Pull to refresh, tap card |
| Ticket Detail | Technician | Full description, site, assigned date, update timeline with photos | Navigate (opens Google Maps), Update |
| Update Ticket | Technician | Status picker (only allowed next statuses), note box, photo thumbnails, "Location captured" line | Take photo, Save |
| Dashboard | Supervisor | Stat cards (Open, In Progress, Resolved today, Critical open), per-technician load | Tap a card to see that list |
| All Tickets | Supervisor | Same cards as My Tickets, all technicians | Tap to open detail, Assign |
| Create Ticket | Supervisor | Title, description, category, priority, site, technician pickers | Create |
| Profile | All | Name, role, pending updates count | Sync now, Log out |

Navigation: technicians get bottom tabs **Tickets** and **Profile**; supervisors get **Dashboard**, **Tickets**, **New** and **Profile**. Ticket Detail and Update Ticket are stack screens pushed on top.

**State management**

- Server data (tickets, dashboard) → TanStack Query. Query keys: `['tickets', filters]`, `['ticket', id]`, `['dashboard']`. After a successful update, call `queryClient.invalidateQueries({ queryKey: ['tickets'] })` and the ticket's key.
- Logged-in user and token → `AuthContext`. Token stored in `expo-secure-store` (encrypted), not AsyncStorage.
- Offline queue → AsyncStorage via `queue.ts`.
- Form state → local `useState`. No Redux needed; you can say so in an interview and explain why.

**Useful code patterns**

Open directions in Google Maps:

```ts
import { Linking } from 'react-native';
const openMaps = (lat: number, lng: number) =>
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
```

Take a photo:

```ts
import * as ImagePicker from 'expo-image-picker';
const takePhoto = async () => {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return;
  const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (!result.canceled) setPhotos(p => [...p, result.assets[0].uri]);
};
```

Get location (don't block saving if it fails):

```ts
import * as Location from 'expo-location';
const getCoords = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
};
```

Send the multipart update from React Native:

```ts
const form = new FormData();
form.append('data', { string: JSON.stringify(payload), type: 'application/json' } as any);
// If the line above gives a 415 error on your setup, send the JSON as a plain text part named "data"
// and read it in Spring with @RequestPart("data") String json + ObjectMapper.
photos.forEach((uri, i) =>
  form.append('photos', { uri, name: `photo_${i}.jpg`, type: 'image/jpeg' } as any));
await api.post(`/api/tickets/${ticketId}/updates`, form, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

Multipart JSON parts are the most common thing that breaks on Day 4. If it fails, use the fallback in the comment and move on; don't lose half a day on it.

**UI rules for a polished look:** every list has a loading state, an empty state and an error state with Retry; buttons show a spinner and are disabled while saving; priority colours are consistent everywhere (Critical red, High orange, Medium blue, Low grey); tap targets are at least 44 px tall.

## User flows

The technician's update flow is the heart of the app: every save either reaches the server or waits in the queue until it can.

&#91;embedded content: technician update flow · online and offline paths\]

A network error while sending also puts the update in the queue. Only a 400, 403 or 404 stops it, because retrying won't change the answer.

**Login flow**

1. App starts and reads the token from SecureStore.
2. Token found → call `/api/auth/me`. Success → go to the home screen for that role. 401 → clear token, show Login.
3. No token → show Login. On success, save the token and user, then go to the home screen.

**Technician flow**

1. My Tickets loads assigned tickets, Critical first.
2. Tap a ticket → Ticket Detail with the history timeline.
3. Tap **Navigate** → Google Maps opens with directions to the site.
4. On site, tap **Update** → choose In Progress, add a note, take photos. Location is captured in the background.
5. Tap **Save** → follows the diagram above.
6. Later, choose Resolved with a closing note (required) and an "after" photo.

**Supervisor flow**

1. Dashboard shows open, in-progress, resolved-today and critical-open counts, plus each technician's active ticket count.
2. Tap **New** → fill in title, category, priority, site, technician → Create. The ticket appears on that technician's list on their next refresh.
3. Open any ticket → see its full update timeline with photos and locations → **Reassign** if needed.

## Offline sync design

Offline mode is a simple queue: if an update can't reach the server, it's saved on the phone and replayed through the same endpoint later. The server's `clientUpdateId` check makes replays safe. This is about 80 lines of code and the strongest interview story in the project.

**What one queued item looks like** (stored as a JSON array under the AsyncStorage key `fieldops.queue`):

```ts
type QueuedUpdate = {
  clientUpdateId: string;     // UUID from expo-crypto, created when the user taps Save
  ticketId: number;
  toStatus: 'IN_PROGRESS' | 'RESOLVED';
  note: string;
  latitude?: number;
  longitude?: number;
  deviceTime: string;         // ISO time on the phone when Save was tapped
  photoUris: string[];        // local file URIs from the camera
  attempts: number;
  lastError?: string;
};
```

**When the user taps Save**

1. Build the update and give it a new `clientUpdateId`.
2. Check `NetInfo.fetch()`. If online, try sending it.
3. If the request succeeds (200 or 201), refresh the ticket and go back.
4. If there is no connection, or the request fails with a network error or timeout, add it to the queue, show the toast "Saved offline. Will sync when you're back online", and update the ticket on screen to the new status with a small "Pending sync" label.
5. If the server returns 400, 403 or 404, do **not** queue it. Show the error message, because retrying won't fix it.

**When the sync runs** (`useSync` hook, mounted once in `App.tsx`)

- When `NetInfo` reports the connection came back.
- When the app returns to the foreground (`AppState` change to `active`).
- When the user taps **Sync now** on the Profile screen.

**How the sync works**

1. If a sync is already running, stop (use a simple `isSyncing` flag so two syncs can't run at once).
2. Read the queue and send items **one at a time, oldest first**, so updates to the same ticket stay in order.
3. 200 or 201 → remove the item from the queue.
4. Network error → stop the loop and try again next time; keep the rest of the queue as it is.
5. 400, 403 or 404 → remove the item, keep it in a separate `fieldops.failed` list, and show it on the Profile screen so the user knows it didn't go through. Example: the supervisor reassigned the ticket while the technician was offline.
6. After the loop, invalidate the ticket queries so lists refresh.

**Conflict rule:** the server is the source of truth. Status rules are checked when the update arrives, so an offline update that's no longer valid is rejected with a clear reason, not silently applied. `deviceTime` records when the work actually happened; `created_at` records when the server received it.

**Why photos still work offline:** the camera saves images to the app's local cache, and the queue stores their URIs. Note for the interview: the OS can clear the cache, so production code would copy them to `FileSystem.documentDirectory` with `expo-file-system`. If you have an hour spare on Day 5, do that.

**How to demo it:** turn on airplane mode, resolve a ticket with a photo, show the offline banner with "1 update waiting", turn airplane mode off, and show the ticket updated in the supervisor's dashboard. Put this in the demo video.

## 7-day build plan

Plan on 5–6 focused hours a day. Each day ends with a "done when" check; don't start the next day until it passes. Commit to GitHub at the end of every day with a clear message, so the history shows steady work.

**Day 0 (evening): setup**

- [ ] Install everything in Prerequisites
- [ ] Create two GitHub repos, `fieldops-api` and `fieldops-app`, or one repo with `backend/` and `mobile/` folders
- [ ] Run a blank Expo app on your phone through Expo Go

**Day 1: backend foundation and auth**

- [ ] Generate the Spring Boot project, connect MySQL
- [ ] Create all 5 entities and enums, and the repositories
- [ ] `DataSeeder` with users, sites and tickets
- [ ] `JwtService`, `JwtAuthFilter`, `SecurityConfig`, `AuthController` (login, me)
- [ ] `GlobalExceptionHandler` with the `ApiError` shape

* Done when: Postman login returns a token, and `/api/auth/me` with that token returns the user (and returns 401 without it).

**Day 2: backend ticket APIs**

- [ ] DTOs and mapping methods
- [ ] Endpoints 3, 4, 7, 8, 9, 10
- [ ] Endpoint 5 with photos, `FileStorageService`, idempotency check, and status rule
- [ ] Endpoint 6 to download a photo with access check
- [ ] Save the Postman collection to the repo

* Done when: every endpoint works in Postman, including the 400 and 403 cases.

**Day 3: app shell, login, ticket list**

- [ ] Navigation for both roles, `AuthContext`, SecureStore
- [ ] `api/client.ts` with token header and 401 → logout
- [ ] Login screen
- [ ] My Tickets with `TicketCard`, badges, filter chips, pull to refresh, loading / empty / error states

* Done when: you log in as tech1 on your phone and see only tech1's tickets from the real backend.

**Day 4: ticket detail and update with camera + GPS**

- [ ] Ticket Detail with update timeline and photos, Navigate button
- [ ] Update Ticket screen: allowed statuses only, note, camera, location
- [ ] Multipart upload working (use the fallback if needed)

* Done when: you resolve a ticket with 2 photos on your phone and see the photos in the detail timeline.

**Day 5: offline sync**

- [ ] `queue.ts` and `useSync`
- [ ] Offline banner with pending count
- [ ] "Pending sync" label on queued tickets, failed list on Profile

* Done when: the airplane-mode demo in Offline sync design works three times in a row.

**Day 6: supervisor screens and polish**

- [ ] Dashboard with stat cards and per-technician load
- [ ] All Tickets, Create Ticket, Assign
- [ ] App icon, splash screen, consistent colours and spacing
- [ ] Fix the bugs found while testing (use the Testing checklist)

* Done when: you can create a ticket as supervisor, assign it to tech1, and see it appear on the technician's phone.

**Day 7: ship it**

- [ ] Build an APK: `npx eas-cli build -p android --profile preview` (set `"buildType": "apk"` in `eas.json` under the preview profile)
- [ ] Take 6–8 screenshots
- [ ] Record a 60–90 second demo video
- [ ] Write both READMEs
- [ ] Add the project to your resume and LinkedIn

* Done when: someone else can install the APK from your link and watch your video without asking you anything.

**Note on the APK:** the APK talks to your laptop's IP, so it only works on the same Wi-Fi while your backend runs. That's fine for the demo video. If you want a live link, deploy the backend to a free tier such as Render or Railway with a hosted MySQL, change the base URL, and rebuild. Treat that as optional.

## Testing checklist

Run through this on Day 6 on a real phone. Add 4–6 JUnit tests on the backend too; they take an hour and give you something concrete to say when asked "how did you test it?"

**Backend unit tests (JUnit 5 + Mockito)**

- [ ] `Status.canMoveTo`: allowed and rejected moves
- [ ] `TicketService`: technician gets 403 on another technician's ticket
- [ ] `UpdateService`: same `clientUpdateId` twice saves only one row
- [ ] Resolve without a note returns 400
- [ ] `FileStorageService` rejects a PDF and a 6 MB image

**Auth and access**

- [ ] Wrong password shows an error; app doesn't crash
- [ ] Token survives an app restart (still logged in)
- [ ] Logout clears the token and the cached ticket data
- [ ] Technician never sees supervisor tabs

**Tickets**

- [ ] Filter chips change the list
- [ ] Empty filter shows the empty state, not a blank screen
- [ ] Backend stopped → error state with Retry, which works once the backend is back
- [ ] Navigate opens Google Maps at the right site

**Updates**

- [ ] Only valid next statuses are offered
- [ ] Camera permission denied → clear message, can still save without a photo
- [ ] Location permission denied → can still save; the update has no location
- [ ] Save button can't be double-tapped into two updates

**Offline**

- [ ] Airplane mode → save → banner shows 1 pending
- [ ] Back online → syncs within a few seconds, banner disappears
- [ ] Two offline updates to the same ticket sync in the right order
- [ ] Kill the app while offline, reopen online → queue still syncs
- [ ] Supervisor reassigns while technician is offline → the update fails cleanly and shows in the failed list

**Supervisor**

- [ ] Dashboard numbers match the database
- [ ] Created ticket appears on the technician's phone after refresh

## Deliverables

The hiring manager will spend about two minutes on this, so the README must show the app working before they read anything. Lead with the video and screenshots.

**README for the app repo, in this order**

1. Title and one line: "FieldOps: offline-first mobile app for telecom field technicians. React Native, TypeScript, Spring Boot."
2. Demo video link and APK download link at the very top
3. 4–6 screenshots side by side: login, ticket list, detail, update with photo, offline banner, dashboard
4. Features (6–8 bullets)
5. Architecture diagram (export the one from this doc as an image)
6. Tech stack
7. How offline sync works (3–4 sentences, link to the code)
8. How to run locally (backend and app, step by step)
9. Test logins (the seed users)
10. What I'd add next: push notifications, refresh tokens, cloud photo storage, Flutter version

**Demo video (60–90 seconds, no voice needed; captions are fine)**

1. Log in as technician, show the ticket list (10 s)
2. Open a critical ticket, tap Navigate (10 s)
3. Mark In Progress, take a photo, save (15 s)
4. Airplane mode on, resolve with a note and photo, show the offline banner (15 s)
5. Airplane mode off, show it sync (10 s)
6. Log in as supervisor, show the dashboard updated and the photo in the ticket timeline (15 s)

Record the phone screen with Android's built-in screen recorder, upload to YouTube as unlisted or to Google Drive, and link it.

**Checklist before you send the resume**

- [ ] Both repos public, with no passwords or secrets committed
- [ ] README video and APK links open without a login
- [ ] Postman collection in the repo
- [ ] Commit history across several days with clear messages
- [ ] GitHub link on the resume and in your message to the manager

## Resume bullets and interview preparation

Use these bullets only for what you actually built; delete any line that doesn't match your final app.

**FieldOps: Network Maintenance App** · React Native (Expo), TypeScript, Spring Boot, MySQL · GitHub | Demo

- Built a cross-platform mobile app for field technicians to receive, update and resolve network fault tickets, with role-based access for technicians and supervisors.
- Implemented offline-first updates with a local queue that syncs automatically on reconnect, using idempotent client-generated IDs to prevent duplicate records on retry.
- Integrated device camera and GPS for photo evidence and location-tagged updates, uploaded as multipart requests to a Spring Boot REST API secured with JWT.
- Designed a supervisor dashboard with aggregated ticket metrics using grouped JPA queries, and enforced ticket status rules and access control in the service layer.

**Questions you should be ready for**

| Question | What your answer should cover |
| --- | --- |
| Walk me through the project. | Problem (field updates over calls, no proof), users, the flow, the offline feature, the stack. Under 2 minutes. |
| Why React Native and not Flutter? | You know React and TypeScript, so you could ship faster and reuse patterns. Flutter has strong performance and one UI toolkit; you'd pick it if the team uses it, and you're comfortable learning Dart. |
| How is React Native different from React for web? | Native components instead of HTML, StyleSheet and Flexbox instead of CSS, native modules for camera/GPS, navigation libraries instead of URLs, building through Expo/EAS. |
| How does offline sync work? | Queue in AsyncStorage, NetInfo trigger, one at a time oldest first, `clientUpdateId` for idempotency, 4xx not retried, server is the source of truth. |
| What is idempotency and why did you need it? | Doing the same request twice has the same effect as once. A phone can send an update, lose connection before the reply, and resend it. The unique ID stops a duplicate row. |
| How does JWT auth work here? | Login checks the BCrypt hash, returns a signed token with id and role; the filter validates it on every request; stateless sessions; stored in SecureStore on the phone. |
| How do you stop a technician from opening another technician's ticket? | Ownership check in the service layer, not just hiding it in the UI; returns 403. |
| Where are photos stored? Is it secure? | Local folder with UUID names, served only through an authenticated endpoint with an access check; type and size validated. Production: S3-style storage with signed URLs. |
| What was the hardest bug? | Have a real one ready. Multipart upload from React Native or the phone not reaching `localhost` are likely candidates. |
| What would you change for production? | Refresh tokens, Flyway migrations, cloud storage, push notifications, HTTPS, rate limiting, monitoring, tests in CI. |
| How would this scale to thousands of technicians? | Pagination (already there), indexes on `assigned_to` and `status`, stateless backend behind a load balancer, object storage for photos. |
| How did you use AI while building? | Honestly: for boilerplate and debugging, while you designed the data model, the sync logic and the rules yourself, and reviewed every line. |

**Concepts to revise the night before:** React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`), component lifecycle in React Native, FlatList performance (`keyExtractor`, avoiding inline functions in big lists), Spring Boot layering, JPA relationships and N+1, REST status codes, and basic Flutter facts (Dart, widgets, hot reload, `setState` versus Provider or Riverpod).

## Using AI while building

Use AI to go faster, but write or rewrite the key parts yourself so you can explain them in an interview. If you can't explain a file line by line, you don't own it yet.

**Rules**

1. Give the AI this whole document as context at the start of each session, so it follows the same names, endpoints and structure.
2. Ask for one file or one feature at a time, never "build the whole app".
3. Write these yourself, with AI only reviewing them: `Status.canMoveTo`, the ownership check, the idempotency check, `queue.ts` and `useSync.ts`. They are what interviewers will ask about.
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

**Keeping this document:** click the doc's name at the top, then Export → PDF (on the phone app, Export is under Share) so you have it even if this chat is gone. Paste the API specification and Database design sections into any AI tool you use when you need it to stay consistent.
