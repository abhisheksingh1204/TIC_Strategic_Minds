# PowerFusion — Codebase and Interview Guide

This guide describes the code that is present in this repository. It deliberately separates what the application **currently does** from what would be a good production improvement. That distinction matters in interviews: explain the real implementation confidently, but do not claim features that are not implemented.

## 1. Project overview

### Simple summary

PowerFusion is a household electricity-management application. A user creates a house or apartment, adds rooms and electrical devices, switches devices on and off in a visual simulator, and sees energy use and estimated cost. The application can also configure tariffs, generate bills, set daily/monthly limits, send alert emails, and show analysis charts.

### Problem, users, and features

The problem is that a normal electricity bill is delayed and property-level: it does not tell a resident which room or appliance caused the consumption. PowerFusion models consumption at device level and turns it into understandable room, property, trend, distribution, and billing views.

Primary users are household residents or property managers. The current authorization model is single-role: every authenticated user owns properties; there is no admin, tenant, or electrician role.

Main features:

- registration, login, token refresh, profile lookup, and logout;
- property and room CRUD with ownership checks;
- device placement/configuration and an interactive room simulator;
- start/stop usage sessions when device power changes;
- energy and cost calculation using device wattage, quantity, efficiency, duration, and tariffs;
- daily/monthly/range aggregation;
- analysis charts and manual correction of completed usage sessions;
- tariff configuration, bill preview, persistent bill generation, and line-item reports;
- daily/monthly billing limits and SMTP email alerts;
- authenticated support-email form.

### Technical summary

PowerFusion is a full-stack TypeScript application built as a Next.js 16 App Router monolith. React 19 client pages use Apollo Client to call a GraphQL API exposed by a Next route handler. Apollo Server composes modular schemas and resolvers. Resolver functions delegate business logic to service classes/functions, which use Mongoose models backed by MongoDB. JWT access and refresh tokens provide authentication. Recharts renders analysis, Tailwind/CSS and reusable UI primitives render the interface, and Nodemailer sends SMTP emails.

### Why this stack fits

- **Next.js + React:** one deployable codebase for landing pages, the authenticated UI, and server endpoints.
- **TypeScript:** useful because GraphQL inputs, UI state, and energy calculations involve many structured values.
- **GraphQL + Apollo:** pages can request exactly the nested fields they need, and one `/api` endpoint covers many domain operations.
- **MongoDB + Mongoose:** property → room → equipment and time/session documents evolve easily, while schemas still enforce basic shape and indexes.
- **Recharts:** appropriate for time-series and distribution charts.
- **JWT:** stateless API authentication works naturally with GraphQL requests.

The trade-off is that GraphQL and a service layer add complexity for an application of this size. MongoDB also does not automatically enforce cross-collection relationships or cascades.

### One-minute interview answer

> PowerFusion is a full-stack smart-energy management platform I built to make electricity consumption understandable at appliance level instead of only showing a monthly property bill. Users create a house or apartment, add rooms and devices, and use a visual simulator to switch appliances on or off. Each switch creates or completes a usage session; the backend calculates energy from effective wattage and duration, applies the active tariff, aggregates data by device, room, and property, and shows analysis and billing views. I used Next.js and React with Apollo Client, a modular GraphQL service layer, MongoDB with Mongoose, JWT authentication, Recharts, and SMTP alerts. A design decision I focused on was ownership validation through the property hierarchy, so one user cannot access another user's rooms or devices. If I productionized it further, I would move tokens to secure cookies, add schema validation and rate limiting, and run aggregation and alerts as background jobs.

## 2. Architecture and complete request flow

```text
Browser / React client pages
        |
        | Apollo operation + Authorization: Bearer <access token>
        v
Next.js route handler: app/api/route.ts  (GET/POST /api)
        v
Apollo Server executable GraphQL schema
        v
Context: connect MongoDB + verify JWT + expose userId
        v
Domain resolver (thin transport adapter)
        v
Domain service (validation, authorization, business rules)
        v
Mongoose model(s) -> MongoDB collections
        v
GraphQL result -> Apollo normalized cache -> React re-render
```

This is simultaneously:

- **client-server architecture** at runtime;
- a **modular monolith** at deployment time;
- **component-based architecture** in the frontend;
- a **layered GraphQL architecture** (`typeDefs → resolvers → services → models`) in the backend;
- close to MVC, but not strict MVC: pages/components are the view, resolvers act like controllers, and Mongoose schemas are models.

### Startup flow

1. `npm run dev` runs `next dev`; `npm run build && npm start` runs production mode.
2. `app/layout.tsx` is the root layout and loads fonts/global landing CSS.
3. `/` renders `app/page.tsx`, the public landing page.
4. `/appin` redirects to `/appin/dashboard`.
5. `app/appin/layout.tsx` wraps authenticated-area pages with Apollo, React Query, tooltip, and toast providers.
6. When a client component executes `useQuery`/`useMutation`, `lib/apollo-client.ts` sends a POST to `NEXT_PUBLIC_GRAPHQL_URL` or `/api`.
7. `app/api/route.ts` runs Apollo Server. `createContext` connects to MongoDB and verifies the access token.
8. Apollo chooses a resolver from the combined schema; the resolver calls its domain service and Mongoose models.

### Concrete device-toggle flow

```text
User toggles a device in simulator/page.tsx
→ toggleDevicePower/updateDevice changes optimistic UI state
→ UPDATE_EQUIPMENT_MUTATION sends isOn
→ equipment.resolvers.ts calls updateEquipment
→ equipment.service.ts validates user → equipment → room → property ownership
→ when turning on, UsageSessionService.startForEquipment creates one active session
→ when turning off, stopForEquipment computes durationHours
→ energyKwh = effectiveWatt × durationHours / 1000
→ cost = energyKwh × resolved tariff rate
→ Equipment and UsageSession documents are saved
→ GraphQL returns updated equipment/session result
→ Apollo/UI state refreshes the simulator and analysis views
```

### Concrete bill-generation flow

```text
User chooses property and date range in BillPage
→ GENERATE_BILL_MUTATION
→ billing resolver → BillingService.generateBill
→ ownership/date validation
→ recompute daily aggregates for the requested days
→ fetch active tariff and calculate property total
→ group equipment aggregates into line items
→ save Bill and BillLineItem documents
→ evaluate configured billing limits and possibly send SMTP email
→ return Bill; UI refetches list/detail and can display a report
```

## 3. Folder and file map

The repeated four-line explanation below groups tiny related files but lists every important source file.

### Root/configuration

```text
package.json
Purpose: Dependency and script manifest (config).
How it works: Defines dev/build/start/lint and the Next, React, Apollo, GraphQL, Mongoose, JWT, bcrypt, chart, email, and UI dependencies.
Connected files: Entire application and npm.
Interview explanation: "It documents the runtime/toolchain and provides reproducible commands."

next.config.ts
Purpose: Next.js configuration.
How it works: Currently uses the default/minimal configuration.
Connected files: Next build/runtime.
Interview explanation: "There is no custom proxy or image-host configuration yet."

tsconfig.json / eslint.config.mjs / postcss.config.mjs
Purpose: TypeScript paths/compiler, lint rules, and Tailwind/PostCSS setup.
How it works: `@/` resolves project-root imports; ESLint applies Next rules; PostCSS compiles Tailwind.
Connected files: All TS/TSX and CSS.
Interview explanation: "These keep imports, type checking, style compilation, and static quality checks consistent."

readme.md
Purpose: Setup documentation.
How it works: It is still the create-next-app template.
Connected files: New developers.
Interview explanation: This is a current documentation weakness; replace it with product-specific setup and architecture.
```

`preview-reference.png`, `public/image.png`, SVGs, `favicon.ico`, and CSS files are static/design assets. `tmp_schema_view.txt` is a temporary schema artifact and `scripts/fix-tariff-property.js` is a one-off MongoDB data migration/repair script using `MONGODB_URI`, optional `PROPERTY_ID`, and `USER_ID`; neither belongs in runtime flow.

### App routes

```text
app/layout.tsx + app/globals.css
Purpose: Root server layout and public theme.
How it works: Supplies metadata/fonts and wraps all routes.
Connected files: app/page.tsx and app/appin/layout.tsx.
Interview explanation: "App Router layouts share stable UI/configuration across route subtrees."

app/page.tsx
Purpose: Public landing page (frontend page).
How it works: Renders hero, statistics, features, workflow, pricing, and links to login/signup.
Connected files: Public assets and `/appin/*` routes.
Interview explanation: "It is mostly static and can be server-rendered for fast first paint/SEO."

app/appin/layout.tsx
Purpose: Client-provider boundary for the application area.
How it works: Wraps children in ApolloProvider, QueryClientProvider, TooltipProvider, and Sonner.
Connected files: lib/apollo-client.ts and every `/appin` page.
Interview explanation: Apollo manages GraphQL server state; React Query is initialized but currently not meaningfully used and could be removed.

app/appin/page.tsx / not-found.tsx
Purpose: Redirect and local 404 handling.
How it works: `/appin` redirects to the dashboard; the 404 gives a scoped fallback.
Connected files: Next navigation.
Interview explanation: "They define route behavior without a custom router library."

app/appin/login/page.tsx
Purpose: Login form.
How it works: Controlled email/password/show-password state calls LOGIN_MUTATION, saves both tokens, shows toast, and navigates to dashboard.
Connected files: auth.queries.ts, lib/auth.ts, Apollo client.
Interview explanation: "The form handles client feedback while credential verification remains server-side."

app/appin/signup/page.tsx
Purpose: Registration form.
How it works: Validates fields/terms, calls REGISTER_MUTATION, then routes to login. Although register returns tokens, this page does not store them.
Connected files: auth service/query and login page.
Interview explanation: "It intentionally sends the user through login, though auto-login would also be possible."

app/appin/dashboard/page.tsx
Purpose: Authenticated overview.
How it works: Fetches `me` and properties, then rooms for summary/recent cards, and links to creation flows.
Connected files: AppShell, property/room queries.
Interview explanation: "It composes small GraphQL reads into a user-specific summary."

app/appin/properties/page.tsx
Purpose: Property and room management.
How it works: Search and dialog state drives property/room CRUD mutations; refetches queries and launches a room in the simulator through URL parameters.
Connected files: property/room queries, AppShell, dialog/input/button primitives.
Interview explanation: "Property is the ownership root; rooms are always operated on through an owned property."

app/appin/simulator/page.tsx
Purpose: Main interactive device simulator.
How it works: Fetches property/room/equipment/tariff data; manages drag/drop positions, selected device, MCB state, custom devices, undo/redo snapshots, dialogs, and reports; persists device/tariff changes through mutations.
Connected files: DevicePopup, SpecificationsPanel, equipment/room/property/tariff queries.
Interview explanation: "It is the richest client feature; local state gives immediate interaction and GraphQL persists domain state. It should be split into hooks/components because it is ~2,000 lines."

app/appin/analysis/page.tsx
Purpose: Consumption analysis and session correction.
How it works: Fetches properties, rooms, equipment, and usage sessions; memoizes derived day/device/month datasets; renders trend/distribution/estimate cards; edits completed session duration.
Connected files: TrendGraph, DeviceDistribution, BillEstimation and analysis/equipment queries.
Interview explanation: "Server data remains raw and the UI derives presentation datasets with memoization. At ~1,400 lines it needs decomposition."

app/appin/billing/page.tsx
Purpose: Thin billing route.
How it works: Renders BillPage.
Connected files: components/billing/BillPage.tsx.
Interview explanation: "The route stays small and delegates the feature to a reusable component."

app/appin/help/page.tsx
Purpose: FAQ/resources/support form.
How it works: Displays help cards and calls authenticated `sendSupportEmail` with controlled subject/message fields.
Connected files: AppShell, support query/service, SMTP utility.
Interview explanation: "The sender identity comes from the authenticated user rather than trusting a client-supplied email."

app/api/route.ts
Purpose: GraphQL HTTP endpoint (backend route/controller entry).
How it works: Adapts Apollo Server to Next GET and POST handlers with the executable schema and per-request context.
Connected files: schema.ts and context.ts.
Interview explanation: "One Next route hosts the modular GraphQL backend."

app/api/health/route.ts
Purpose: Database health endpoint.
How it works: Connects to MongoDB and counts users.
Connected files: db.ts and User.model.ts.
Interview explanation: Useful operational check, but exposing the user count and hitting the database collection on every probe are unnecessary.

app/api/test-email/route.ts
Purpose: Manual email test endpoint.
How it works: Sends a sample billing alert to a query-string or hard-coded address.
Connected files: lib/email.ts.
Interview explanation: This must be removed or strongly protected in production; it is an unauthenticated email-abuse endpoint and contains a personal fallback address.
```

### Shared frontend code

```text
components/app/AppShell.tsx
Purpose: Reusable authenticated navigation shell.
How it works: Sidebar links, current-page styling, user display, header, logout (clear local tokens + route home), and content slot.
Connected files: all main app pages, auth.ts, user-display.ts.
Interview explanation: "It avoids duplicating navigation and logout behavior."

components/DevicePopup.tsx / SpecificationsPanel.tsx
Purpose: Simulator device controls and specifications.
How it works: Receive selected device data and callbacks as props; edit power/state/configuration while the page owns persistence.
Connected files: simulator/page.tsx.
Interview explanation: "They are presentational/interaction children; state is lifted to the feature page."

components/analysis/TrendGraph.tsx
Purpose: Recharts line/area-style time trend.
How it works: Receives normalized labels/values, renders loading/empty/chart states and tooltip/axes.
Connected files: analysis/page.tsx.
Interview explanation: "Chart components are kept unaware of GraphQL so they are reusable/testable."

components/analysis/DeviceDistribution.tsx
Purpose: Device/room/property distribution chart.
How it works: Converts input data to chart segments, legend, colors, and empty state.
Connected files: analysis/page.tsx.
Interview explanation: "The parent owns business derivation; the child owns visualization."

components/analysis/BillEstimation.tsx
Purpose: Summary card for estimated monthly usage/cost.
How it works: Formats computed props; it makes no API calls.
Connected files: analysis/page.tsx.
Interview explanation: "A pure display component minimizes coupling."

components/billing/BillPage.tsx
Purpose: Billing feature coordinator.
How it works: Manages property/date selection, list/detail/report state, queries bills/settings/preview, and mutations for generate/limit; orchestrates BillList and BillDetail.
Connected files: all billing queries and child components.
Interview explanation: "It currently acts as feature container but at ~1,000 lines should be split into hooks, forms, report, and summary panels."

components/billing/BillList.tsx / BillDetail.tsx
Purpose: Present bill collection and one bill with line items.
How it works: Controlled selection and formatted values/dates; data is supplied by BillPage.
Connected files: BillPage and GraphQL Bill types.
Interview explanation: "Container/presentation separation keeps fetching out of display components."

components/ui/*
Purpose: Reusable UI primitives: button, input, select, dropdown, dialog, switch, tooltip, accordion, scroll area, and toast adapters.
How it works: Standardize props, accessibility behavior, styling, and composition.
Connected files: all client pages/components.
Interview explanation: "A small design system prevents one-off controls and inconsistent interaction."
```

### Client data/auth utilities

```text
lib/apollo-client.ts
Purpose: GraphQL client and authentication transport.
How it works: HttpLink calls `/api`; SetContextLink adds Bearer access token; ErrorLink detects authentication errors, permits one concurrent refresh request, queues other failed operations, rotates tokens, and retries once.
Connected files: appin layout, lib/auth.ts, all GraphQL query documents.
Interview explanation: "Single-flight refresh prevents many expired-token requests from refreshing simultaneously."

lib/auth.ts
Purpose: Browser token storage helpers.
How it works: Safely reads/writes/removes access and refresh tokens from localStorage and ignores invalid literal strings.
Connected files: login, AppShell, Apollo client.
Interview explanation: Simple, but localStorage exposes tokens to XSS; HttpOnly Secure SameSite cookies are the production improvement.

lib/graphql/queries/*.queries.ts
Purpose: Frontend GraphQL documents.
How it works: Defines auth, properties, rooms, equipment, analysis/session, tariff, billing, and support queries/mutations consumed by Apollo hooks.
Connected files: matching pages and backend schema fields.
Interview explanation: "Central documents avoid duplicated operation strings and make the frontend/backend contract visible."

lib/date.ts / lib/user-display.ts
Purpose: Shared formatting/parsing helpers.
How it works: Safely format dates, parse date-only input in local time, build full-day ranges, and derive user display names.
Connected files: UI and aggregation/billing services.
Interview explanation: "Centralizing date behavior avoids subtly different range calculations. Time-zone consistency still needs improvement."
```

### GraphQL composition and backend modules

```text
lib/graphql/base.typeDefs.ts
Purpose: Empty root Query/Mutation anchors.
How it works: Feature schemas use `extend type` safely.
Connected files: schema.ts and every module typeDefs.
Interview explanation: "It enables modular schema composition."

lib/graphql/schema.ts
Purpose: Executable schema composition.
How it works: Combines type definitions and resolvers for auth, property, room, equipment, simulation, support, usage, aggregation, tariff, cost, and billing.
Connected files: app/api/route.ts and all modules.
Interview explanation: "Each domain can evolve separately while the API remains one graph."

lib/graphql/context.ts
Purpose: Per-request infrastructure/auth context.
How it works: Awaits cached MongoDB connection, normalizes Authorization/x-access-token headers, verifies the access JWT, and supplies optional `userId`.
Connected files: route handler and protected resolvers/services.
Interview explanation: "Authentication is decoded once per request; services still enforce authorization."

middlewares/auth.ts
Purpose: `requireAuth` helper.
How it works: Throws a coded GraphQLError if context has no user.
Connected files: Intended for resolvers, but currently unused.
Interview explanation: "It should be adopted consistently to standardize authentication errors."
```

Every active domain under `lib/graphql/modules/<domain>` follows the same responsibilities:

- `*.typeDefs.ts`: public GraphQL types, inputs, Query, and Mutation contract;
- `*.resolvers.ts`/`*.resolver.ts`: transport adapter that unpacks arguments/context and sometimes maps database field names;
- `*.service.ts`: validation, ownership checks, calculations, queries, and writes.

Domain specifics:

```text
auth/*
Purpose: Register, login, refresh, `me`, update name, logout contract.
How it works: bcrypt hashes with cost 12; JWT access lasts 15 minutes and refresh lasts 7 days.
Connected files: User model, context, Apollo refresh link.
Interview explanation: "Generic invalid-credential errors avoid revealing registered emails. Logout is client-side only."

properties/*
Purpose: User-owned property CRUD.
How it works: Validates type/name and always filters reads/writes by userId; deletion manually cascades rooms/equipment.
Connected files: Property, Room, Equipment models and property UI.
Interview explanation: "Property is the aggregate root for tenancy/ownership."

rooms/*
Purpose: Room CRUD under a property.
How it works: Traverses room → property → user before operations; deletion cleans equipment, sessions, and room/equipment aggregates.
Connected files: Property/Room/Equipment/UsageSession/EnergyAggregate models.
Interview explanation: "Authorization follows the ownership chain instead of trusting IDs."

equipment/*
Purpose: Device CRUD and power state.
How it works: Validates room ownership; turning on/off calls UsageSessionService; active devices cannot be deleted.
Connected files: Equipment, Room, Property, UsageSession.
Interview explanation: "A device power transition is treated as a domain event represented by a usage session."

usageSession/*
Purpose: Persist and expose device usage intervals.
How it works: Enforces ownership, one active session per equipment, calculates live/final values, permits edits only after stop, and hydrates legacy records.
Connected files: Equipment/Catalog/Room/Property/Tariff/UsageSession.
Interview explanation: "Session snapshots keep effective watt/name stable even if device metadata later changes."

simulation/*
Purpose: Room-level simulated totals.
How it works: Fetches authorized sessions, groups them per equipment, and totals duration, kWh, cost, and active state.
Connected files: UsageSessionService and Equipment.
Interview explanation: "It is a read-model/aggregation service over session data."

aggregation/*
Purpose: Materialized daily, monthly, and range energy totals.
How it works: Recomputes a UTC day from completed sessions into EQUIPMENT/ROOM/PROPERTY documents; monthly/range sum daily rows.
Connected files: UsageSession, EnergyAggregate, billing alerts.
Interview explanation: "Pre-aggregation trades write/recompute work for faster repeated analytics and billing reads."

tariff/*
Purpose: Effective-dated flat/slab pricing.
How it works: Verifies property ownership; upserts by property/effective date; active tariff is latest `effectiveFrom <= requested date`.
Connected files: Tariff/Property and simulator/billing/cost.
Interview explanation: "Effective dating preserves historical pricing choices."

cost/*
Purpose: Convert aggregate kWh to money.
How it works: Resolves property from any scope, finds tariff, applies flat or progressive slab calculation, and returns a breakdown.
Connected files: EnergyAggregate, Tariff, Room, Equipment.
Interview explanation: "Calculation is isolated from transport and persistence, making it easier to test."

billing/*
Purpose: Preview/generate/list bills and manage alert settings.
How it works: Preview reads aggregates; generation ensures aggregates, calculates totals, creates Bill/line items, and checks alerts; settings suppress repeated same-period emails.
Connected files: Bill, BillLineItem, EnergyAggregate, Tariff, UserBillingSettings, email utility.
Interview explanation: "Bills persist a historical snapshot while preview is a non-writing projection."

support/*
Purpose: Authenticated customer-support email.
How it works: Trims/validates content, loads sender identity from User, and sends through email.ts.
Connected files: User and help page.
Interview explanation: "The backend derives trusted identity from the token."
```

`modules/analysis/*` is a stale alternative usage-session implementation and is **not imported by `schema.ts`**. The live schema uses `modules/usageSession/*`; the frontend file happens to be named `analysis.queries.ts`. `modules/property/*` (singular) is another old, unwired schema/resolver. Remove both to prevent confusion. Also note that trying to compose `analysis.typeDefs` with the live usage-session schema would duplicate the `UsageSession` type/fields.

### Models/database files

```text
models/User.model.ts
Purpose: User identity and password hash.
Fields: name, unique email, passwordHash, timestamps.
Connected files: auth, support, health.
Interview explanation: "Passwords are never stored in plaintext."

models/Property.model.ts
Purpose: Ownership root.
Fields: userId ref, HOUSE/APARTMENT type, trimmed name, timestamps.
Connected files: almost every domain via ownership traversal.

models/Room.model.ts
Purpose: Physical/logical room in a property.
Fields: propertyId ref, name, optional type, timestamps.
Connected files: properties, equipment, aggregation.

models/EquipmentCatalog.model.ts
Purpose: Canonical device metadata.
Fields: name, category, default wattage.
Connected files: equipment/session/billing naming.

models/Equipment.model.ts
Purpose: User-configured device instance.
Fields: room/catalog refs, rated power, hours/day, power state, quantity, efficiency, MANUAL/AUTOMATED mode.
Connected files: simulator, sessions, billing.

models/UsageSession.model.ts
Purpose: One interval of device operation.
Fields: denormalized user/property/room/device/name, start/end, duration, watt, kWh, cost, activity/edit flags, date.
Indexes: user/equipment/room/property/start/date/activity; unique partial index allows only one active session per device.
Interview explanation: "Denormalization makes analysis reads simpler and preserves a usage snapshot."

models/EnergyReading.model.ts
Purpose: Raw timestamped power reading.
Fields: equipment, timestamp, powerWatt.
Connected files: Currently unused by active services.
Interview explanation: It suggests a future IoT ingestion path but must not be claimed as implemented.

models/EnergyAggregate.model.ts
Purpose: Materialized energy totals.
Fields: scope, refId, DAILY/MONTHLY/YEARLY, year/month/date, totalKwh.
Indexes: compound indexes by scope/ref/type/date and scope/ref/type/year/month.
Connected files: aggregation, cost, billing.

models/Tariff.model.ts
Purpose: Effective-dated pricing policy.
Fields: property, FLAT/SLAB, embedded slabs, effectiveFrom.
Connected files: usage cost, CostService, billing.

models/Bill.ts / BillLineItem.ts
Purpose: Bill header and per-equipment breakdown.
Fields: property/tariff/date range/totals and bill/equipment/kWh/amount.
Indexes: property/period and bill/equipment foreign-key fields.
Connected files: BillingService/resolvers/UI.

models/UserBillingSettings.ts
Purpose: Per-user/per-property limits and alert delivery state.
Fields: daily/monthly limits, COST/KWH, last alert timestamps/error.
Index: unique `(user_id, property_id)`.
Connected files: BillingSettingsService and email utility.
```

## 4. API reference

GraphQL uses `POST /api` (GET is also enabled, primarily for tooling). Inputs are JSON `{ query, variables }`; normal results are `{ data }`, and failures are in `{ errors }`.

| Operation | Kind | Inputs | Service / DB action | Result and key errors |
|---|---|---|---|---|
| `register` | Mutation | name, email, password | unique-user check, bcrypt hash, create User, sign tokens | AuthPayload; duplicate email |
| `login` | Mutation | email, password | User lookup + bcrypt compare + sign tokens | AuthPayload; generic invalid credentials |
| `refreshToken` | Mutation | refresh JWT | verify refresh secret, load User, rotate both tokens | AuthPayload; invalid/expired refresh |
| `me` | Query | Bearer token | context userId → User | User or null |
| `updateMyName` | Mutation | name | authenticated trimmed update | User; empty/unauthorized/not found |
| `logout` | Mutation | none | no server operation | always true; client clears tokens |
| `myProperties` / `property` | Query | optional property id | filter Property by userId | owned properties; unauthorized/not found |
| `createProperty` | Mutation | name, HOUSE/APARTMENT | validate and create Property | Property; invalid input/auth |
| `updateProperty` | Mutation | id, name | owned lookup and save | Property |
| `deleteProperty` | Mutation | id | owned lookup; delete rooms/equipment/property | Boolean; cascade is incomplete (see review) |
| `roomsByProperty` | Query | propertyId | verify Property.userId, query Room | rooms |
| `createRoom` | Mutation | propertyId, name, type | ownership check, create Room | Room |
| `updateRoom` | Mutation | roomId, name/type | room → property ownership, save | Room |
| `deleteRoom` | Mutation | roomId | ownership; delete sessions/aggregates/equipment/room | Boolean |
| `equipmentsByRoom` | Query | roomId | ownership then Equipment query | equipment list |
| `equipmentsByProperty` | Query | propertyId | ownership; rooms then equipment `$in` | equipment list |
| `createEquipment` | Mutation | room/catalog/power/config | validate owner, create; optionally start session | Equipment |
| `updateEquipment` | Mutation | equipment id + patch | validate owner; update; synchronize usage on power transition | Equipment |
| `deleteEquipment` | Mutation | id | owner validation; refuse active session; delete | Boolean |
| `usageSessions` | Query | roomId or propertyId; optional date | ownership; query and build live views | sessions; one scope is required |
| `startUsageSession` | Mutation | equipmentId | owner check; idempotently return/create active session | UsageSession |
| `stopUsageSession` | Mutation | equipmentId | finish active session and calculate values | UsageSession; no active session |
| `updateUsageSession` | Mutation | sessionId, durationHours | owner check, reject active, recalculate | UsageSession |
| `updateUsageSessionDuration` | Mutation | sessionId, durationMinutes | converts minutes to hours then same service | UsageSession |
| `syncEquipmentUsageState` | Mutation | equipmentId, isOn | start/stop service | Boolean |
| `roomSimulation` | Query | roomId, optional date | group session views by equipment | room totals/device details |
| `activeTariff` | Query | propertyId, date | latest owned effective tariff | Tariff or null |
| `createTariff` | Mutation | property/type/slabs/effectiveFrom | owner check and upsert | Boolean |
| `updateTariff` | Mutation | tariffId/type/slabs | tariff → property owner check and update | Boolean |
| `dailyEnergyAggregate` | Query | scope/ref/date | direct aggregate lookup | aggregate or null; currently lacks auth |
| `monthlyEnergyAggregate` | Query | scope/ref/month/year | sum daily aggregates | synthesized aggregate; lacks auth |
| `rangeEnergyAggregate` | Query | scope/ref/from/to | sum daily aggregates | Float; lacks auth |
| `recomputeDailyAggregate` | Mutation | date | rebuild all scopes, check alerts | Boolean; currently unauthenticated and expensive |
| `calculateCost` | Mutation | scope/ref/from/to | total aggregates + stored tariff calculation | CostResult; currently lacks ownership check |
| `calculateCostWithTariff` | Mutation | scope/ref/range/type/rate | caller-provided tariff calculation | CostResult; currently lacks ownership check |
| `getBills` / `getBillById` | Query | property/bill id | ownership-sensitive Bill reads | bills/detail |
| `getBillPreview` | Query | property/from/to | aggregates + tariff + device names | preview/breakdown |
| `generateBill` | Mutation | property/from/to | recompute, calculate, persist bill/items, alert | Bill; invalid range/no usage/tariff |
| `getBillingLimit` | Query | propertyId | owner check, settings lookup | settings or null |
| `setBillingLimit` | Mutation | property, limits, type | owner check and upsert settings | settings |
| `sendSupportEmail` | Mutation | subject/message | auth, User lookup, SMTP send | Boolean |

REST utility endpoints are `GET /api/health` and the unsafe development-only `GET /api/test-email` described earlier.

## 5. Important feature deep dives

### Authentication

1. Login form sends credentials over the GraphQL mutation.
2. `loginUser` finds the email and runs `bcrypt.compare` against `passwordHash`.
3. It creates a 15-minute access token and seven-day refresh token containing `userId`.
4. The browser stores both in localStorage.
5. Apollo attaches the access token to each operation.
6. Context verifies it and makes `userId` available.
7. On an unauthenticated/expired response, Apollo makes a single refresh request, queues concurrent failed operations, stores rotated tokens, and retries each operation once.
8. Logout only removes local tokens; refresh tokens are not stored/revoked server-side.

Strong interview answer: "Authentication proves identity by verifying a signed access token in GraphQL context. Authorization is a separate concern in services: they traverse the requested entity back to a property owned by that `userId`. Refresh rotation improves session continuity, but without a server-side token store it does not provide true revocation or refresh-token reuse detection."

Edge cases handled: duplicate email, wrong password without user enumeration, missing/garbled/quoted Bearer values, expired access token, simultaneous refresh attempts, one retry only. Missing: email normalization, password policy, rate limiting, verified email, HttpOnly cookies, refresh revocation, CSRF strategy if moved to cookies.

### Property hierarchy and authorization

Property is the owner root. A room references a property; equipment references a room; sessions copy property/room/equipment IDs. Services do not accept a userId from input. They use context userId and verify entity ownership. This prevents insecure direct-object reference for the main CRUD path.

Deletion is manually cascaded because MongoDB references have no automatic foreign-key cascade. Room deletion is relatively complete. Property deletion currently deletes only rooms and equipment, leaving sessions, aggregates, tariffs, bills, line items, and billing settings orphaned—an important bug to acknowledge and fix transactionally.

### Simulator and usage calculation

The device's effective load is:

```text
effectiveWatt = ratedPowerWatt × quantity × efficiencyFactor
energyKwh = effectiveWatt × durationHours / 1000
cost = energyKwh × tariffRate
```

Turning on creates a UsageSession snapshot. A unique partial MongoDB index enforces at most one `isActive: true` session per device, and the service is idempotent when it finds an existing active session. Turning off calculates elapsed time and persists the final result. The analysis page may manually change duration only after a session is stopped, after which energy/cost are recalculated and `isManuallyEdited` becomes true.

Limitations: the session tariff logic reduces a SLAB tariff to one rate (open-ended or first slab); true slab pricing is done by CostService at aggregate/bill level. An active session crossing midnight is attributed by its start date, and daily aggregation only selects sessions whose `startedAt` lies within that day. Production logic should split intervals at day boundaries.

### Aggregation and analytics

`recomputeDaily` deletes the day's daily aggregates, reads completed sessions started that day, computes equipment totals, then room/property totals, and upserts materialized documents. Monthly/range reads sum daily records. Indexes align with those filters.

This gives faster repeated analytics but recomputation currently performs many sequential writes (N equipment plus rooms/properties) and deletes all users' aggregates for the date. Use a background queue/cron, `bulkWrite`, transactions or idempotent versioning, and authenticated/admin-only triggers. Normalize all date calculations to one timezone policy.

The analysis UI also calculates some estimates directly from equipment configuration (`watts × hours/day × days / 1000`) while historical analysis uses sessions. In an interview, distinguish **configured forecast** from **measured/simulated historical usage**.

### Tariffs, bills, and limits

Tariffs are effective-dated and support flat or progressive slabs. CostService correctly walks cumulative slab boundaries and returns each slab's consumption/cost. Bill preview is read-only; generated bills persist a header and per-equipment lines. Flat tariffs multiply each equipment directly. For slab totals, line-item cost is allocated proportionally by equipment kWh with a final rounding correction so lines add to the bill total.

Billing limits can measure COST or KWH. Settings record the last daily/monthly alert date to suppress repeated emails. Alert delivery errors are saved instead of necessarily destroying the settings record.

Important limitations: preview uses only the first tariff slab/default ₹5 and therefore may disagree with a slab bill; alert logic runs during aggregation/bill generation rather than continuously; there is no unique bill index preventing duplicate bills for the same property/range; bill header + line items are not in a Mongo transaction.

### Support email

The client submits only subject/message. The server takes name/email from the authenticated User and sets `replyTo`. This is a sound trust boundary. The HTML interpolates user-controlled strings without escaping, however, so HTML injection in email content is possible. Add escaping/sanitization, length limits, rate limiting, and delivery monitoring.

## 6. Database design, relationships, CRUD, and indexes

```text
User 1 ── * Property 1 ── * Room 1 ── * Equipment * ── 1 EquipmentCatalog
                      \                 |
                       \                * UsageSession
                        * Tariff         * EnergyAggregate (EQUIPMENT scope)
                        * Bill ── * BillLineItem
                        * UserBillingSettings
                        * EnergyAggregate (PROPERTY scope)
                  Room ── * EnergyAggregate (ROOM scope)
```

These are application-level references, not database-enforced foreign keys. Mongoose `ref` provides metadata/population capability, while services perform joins with queries and `Map`s.

CRUD patterns include `create`, `find/findOne/findById`, document mutation + `save`, `findOneAndUpdate(..., { upsert, new })`, `updateOne`, `deleteOne/deleteMany`, aggregation `$match/$group`, `distinct`, and `$in` queries. `.lean()` is used where plain read-only objects are sufficient.

Good indexes: unique User email; UsageSession ownership/filter fields and unique-active-device partial index; aggregate compound query indexes; Bill property/period; line item references; unique billing settings pair. Missing/recommended indexes: Property `{userId, createdAt}`, Room `{propertyId, createdAt}`, Equipment `{roomId, createdAt}`, Tariff `{propertyId, effectiveFrom}` (ideally unique for exact effective date), UsageSession `{propertyId, sessionDate, startedAt}`, unique Bill `{property_id, period_start, period_end}` if duplicates are forbidden, and EnergyReading `{equipmentId, timestamp}`.

Validation exists through enums/required/min and some service checks. It is inconsistent: negative wattage, zero quantity, malformed email, weak passwords, unordered/overlapping slabs, negative billing limits, and invalid ranges need a shared runtime validator such as Zod. GraphQL types only validate shape, not business constraints.

Database interview answer: "I chose MongoDB because usage sessions and device configuration are document-friendly and evolving. I still model references explicitly and enforce ownership in services. For analytics, I avoid repeatedly scanning sessions by maintaining indexed daily aggregate documents. The downside is manual referential integrity, so destructive workflows should use transactions and complete cascade policies."

## 7. Environment variables and setup

Create `PowerFusion/.env.local` (already ignored by `.gitignore`):

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/powerfusion
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret

# Optional if GraphQL is not served from the same origin:
NEXT_PUBLIC_GRAPHQL_URL=/api

# Required only for billing/support email:
SMTP_EMAIL=sender@example.com
SMTP_PASS=app-password-or-smtp-password
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_SERVICE=gmail
SMTP_FROM_EMAIL=sender@example.com
SMTP_FROM_NAME=PowerFusion
SUPPORT_EMAIL=support@example.com
```

- `MONGODB_URI` is read at module load; missing it throws and prevents backend startup.
- Access/refresh secrets sign and verify different JWT purposes. Missing secrets cause JWT operations to fail; never use the same short value.
- `NEXT_PUBLIC_*` is intentionally browser-visible and must never contain a secret.
- SMTP host/service selects transport; port/security configure TLS; sender/support variables define delivery identity.
- `PROPERTY_ID` and `USER_ID` are only optional inputs to the repair script.

Never commit database credentials, JWT secrets, SMTP passwords, real `.env*`, production logs, token dumps, or personal addresses. Provide an `.env.example` with placeholders.

### Local setup

```bash
git clone <repository-url>
cd PowerFusion
npm install
# create .env.local using the variables above
npm run dev
# open http://localhost:3000
```

Quality/production commands:

```bash
npm run lint
npm run build
npm start
```

Common failures: missing Mongo URI; MongoDB not reachable or Atlas IP not allowed; mismatched secrets; GraphQL URL pointing to another origin without correct CORS; SMTP provider requiring an app password; absent catalog seed records causing fallback device names; port 3000 already in use.

The README should replace its template text with product overview/screenshots, prerequisites, env table, setup/seed instructions, scripts, architecture diagram, API examples, deployment, security notes, and known limitations.

## 8. Error handling, reliability, and security review

### What is good

- Passwords use bcrypt cost 12 and are never returned by GraphQL.
- Login uses a generic invalid-credentials message.
- Access and refresh secrets and lifetimes are separated.
- Apollo refresh is single-flight and retries only once.
- Main property/room/equipment/session/tariff/billing services perform hierarchical ownership checks.
- ObjectId and several numeric/date inputs are validated.
- A database constraint prevents duplicate active sessions.
- GraphQL UI surfaces loading/error/empty states and toast feedback.
- Mongo connection is cached across Next development reloads/server invocations.
- `.env*` is ignored.

### High-priority weaknesses

1. **Tokens in localStorage:** an XSS can steal both long-lived refresh and access tokens. Prefer HttpOnly Secure SameSite cookies or keep refresh in an HttpOnly cookie and access token in memory.
2. **Unauthenticated sensitive operations:** aggregation and cost resolvers do not use context/ownership. `recomputeDailyAggregate` can trigger expensive global writes and alerts. Add `requireAuth`, scope ownership, and admin/job authorization.
3. **Public test-email endpoint:** remove it outside development or protect it with admin authorization and rate limiting.
4. **No rate limiting:** login/register/refresh/support/test-email/expensive GraphQL queries can be abused. Add per-IP/user limits, query depth/complexity limits, request body limits, and production introspection policy.
5. **Refresh tokens are stateless:** rotation issues a new token but does not revoke the old one. Store hashed refresh-token families with expiry/reuse detection, or use server sessions.
6. **HTML injection in emails:** escape/sanitize names, subject, property name, and messages.
7. **CORS/CSRF/deployment policy is implicit:** same-origin default is fine locally, but explicit allowlists are required if the API becomes cross-origin. Cookie auth would require CSRF protection.
8. **Incomplete cascades and no transactions:** property deletion and bill generation can leave inconsistent records after partial failure.
9. **Introspection always enabled:** useful in development; consider disabling/restricting in production along with detailed error masking.
10. **Input validation is inconsistent:** normalize emails, enforce password and numeric constraints, validate dates/slabs, and use typed error codes.

### Failure matrix

| Failure | Current behavior | Better production behavior |
|---|---|---|
| Backend down | Apollo network error/UI may show error | global retry policy, offline banner, observability |
| Mongo down | context throws `Database unavailable` after 5s | readiness probe, structured logs, backoff/circuit breaker |
| Invalid token | context silently leaves userId empty; protected service errors | consistent `UNAUTHENTICATED` code and client login redirect |
| Empty data | charts/lists generally have empty states | keep; explain whether empty or not-yet-loaded |
| Slow network | mutation loading flags/buttons in many forms | cancellation, skeletons, timeouts, optimistic rollback |
| SMTP failure | alert error recorded; support mutation fails | async queue, retry/dead-letter, user-safe response |
| Partial multi-write | orphan or incomplete data possible | Mongo sessions/transactions and idempotency keys |
| Wrong timezone | day boundaries can disagree | store UTC instants and define property billing timezone |
| Duplicate bill request | duplicate bills possible | unique key + idempotent generation |

Security interview answer: "The current strengths are bcrypt password hashing, short access tokens, separated JWT secrets, generic credential errors, and ownership checks at the service layer. The main production changes are moving refresh credentials out of localStorage, adding revocation and rate limiting, protecting operational resolvers, validating inputs centrally, sanitizing email HTML, and using transactional/idempotent multi-document writes."

## 9. Performance, scaling, and deployment

### Existing performance decisions

- Mongo connection caching avoids repeated handshakes.
- Compound indexes support aggregate and session filters.
- Daily materialized aggregates avoid rescanning all sessions for every chart/bill.
- Apollo caches GraphQL entities; React `useMemo` avoids some repeated chart calculations.
- Parallel `Promise.all` and `.lean()` are used in billing preview/name lookup.
- Single-flight refresh prevents an authentication request storm.

### Bottlenecks and improvements

- `recomputeDaily` does sequential per-entity upserts: replace with grouped Mongo aggregation + `bulkWrite` and a background worker.
- Bill generation loops over every date: queue it, cap ranges, and cache/reuse valid aggregates.
- Bill `lineItems` and each line's `equipmentName` can cause N+1 queries: use DataLoader/batching or populate a snapshot name in BillLineItem.
- Unbounded bills/sessions/properties need cursor pagination.
- The huge simulator/analysis/BillPage bundles need component splitting, dynamic import for charts/reports, and virtualization for large lists.
- Search should debounce if moved server-side.
- Apollo cache policies/refetch behavior should be explicit; React Query is redundant today.
- Email should be asynchronous so SMTP latency does not hold billing requests.
- Use Redis for hot aggregates, rate limits, and jobs only when load justifies it.
- At IoT scale, ingest immutable readings/sessions through a queue, partition time-series data, run stream/batch aggregation workers, and keep the web API stateless.

Strong answer to “How did you optimize it?”: "I modeled daily indexed aggregates so analytics and billing read a compact summary instead of scanning every usage session. I also cache the Mongo connection, parallelize independent billing reads, use lean documents for read-only mappings, memoize chart transformations, and serialize token refresh."

Be honest that several optimizations are recommendations, not completed work.

### Deployment

No Dockerfile, CI workflow, or platform-specific deployment file is present. The natural current deployment is one Next.js app on Vercel/Node hosting plus MongoDB Atlas and an SMTP provider.

Production flow:

1. Provision MongoDB and least-privilege database credentials.
2. Configure all secrets in the hosting platform, not in Git.
3. Run `npm ci`, `npm run lint`, and `npm run build` in CI.
4. Deploy the Next build; `/api` deploys with it.
5. Set `NEXT_PUBLIC_GRAPHQL_URL` only when necessary; same-origin `/api` is simplest.
6. Configure SMTP credentials/domain reputation and health/readiness monitoring.
7. Protect development endpoints, restrict introspection, and verify indexes/migrations.

Common deployment mistakes: using `localhost` Mongo URI in cloud; exposing secrets as `NEXT_PUBLIC_*`; Atlas network/TLS denial; serverless function timeout during aggregation/email; missing Node-compatible runtime; SMTP ports blocked; accidentally deploying `/api/test-email`; inconsistent application timezone.

## 10. Code-quality review and practical refactor plan

### Good qualities

- Clear domain-oriented backend folders.
- Thin resolvers and substantial service layer in active modules.
- Reusable UI/chart/billing components.
- Ownership checks are explicit on primary CRUD paths.
- Helpful database indexes and domain invariant for one active session.
- Legacy-session hydration shows attention to backward compatibility.
- Billing contains thoughtful proportional allocation and rounding correction.

### Concrete issues

- Delete unwired `modules/analysis` and singular `modules/property`, or migrate intentionally.
- Split `simulator/page.tsx`, `analysis/page.tsx`, and `BillPage.tsx`; they mix transport, domain calculation, interaction, and rendering.
- Extract repeated device catalog ID/name maps from billing services and frontend into one shared catalog strategy. Hard-coded ObjectIds are brittle.
- Standardize camelCase across Mongo models. Billing's snake_case creates extensive resolver normalization and opportunities for mistakes.
- Use `requireAuth` consistently and return standardized GraphQL error codes.
- Make ownership helpers shared rather than repeating property traversal.
- Replace `any` in billing resolvers/Apollo error handling and avoid `new Function` dynamic import unless deployment constraints truly require it.
- Remove unused React Query provider/dependency or actually standardize on it for non-GraphQL state.
- Complete cascade deletion and wrap destructive/multi-document operations in transactions.
- Add service unit tests (cost slabs, durations, allocation), integration tests (ownership/auth/GraphQL), and end-to-end tests (signup → property → device → bill). There is currently no test script/suite.
- Replace debug `console.log`s with structured logging and redact secrets/PII.
- Replace template README and add `.env.example`.
- Ensure property creation/deletion cleans tariffs, sessions, aggregates, bills, line items, and settings.
- Add unique/compound indexes listed in the database section.

Recommended order:

1. Secure test-email/aggregation/cost operations and centralize auth errors.
2. Fix transactional cascades and bill idempotency.
3. Add validation + core service tests.
4. Reconcile billing preview/slab behavior and midnight/timezone semantics.
5. Remove dead modules and redundant provider.
6. Decompose the three oversized client files into feature hooks and components.
7. Queue aggregation/email and batch database operations.

## 11. File-focused interviewer questions and best answers

Instead of memorizing individual lines, learn each important file's invariant and collaboration.

### `lib/apollo-client.ts`

**Question:** Why queue failed operations during refresh?  
**Answer:** "If ten queries see an expired access token together, ten refresh calls could race and overwrite rotated credentials. I allow one refresh, queue the other operations, then retry each once with the same new token."

**Follow-up:** What remains unsafe?  
**Answer:** "Refresh tokens are in localStorage and not revoked server-side. I would use an HttpOnly cookie plus a server-side hashed token family."

### `lib/graphql/context.ts`

**Question:** Why not throw immediately for every invalid token?  
**Answer:** "Keeping `userId` optional allows public operations such as login/register in the same graph; protected services then reject absent identity. I would standardize this with resolver directives/helpers so mistakes cannot leave sensitive operations public."

### `equipment.service.ts`

**Question:** How do you prevent access by guessed IDs?  
**Answer:** "I load the equipment's room, then its property constrained by the context userId. Merely possessing a Mongo ObjectId never grants access."

**Question:** Why couple power changes to usage sessions?  
**Answer:** "Power state alone only describes now. A start/stop interval gives auditable history and supports energy, cost, analytics, and billing."

### `usageSession.service.ts`

**Question:** Why store effective watt in the session?  
**Answer:** "It snapshots the configuration at the time of usage. Later edits to device wattage or quantity should not rewrite historical consumption."

**Question:** How are duplicates prevented?  
**Answer:** "The service first returns an existing active session, and a unique partial index enforces the invariant in MongoDB under concurrency."

### `aggregation.service.ts`

**Question:** Why materialize aggregates?  
**Answer:** "Charts and bills repeatedly query the same date ranges. Daily documents reduce the read volume and can be indexed by scope/reference/date. The cost is recomputation complexity and eventual consistency."

**Question:** What bug would you fix first?  
**Answer:** "Sessions crossing midnight are not split correctly, and recomputation is globally triggerable. I would define a property timezone, intersect intervals with each day, and run authenticated background jobs."

### `cost.service.ts`

**Question:** How does progressive slab billing work?  
**Answer:** "For each cumulative upper limit I subtract the previous limit, consume the smaller of remaining kWh and slab capacity, multiply by that slab's rate, and continue until no energy remains."

### `billing.service.ts`

**Question:** Why separate Bill and BillLineItem?  
**Answer:** "The bill header is the property/range/totals snapshot; line items form an unbounded per-device breakdown and can be sorted/queried independently. For read performance I may embed them at small scale, but separate documents make the relationship explicit."

**Question:** How do slab costs map to devices?  
**Answer:** "Slab pricing applies to total property consumption. After calculating the exact total, I allocate cost proportionally by each device's kWh and correct the last line for currency rounding."

### Main frontend pages

**Question:** Why local state plus Apollo?  
**Answer:** "Apollo owns remote normalized server state. Local state owns transient interaction—dialogs, drag positions, selected devices, filters, and undo/redo—that should not be persisted on every render."

**Question:** What would you refactor?  
**Answer:** "The simulator and analysis pages have grown into feature orchestrators. I would extract data hooks, calculation modules, canvas/device components, filter panels, and dialogs while keeping the route page as composition."

## 12. Interview preparation bank

### Basic

**What is PowerFusion?**  
Simple: a platform to simulate, track, analyze, and bill household appliance energy.  
Strong: use the one-minute pitch and emphasize device-level visibility, session modeling, effective tariffs, and ownership.  
Follow-ups: target user, real IoT vs simulation, key impact. Clarify that current readings are simulated/configured; `EnergyReading` is not wired to hardware.

**Why did you build it?**  
Simple: monthly bills do not show which device caused usage.  
Strong: "I wanted a traceable chain from device state → usage interval → kWh → tariff → cost → bill, with understandable property/room views."  
Follow-ups: user research and validation. Do not invent measured savings.

**What was your role?**  
State only what you actually did. A safe structure is: "I owned [specific modules], contributed to [others], and made [decision]." Be ready to open a commit or explain a difficult function.

**Why this stack?**  
Simple: one TypeScript full-stack codebase, flexible documents, efficient client data fetching.  
Strong: mention modular monolith speed, GraphQL contract, Mongoose schemas/indexes, and the trade-offs noted above.  
Follow-up: why not REST/Postgres? Answer that REST would be simpler for strict resources and Postgres stronger for transactions/referential integrity; the choice reflects evolving nested domain data and hackathon/product iteration.

### Technical

**Explain the architecture.**  
Simple: React UI calls GraphQL; resolvers call services; services use MongoDB.  
Strong: "It is a Next.js modular monolith with a layered GraphQL backend and property-rooted authorization."  
Follow-up: use the architecture diagram and device-toggle flow.

**Explain one important API.**  
Choose `updateEquipment`: it demonstrates authentication, nested ownership, state transition, usage session creation/finalization, database writes, and UI refresh.

**Explain authentication.**  
Use the eight-step auth flow. Follow-ups: XSS, CSRF, refresh races, logout/revocation.

**Explain database schema.**  
Start at User → Property → Room → Equipment, then explain session snapshots, materialized aggregates, effective tariffs, and bill snapshots. Follow-up: indexes, denormalization, transactions.

**Hardest feature.**  
A credible code-grounded answer: "Keeping device power state and usage-session state consistent was challenging. I made start idempotent, prohibited deleting active devices, recalculated on stop/edit, and added a unique partial database index so concurrency cannot create two active sessions." Only claim this as your personal challenge if true.

**Error handling.**  
Explain GraphQLError, Apollo error/loading states, Mongo connection failure, and SMTP error recording, then candidly note the lack of a global formatting/observability strategy.

### Advanced

**How would you scale it?**  
"Keep the API stateless; move aggregation/email to queues; use bulk writes and partitioned time-series ingestion; add Redis for hot summaries/rate limiting; paginate GraphQL reads; add DataLoader; scale web and workers independently; preserve idempotency."

**What are the limitations?**  
"It is simulation-first, not real hardware ingestion; interval/day timezone handling is incomplete; some operational resolvers lack authorization; token storage/revocation needs production hardening; UI feature files are oversized; multi-document writes lack transactions; tests/deployment automation are absent."

**What would you improve first?**  
"Security boundaries and data integrity before cosmetic refactors: protect operational endpoints, secure refresh tokens, fix cascades/idempotency/transactions, add validation/tests, then background aggregation and split UI features."

**Potential bottleneck?**  
"Daily recomputation scans sessions and performs sequential upserts; bill resolvers can produce N+1 equipment-name queries; the UI fetches unpaginated sessions."

**Hardest bug you faced?**  
Do not invent one. If you personally encountered session duplication, tariff mismatch, date boundary, or stale schema problems, use STAR: symptom → investigation → root cause → fix → invariant/test. Otherwise say, "A bug visible in the current code is..." rather than claiming authorship.

**What did you learn?**  
"Business rules belong in services and database constraints, not only UI; authorization must follow relationships; historical calculations need snapshots/effective dates; and time/billing logic needs explicit timezone and idempotency semantics."

## 13. Resume-ready wording

### Two-line explanation

Built PowerFusion, a full-stack household energy platform that models appliance usage sessions and provides room/property analytics, tariff-based cost estimates, bills, and configurable alerts. Developed with Next.js, React, TypeScript, Apollo GraphQL, MongoDB/Mongoose, JWT, Recharts, and SMTP.

### Four honest, strong bullets

- Built a modular GraphQL workflow for property, room, and equipment management with property-rooted ownership checks across user data.
- Modeled appliance power transitions as usage sessions and calculated energy from wattage, quantity, efficiency, and duration, with indexed daily aggregates for analytics.
- Implemented flat/progressive tariff calculation, bill preview and generation, per-device line-item allocation, and daily/monthly usage or cost alerts.
- Developed an interactive React simulator and analysis dashboard using Apollo Client, reusable UI components, Recharts, and automatic access-token refresh.

Do not attach unmeasured numbers such as “reduced bills by 30%” merely because landing-page marketing displays them. Use verified metrics only (users, response time, tests, data volume, or measured query improvement).

### Impact-oriented pitch

"The impact is visibility and actionability: instead of a single delayed property total, users can connect an appliance state to duration, kWh, tariff cost, room/property trends, a bill line, and a configurable alert."

### Best “Tell me about PowerFusion” structure

1. Problem: bills lack device attribution.
2. Product: property/room/device simulator, analysis, tariff billing, alerts.
3. Architecture: Next/React → Apollo GraphQL → services → MongoDB.
4. Deep decision: session invariant + ownership chain + aggregates.
5. Challenge/trade-off: time boundaries, consistency, security.
6. Next step: production hardening/background aggregation/IoT ingestion.

## 14. Seven-day learning roadmap

### Day 1 — setup, product, and route map

Run the app; walk `/`, login/signup, dashboard, properties, simulator, analysis, billing, help. Study in this order: `package.json` → `app/layout.tsx` → `app/page.tsx` → `app/appin/layout.tsx` → `AppShell.tsx` → route pages. Draw the page map from memory.

### Day 2 — GraphQL and authentication

Study `app/api/route.ts` → `schema.ts` → `context.ts` → `auth.typeDefs.ts` → `auth.resolvers.ts` → `auth.service.ts` → `User.model.ts` → `lib/auth.ts` → `apollo-client.ts`. Be able to narrate login, expiry, concurrent refresh, authorization, and logout limitations.

### Day 3 — ownership and CRUD

Study Property model/service/resolver/query → Room equivalents → Equipment equivalents. Trace create/update/delete and write down exactly where user ownership is checked. Identify incomplete property cascade.

### Day 4 — sessions, energy, tariff, and database

Study `UsageSession.model.ts` and service line-by-line, then `Tariff.model.ts`, tariff service, and cost service. Work examples manually: 100 W × 2 devices × 0.9 × 5 h = 0.9 kWh; then apply flat/slab rates. Explain every important index.

### Day 5 — aggregation, analysis, billing, alerts

Study aggregation service/model → simulation service → analysis page/chart components → BillingService/Preview/Settings → billing models/UI → email utility. Trace one device from start through bill line item. List mismatches and edge cases.

### Day 6 — security, reliability, performance, deployment

Use sections 7–10 as a checklist. Prioritize current fact vs proposed improvement. Practice answers for XSS/token storage, IDOR, CORS/CSRF, Mongo transactions, N+1, pagination, background jobs, timezone, and Vercel/Atlas deployment.

### Day 7 — mock interview

Give the 30-second and one-minute pitch without notes. Whiteboard the architecture and schema. Explain `updateEquipment`, `start/stopForEquipment`, slab calculation, and bill generation. Then answer five follow-ups and perform a code review of one oversized page. Record yourself; remove vague claims.

### Exact study priority

1. `lib/graphql/modules/usageSession/usageSession.service.ts`
2. `lib/graphql/modules/equipment/equipment.service.ts`
3. `lib/graphql/context.ts` and `lib/apollo-client.ts`
4. `lib/graphql/modules/billing/billing.service.ts`
5. `lib/graphql/modules/cost/cost.service.ts`
6. `lib/graphql/modules/aggregation/aggregation.service.ts`
7. models in relationship order: User, Property, Room, Equipment, UsageSession, Aggregate, Tariff, Bill/settings
8. GraphQL typeDefs/resolvers/queries for those domains
9. simulator page and its child components
10. analysis page and chart components
11. BillPage and its child components
12. remaining route pages, email, config, and repair script

## Final interview rule

Use three labels mentally: **implemented**, **partially implemented**, and **proposed**. PowerFusion has enough real engineering depth—hierarchical authorization, session invariants, materialized aggregates, effective tariffs, proportional bill allocation, and refresh coordination—that you do not need to exaggerate it. Honest awareness of the current gaps is itself a strong senior-engineering signal.
