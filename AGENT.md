# Enterprise Lead CRM — AGENT.md

This file defines how Antigravity or any coding agent must work on this project.

---

## 1. Mandatory Startup Routine

Before EVERY task/session:

1. Read `PRD.md`.
2. Read `TRD.md`.
3. Read `SKILLS.md`.
4. Read `AGENT.md`.
5. Inspect the relevant current source files before editing.
6. Check current Git status.
7. State the exact scope of the task internally before making changes.

Do not rely on previous chat memory when current code/docs are available.

---

## 2. Final Technology Contract

This stack is frozen unless the user explicitly changes it.

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui foundation/components
- Poppins
- Lucide icons

### Backend

- Node.js
- Express.js
- TypeScript preferred

### Database

- PostgreSQL (Connection will be added later)
- MongoDB/Mongoose: NOT USED
- Supabase: NOT USED

### Deployment

- Namecheap

Supabase is NOT part of the final architecture.
MongoDB / Mongoose is NOT used for this project.
PostgreSQL is the final database for this project (connection will be added later).

---

## 3. Current Project Phase

Current state:

- Frontend is largely complete with Next.js App Router, Tailwind CSS, and shadcn/ui.
- Temporary mock/localStorage business data currently remains in frontend during backend cutover.
- Backend Step 1 complete: Express + TypeScript architecture, health check (/api/v1/health), security headers, CORS, rate limiting, request logging, and centralized error handling.
- Backend Step 2 Auth/RBAC complete: 5 canonical roles, 21 capabilities, JWT access/refresh token engine, secure HttpOnly cookies, password hashing (bcrypt), and 46/46 automated auth/RBAC tests passing.
- PostgreSQL database is NOT yet connected (will be connected in Backend Step 3).
- Meta, WhatsApp, and AI backend services are not yet connected.

Immediate order:

1. Backend Step 1: Foundation, error handling, health endpoint (COMPLETED).
2. Backend Step 2: Authentication & Canonical RBAC Engine (COMPLETED).
3. Backend Step 3: PostgreSQL Database Integration & Schema (PENDING).
4. Backend Step 4: Business Modules API (Leads, Clients, Teams, Users, Follow-Ups, Reports).
5. Frontend Zero-LocalStorage & API Cutover (Purge mockData.ts).
6. Integrations (Meta Lead Ads, WhatsApp/Baileys, Internal AI CRM Copilot).
7. Production Deployment & Verification on Namecheap.

Do not skip local verification and jump directly to backend integration.

---

## 4. Core Working Principle

**Inspect first. Change second. Verify third.**

Do not make speculative edits.

If the user reports a bug:

- reproduce it locally
- inspect the real browser/server console
- identify root cause
- make the smallest safe fix
- verify manually

Never claim something works based only on static code or synthetic scripts if real behavior is still broken.

---

## 5. Do Not Redesign Frozen Product Decisions

Do not casually change:

- five canonical roles
- 21 capabilities
- hard scope model
- Super Admin/Admin authority rules
- lead statuses
- reporting families
- Incoming Lead external-ID dedupe
- report navigation
- Settings navigation
- AI safety architecture
- blue/white design system
- existing business calculations

If a task appears to require changing one of these, stop and report the conflict before editing.

---

## 6. Authorization Invariants

Always preserve:

### Super Admin

- Organization scope.
- Only role that can manage Admin accounts.
- Only role that can edit Roles & Permissions.
- Protected controls cannot be delegated.

### Admin

May manage:

- Manager
- Team Lead
- Employee

May NOT:

- create Admin
- create Super Admin
- edit Admin
- deactivate Admin
- delete Admin
- reset Admin credentials
- promote anyone to Admin
- promote anyone to Super Admin
- manage Super Admin
- edit Roles & Permissions matrix

### Manager

- managed hierarchy only

### Team Lead

- led team/direct employees only

### Employee

- self only

### RBAC Permission Semantics & Hard Rules

- Default role permissions are baseline defaults only, not permanent ceilings.
- Super Admin may dynamically enable or disable normal capabilities across Manager, Team Lead, and Employee.
- Capabilities grant actions strictly inside the actor's hard organizational scope ceiling (e.g. Employee with canViewReports enabled sees reports only for their own authorized records, never organization-wide).
- Dynamic permissions must NEVER override hard immutable security rules.
- canManageRoles and canManageSuperAdmin are strictly Super Admin only.
- Admin cannot manage, edit, delete, deactivate, or reset Admin or Super Admin accounts.
- Employee Incoming Lead capabilities (canViewIncomingLeads, canAssignIncomingLeads) remain hard-locked to false.
- Secondary team membership grants no supervisory authority.

---

## 7. User/Team Hierarchy Rules

- Explicit manager relationship grants Manager authority.
- Explicit team-lead relationship grants Team Lead authority.
- Secondary team membership grants no supervisory authority.
- One active primary team membership maximum per user.
- Assignment dropdowns must contain only assignable users from current actor's authorized hierarchy.

---

## 8. Frontend Rules

### Current UI

Do not rewrite finished screens without user approval.

Preserve:

- Dashboard
- Leads
- Incoming Leads
- Follow-Ups
- Calendar
- Clients
- Reports
- Users
- Roles
- Teams
- Services
- Lead Sources
- Activity Logs
- Settings
- Proposal Builder
- AI Assistant

### shadcn/ui

Use shadcn where useful, but do not rewrite stable custom components blindly.

### Next.js

- Keep browser-only code safe.
- No render-time state mutation.
- No fake hydration workarounds.
- Test actual local interaction.

---

## 9. Backend Rules

The backend becomes the production source of truth.

Do not duplicate business logic inconsistently between frontend and backend.

For every write:

1. authenticate
2. authorize capability
3. authorize record scope
4. validate input
5. perform mutation
6. write audit entry when required
7. return safe DTO

Frontend must never be the sole enforcement point.

---

## 10. PostgreSQL Database Rules

- Final database architecture is strictly PostgreSQL (MongoDB/Mongoose and Supabase are NOT used).
- PostgreSQL connection will be added later; do not connect yet.
- Define indexes and relational foreign key constraints intentionally.
- Normalize email/identifiers.
- Use server-generated UUIDs or integer IDs.
- Dedicated relational tables for audit/activity logs.
- Transactions for multi-table operations where consistency requires them.
- Single source of truth in PostgreSQL once connected; zero business data in LocalStorage.

---

## 11. API Rules

- REST under `/api/v1`.
- Consistent success/error contract.
- Pagination on large lists.
- Filters are server-side.
- Reports are server-side scoped/aggregated.
- Do not return whole organization datasets merely to filter in browser.
- Never trust user ID/role sent by client as actor identity.

---

## 12. Authentication Rules

Production:

- hash passwords
- secure session/token lifecycle
- HttpOnly cookie where suitable
- no password in response
- no secret in localStorage
- disabled user cannot login
- logout invalidates session

Current mock password/login code is temporary and must be removed during auth cutover.

---

## 13. Incoming Lead Rules

- `externalId` remains the dedupe key.
- Do not switch to phone dedupe without explicit product change.
- Preserve source/campaign/ad/message attribution.
- Assignment requires normal hierarchy and permissions.
- Integration secrets are backend-only.

---

## 14. Meta Integration Rules

Do not fake:

- OAuth
- token
- page connection
- webhook state

Backend must own these.

Frontend shows real status returned by API.

---

## 15. WhatsApp/Baileys Rules

Do not fake:

- QR
- pairing code
- connected state

Backend must own:

- auth/session credentials
- connection lifecycle
- reconnect
- inbound processing

No browser-side Baileys.

---

## 16. AI Assistant Rules (Internal CRM Copilot)

- It is an INTERNAL CRM COPILOT strictly designed for CRM operational intelligence.
- For CRM questions: use authorized CRM/PostgreSQL data only; strictly NO Google/web/external data sourcing.
- Authenticate user first; apply capability + hard organizational scope ceiling.
- Query only authorized records (e.g. yesterday's leads, today's follow-ups, missed follow-ups, pipeline summary, team/user performance, client/conversion info).
- Send only minimal, sanitized, necessary context to AI provider (no raw database dumps, no auth/integration secrets).
- AI may summarize, explain, and draft proposal/message text.
- Mutating actions require normal authorization and explicit user review/confirmation.
- Drafts must not auto-send.
- AI can never expand user access or bypass organizational hierarchy boundaries.
- No AI provider API keys in frontend; all LLM calls originate server-side.

---

## 17. Reporting Rules

Exactly six report groups unless user changes scope:

1. Sales & Pipeline
2. Team & Staff Performance
3. Follow-Ups & Activity
4. Clients & Conversions
5. Source & Service Performance
6. Commercial & Revenue

Hard scope first, filters second.

Do not add duplicate reports simply because a metric can be displayed separately.

No fake historical analytics.

---

## 18. Audit Rules

Use authenticated actor identity.

Audit sensitive/meaningful mutations.

Do not accept actor name/role from request body as authoritative.

Never fabricate IP/device/location fields.

---

## 19. Destructive Operations

Prefer controlled status/reversal/history preservation when data matters historically.

Use explicit confirmation UI.

Backend must still enforce authorization after confirmation.

Do not convert a protected historical business event into a silent hard delete.

---

## 20. Task Size

Work in small verified batches.

A good task changes one coherent domain.

Examples:

Good:

- backend auth scaffold
- users + RBAC API
- lead API
- follow-up API
- report aggregation
- Meta webhook ingestion

Bad:

- “build entire backend and integrate everything”

Do not create giant overlapping changes.

---

## 21. Before Editing

For each task:

- search current code
- find existing types/helpers
- reuse canonical rules
- identify files to change
- identify files that must remain untouched
- check for tests covering the area

Do not duplicate helpers when an existing canonical helper already exists.

---

## 22. After Editing

Always run the relevant checks.

Current frontend baseline:

```bash
npm run lint
npm run test:auth
npm run build
```

Also run local smoke testing for interactive changes.

When backend exists, add backend lint/test/build commands.

---

## 23. Required Task Report

At the end of each task return a concise report:

- What changed
- Files changed
- Business/security rules preserved
- Tests run and results
- Manual verification
- Remaining blockers
- Safe next step

Do not provide exaggerated “everything perfect” claims when a blocker remains.

---

## 24. Stop Conditions

STOP and report before continuing when:

- an authorization rule is ambiguous
- current code contradicts PRD/TRD
- a migration risks data loss
- a dependency change requires architectural approval
- a hosting limitation blocks the planned design
- a secret is found in frontend/repository
- a security fix would change product behavior
- tests fail and the cause is not understood

---

## 25. Documentation Synchronization

When product architecture or a frozen rule changes:

- update PRD
- update TRD
- update AGENT if working rules change
- update SKILLS if technology/practice changes
- update README if setup/development instructions change

Code and docs must not intentionally contradict each other.

---

## 26. Known Cleanup Items

Before backend implementation, check and resolve in controlled tasks:

- ensure all docs and comments align with final PostgreSQL architecture (MongoDB/Mongoose and Supabase removed)
- generic package name `react-example`
- AI Studio artifacts/metadata no longer needed locally
- shadcn component audit
- local interaction test
- gradual TypeScript strictness plan

Do not mix these cleanup tasks with backend feature work unless explicitly requested.
