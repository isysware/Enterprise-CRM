# Enterprise Lead CRM — Technical Requirements Document (TRD)

**Document status:** Technical baseline  
**Current implementation:** Next.js frontend with local/mock runtime  
**Production target:** Next.js + Node.js/Express + MongoDB Atlas + Namecheap

---

## 1. Architecture Summary

The application must use a clear frontend/backend separation.

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui foundation/components
- Poppins via `next/font`
- Lucide icons
- Client-side UI state only for presentation/local transient state

### Backend

- Node.js
- Express.js
- REST API
- Authentication/session middleware
- RBAC/scope middleware
- Validation
- Audit service
- Integration services
- AI service boundary

### Database

- MongoDB Atlas
- Recommended ODM: Mongoose, used consistently if adopted
- Production indexes and validation rules defined in schema layer

### Deployment

- Namecheap
- Frontend and backend may be deployed separately if required by the hosting plan.
- Production frontend must call the configured backend API origin.
- Persistent WhatsApp/Baileys runtime must be hosted on infrastructure that supports a long-running Node.js process.

---

## 2. Current Source State

The current frontend repository contains:

- `app/` — Next.js App Router entry, layout, global CSS, error boundary
- `src/components/` — application views, admin views, reports, modals, AI UI, reusable UI components
- `src/context/CRMContext.tsx` — current local/mock runtime and business actions
- `src/data/mockData.ts` — mock users, teams, permissions, pricing models, settings, leads, clients, logs
- `src/utils/authorization.ts` — canonical frontend hard-scope and RBAC helpers
- `src/utils/authorization.test.ts` — authorization regression tests
- `src/services/` — current frontend service boundaries/local services
- `components.json` — shadcn/ui configuration
- `app/globals.css` — global visual tokens/styles

Important:

- Supabase has been removed.
- Vite has been removed.
- Production backend/database are not connected.
- Current localStorage/mock persistence is temporary and must be replaced with API-backed persistence.
- Any old source comments referring to PostgreSQL are stale and must be updated to MongoDB Atlas during cleanup.

---

## 3. Frontend Technical Requirements

### 3.1 Next.js

Use App Router.

Current app may remain predominantly client-rendered while the CRM is being migrated from the original SPA architecture. Do not force Server Components into state-heavy operational modules merely for style.

Rules:

- Add `"use client"` only where hooks/browser APIs require it.
- Avoid hydration mismatches.
- Guard browser-only APIs (`window`, `document`, `localStorage`) where temporary local behavior remains.
- Backend cutover should reduce localStorage business persistence.
- Do not expose secrets through `NEXT_PUBLIC_*`.

### 3.2 TypeScript

- New code should be strongly typed.
- Avoid `any` in new backend/API contracts where practical.
- Existing `strict: false` may be tightened gradually after stability is established; do not flip strict mode in a single destructive refactor.
- Shared API DTOs should have explicit types.

### 3.3 shadcn/ui

`components.json` is configured.

Rules:

- Use shadcn/ui primitives for new standard controls where suitable.
- Preserve existing reusable CRM primitives when they provide application-specific behavior.
- Do not rewrite stable screens solely to replace a custom component with a shadcn component.
- Maintain one coherent design system.

Likely reusable shadcn components:

- Button
- Input
- Textarea
- Select
- Dialog
- Sheet
- Alert Dialog
- Dropdown Menu
- Tabs
- Tooltip
- Popover
- Calendar/Date Picker where needed
- Table
- Badge
- Card
- Skeleton
- Toast/Sonner if standardized later

### 3.4 Styling

- Poppins.
- Blue/white enterprise theme.
- Tailwind CSS.
- Lucide icons.
- No module-specific visual themes.
- No emoji/cartoon icons.
- Maintain responsive layouts.

---

## 4. Backend Project Structure

Recommended backend structure:

```text
backend/
  src/
    app.ts
    server.ts
    config/
      env.ts
      db.ts
    middleware/
      auth.middleware.ts
      rbac.middleware.ts
      error.middleware.ts
      rateLimit.middleware.ts
      validate.middleware.ts
    modules/
      auth/
      users/
      roles/
      teams/
      leads/
      incoming-leads/
      follow-ups/
      clients/
      proposals/
      services/
      sources/
      pricing-models/
      reports/
      activity-logs/
      settings/
      integrations/
        meta/
        whatsapp/
      ai/
    shared/
      errors/
      utils/
      types/
      audit/
    tests/
  package.json
  tsconfig.json
  .env.example
```

Backend language should be TypeScript unless there is a documented reason to use plain JavaScript.

---

## 5. Authentication Design

Recommended production model:

- Email/username + password.
- Password hash using a modern password hashing library.
- Short-lived access token and/or secure server session.
- Refresh/session token stored in `HttpOnly`, `Secure`, appropriately `SameSite` cookie when deployment topology allows.
- Logout invalidates refresh/session credentials.
- Disabled users cannot authenticate.

Never:

- Store plain text password.
- Return password hash to frontend.
- Put auth secrets in browser storage.
- Trust frontend role claims.

Authentication response should return only safe user/session information.

---

## 6. Server-Side Authorization

Every protected route must enforce:

1. Authenticated user.
2. Active account.
3. Required capability.
4. Hard organizational scope.
5. Protected account invariants.
6. Target-record authorization.

The backend implementation must preserve the canonical frontend rules defined in `src/utils/authorization.ts`.

### 6.1 Hard Scope

- Super Admin: organization.
- Admin: organization operational scope.
- Manager: managed hierarchy.
- Team Lead: led team/direct employees.
- Employee: self.

### 6.2 Protected Account Invariants

- Only Super Admin can manage Admin.
- Admin cannot create Admin/Super Admin.
- Admin cannot modify Admin/Super Admin.
- Roles & Permissions matrix is Super Admin only.
- Dynamic permissions cannot enable protected Super Admin controls for lower roles.

---

## 7. MongoDB Atlas Data Model

The exact schema may evolve during backend implementation, but the following collections are required.

### 7.1 `users`

Core fields:

- `_id`
- `name`
- `email` — normalized, unique
- `phone`
- `passwordHash`
- `roleId` or canonical role key
- `teamId`
- `managerId`
- `teamLeadId`
- `avatarUrl`
- `isActive`
- timestamps

Indexes:

- unique normalized email
- role
- team
- manager/teamLead where reporting needs them

Never store frontend mock `password` field in production.

### 7.2 `roles`

Fields:

- role key/name
- description
- protected flag
- timestamps

Canonical base roles:

- Super Admin
- Admin
- Manager
- Team Lead
- Employee

### 7.3 `rolePermissions`

Fields:

- role reference/key
- 21 boolean capabilities
- changedBy
- changedAt

Protected values must be normalized server-side even if malformed input is submitted.

### 7.4 `teams`

Fields:

- name
- code
- description
- managerId
- teamLeadId
- status
- timestamps

### 7.5 `teamMemberships`

Recommended separate collection for robust membership history:

- teamId
- userId
- isPrimary
- joinedAt
- leftAt/status
- createdBy

Constraint:

- one active primary membership per user.

Secondary membership must not grant supervisory authority.

### 7.6 `services`

- name
- category
- description
- defaultPricePKR
- pricingModelId
- isActive
- timestamps

### 7.7 `leadSources`

- name
- description
- isActive
- timestamps

### 7.8 `pricingModels`

- name
- billingType
- description
- active/default flags
- default values
- dynamic field schema
- timestamps

Dynamic field definitions should include:

- key
- label
- type
- options
- defaultValue
- required
- includeInTotal

### 7.9 `leads`

Fields include:

- name
- businessName
- phone
- email
- city
- serviceIds / service snapshots as required
- valuePKR
- status
- quality
- priority
- source/sourceId
- assignedToId
- teamId
- pricing model
- budget/commercial details
- notes/tags
- next follow-up
- createdBy
- timestamps

Indexes should cover:

- assignedToId
- teamId
- status
- source
- createdAt
- nextFollowUpDate
- common report filter combinations where justified

Lead activity history may be embedded only if bounded. For scalable audit/history, use a separate lead activity collection.

### 7.10 `leadActivities`

Recommended:

- leadId
- type
- title
- notes
- outcome
- duration only if genuinely captured
- actorId
- timestamp

### 7.11 `followUps`

- leadId
- client/business snapshot
- phone
- scheduledDate/time
- type
- status
- assignedToId
- notes
- completion/result fields
- createdBy
- timestamps

Indexes:

- assignedToId + scheduledDate
- status
- leadId

### 7.12 `clients`

- originating leadId
- business/client identity
- contact data
- services
- source
- pricing model
- final price/value
- assigned owner
- generated/closed attribution
- terms/details
- converted date
- status
- timestamps

### 7.13 `proposals`

- leadId
- reference/proposal number
- issue/expiry dates
- client snapshot
- assigned rep
- scope/deliverables
- line items
- discounts/tax
- totals
- milestones
- terms
- letterhead/company snapshot
- status
- createdBy
- timestamps

Historical proposal snapshots must not silently change when global settings later change.

### 7.14 `incomingLeads`

- source
- `externalId`
- contact data
- campaign/ad/message data
- interested service
- status
- assigned user
- converted leadId
- receivedAt

Unique index:

- source + externalId, or a globally safe externalId strategy depending on integration.

### 7.15 `activityLogs`

- timestamp
- actorId
- actorName snapshot
- actorRole snapshot
- action
- entityType
- entityId
- entityTitle
- details/structured metadata

### 7.16 `settings`

Prefer scoped configuration documents by category:

- branding
- letterhead
- pricing defaults
- communication

Store references/URLs to uploaded files, not browser base64 preview strings for large files.

### 7.17 `integrationConnections`

Server-side only.

Examples:

- Meta connection metadata
- WhatsApp session metadata
- encrypted credential reference

Never expose secret/token fields through general settings APIs.

---

## 8. API Contract

Base prefix:

`/api/v1`

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh` if token model uses refresh
- `GET /auth/me`

### Users

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/status`
- `DELETE /users/:id` only if product policy allows
- credential reset endpoint as a dedicated protected action

### Roles

- `GET /roles`
- `GET /roles/permissions`
- `PUT /roles/:role/permissions`
- `POST /roles/permissions/reset`

Super Admin only for mutation.

### Teams

- CRUD teams
- member list
- add/remove member
- set primary membership

### Leads

- `GET /leads`
- `POST /leads`
- `GET /leads/:id`
- `PATCH /leads/:id`
- `DELETE /leads/:id`
- `POST /leads/:id/reassign`
- `POST /leads/:id/status`
- `POST /leads/:id/activities`
- CSV import/export endpoints as appropriate

### Incoming Leads

- list
- assign-and-add
- integration-specific ingestion endpoints are server/internal/webhook routes

### Follow-Ups

- CRUD/schedule
- complete
- reschedule

### Clients

- list/detail
- lead conversion
- controlled return/reversal

### Proposals

- CRUD
- document data retrieval
- export/print may remain frontend or move server-side later

### Services / Sources / Pricing Models

- standard protected master-data APIs

### Reports

Recommended dedicated report endpoints rather than downloading all records:

- `/reports/sales-pipeline`
- `/reports/team-staff`
- `/reports/followups-activity`
- `/reports/clients-conversions`
- `/reports/source-service`
- `/reports/commercial-revenue`

Each endpoint must apply user scope before filters/aggregation.

### Activity Logs

- paginated/filterable read endpoint

### Settings

- category-based GET/PATCH
- protected reset action

### AI

- `POST /ai/assistant`

### Integrations

Meta and WhatsApp endpoints must be isolated under protected integration modules.

---

## 9. Validation

Use a consistent request-validation layer.

Every write endpoint validates:

- body
- params
- query
- IDs
- enum/status values
- numeric values
- date/time format
- role/permission targets

Validation failure returns structured 4xx response, not stack traces.

---

## 10. Error Response Contract

Recommended format:

```json
{
  "success": false,
  "code": "LEAD_NOT_FOUND",
  "message": "Lead not found.",
  "details": null
}
```

Production responses must not expose stack traces, database connection strings, tokens, or internal secrets.

---

## 11. Audit Rules

Audit at minimum:

- login/logout
- user create/update/status/role changes
- role permission changes
- team/member changes
- lead create/edit/delete/reassign/status change
- client conversion/reversal
- proposal creation/update/status
- follow-up create/reschedule/complete/delete
- settings changes
- integration connection changes
- sensitive export actions where useful

Audit actor comes from authenticated backend session, never from client-supplied `userName`.

---

## 12. Reporting Rules

Reports must be based on canonical persisted records.

Rules:

- Hard scope first.
- Report filters second.
- Aggregation third.
- No client-side organization-wide dataset exposure for unauthorized users.
- Revenue and pipeline value remain distinct.
- No fabricated historical metrics.
- Employee cannot receive cross-user league tables.
- Export endpoints/data use exactly the active authorized report scope.

---

## 13. Integration Architecture

### Meta Lead Ads

Backend module should handle:

- OAuth callback
- token encryption/storage
- webhook verification challenge
- webhook signature verification where applicable
- lead ingestion
- dedupe
- retry/idempotency
- incoming lead creation
- audit/error logs

### WhatsApp / Baileys

Backend module should handle:

- session creation
- QR/pairing
- credential persistence
- reconnection
- connection status
- inbound messages
- optional outbound drafts/sends through explicit authorized actions

Baileys must never run inside the browser.

### AI Assistant

Backend module:

1. authenticates user
2. resolves current authorization
3. validates/sanitizes provided context
4. optionally fetches trusted server-side context
5. calls selected AI provider with server-side secret
6. validates response
7. returns suggestions/drafts, not unauthorized direct mutations

No provider API key in frontend.

---

## 14. File Storage

Production uploads may include:

- company logo
- letterhead background
- authorized signature/stamp
- future attachments

Use a backend-controlled storage strategy. Do not store large base64 payloads permanently in MongoDB unless explicitly justified.

Persist only secure file references/metadata where possible.

---

## 15. Security Requirements

Mandatory:

- Helmet/security headers.
- Rate limiting.
- Request body limits.
- CORS allowlist.
- Secure cookie configuration.
- Password hashing.
- Input validation.
- Mongo query/operator sanitization strategy.
- Authorization middleware.
- Object-level authorization.
- Secret management.
- Logging without secrets.
- Production HTTPS.
- Dependency audit.
- Account status enforcement.
- Brute-force protection on auth endpoints.

Never trust:

- frontend role
- frontend user ID as actor
- frontend capability claim
- frontend record scope

All are resolved server-side from the authenticated identity.

---

## 16. Environment Variables

Frontend `.env` should contain only public configuration if needed, for example:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

Backend `.env` may contain:

```env
NODE_ENV=production
PORT=...
MONGODB_URI=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
COOKIE_SECRET=...
FRONTEND_ORIGIN=...
META_APP_ID=...
META_APP_SECRET=...
META_VERIFY_TOKEN=...
AI_PROVIDER_API_KEY=...
```

WhatsApp/Baileys session credentials must not be exposed as public environment variables.

Never prefix secrets with `NEXT_PUBLIC_`.

---

## 17. Frontend-to-Backend Cutover

Do not rewrite the UI.

Replace current local `CRMContext` business persistence gradually with API service calls.

Recommended order:

1. Auth/current user.
2. Users/RBAC/teams.
3. Services/sources/pricing/settings.
4. Leads.
5. Follow-ups.
6. Clients/conversion.
7. Proposals.
8. Reports.
9. Activity logs.
10. Incoming integrations.
11. AI.

During each cutover:

- preserve UI contract
- preserve calculation rules
- remove localStorage persistence only for the migrated domain
- run tests
- verify scope

---

## 18. Testing Requirements

### Existing

- Authorization regression tests currently cover the frontend RBAC rules.

### Add Backend Tests

Unit:

- scope helpers
- permission helpers
- pricing calculations
- validation

Integration:

- auth
- protected user management
- lead CRUD
- assignment
- follow-up
- conversion
- reports
- settings
- audit

Critical authorization test cases:

- Admin cannot create Admin.
- Admin cannot create Super Admin.
- Admin cannot edit Admin.
- Admin cannot edit Super Admin.
- Manager cannot escape hierarchy.
- Team Lead cannot escape led team.
- Employee cannot access another user's records.
- Dynamic permissions cannot expand hard scope.
- Reports cannot bypass scope through filters.
- AI cannot receive unauthorized data.

---

## 19. Deployment Requirements

### Build

Frontend:

```bash
npm run build
```

Backend:

- compile TypeScript if used
- run backend tests
- verify environment validation

### Namecheap

Before production:

- confirm Node.js version/runtime support
- configure domain/subdomain
- configure HTTPS
- configure backend process
- configure environment variables securely
- configure MongoDB Atlas network access for the production host
- configure CORS origin
- configure process restart strategy
- verify logs

If the selected Namecheap plan does not support the long-lived Node process required by Baileys, deploy the backend/integration runtime on a compatible Namecheap VPS environment instead of weakening the architecture.

---

## 20. Technical Cleanup Backlog Before Backend Start

1. Verify latest frontend locally, not only in Google AI Studio Preview.
2. Update stale code comments that still mention PostgreSQL; MongoDB Atlas is final.
3. Rename generic package name (`react-example`) to a CRM-specific package name.
4. Audit current custom `src/components/ui` components against shadcn/ui and standardize only where beneficial.
5. Remove AI Studio-only metadata/artifacts if not required for local/production development.
6. Keep `dev.mjs` only if it remains useful for local host/port mapping.
7. Review `strict: false`; plan gradual strictness improvement rather than one large rewrite.
8. Establish `/backend` with its own `package.json`, `.gitignore`, env example, tests, and docs.
