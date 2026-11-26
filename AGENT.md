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

- Frontend is largely complete.
- The frontend was migrated from Vite to Next.js.
- Supabase was removed.
- Current business persistence is still local/mock/localStorage.
- Backend was created (Express + TypeScript).
- PostgreSQL database is not yet connected (will be connected in later step).
- Meta, WhatsApp, and AI backend services are not yet connected.
- Existing authorization tests are valuable and must remain passing.

Immediate order:

1. Run latest frontend locally.
2. Fix only proven local runtime issues.
3. Perform a focused shadcn/UI/code cleanup if requested.
4. Freeze frontend.
5. Create backend.
6. Connect PostgreSQL database.
7. Build production auth/RBAC.
8. Migrate modules from local persistence to API.
9. Add integrations/AI.
10. Deploy and verify.

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

Dynamic permissions never expand hard scope.

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

## 16. AI Assistant Rules

- No AI provider key in frontend.
- No direct browser LLM SDK.
- AI context must be scope-safe.
- Do not send raw full-database context.
- Do not expose auth/integration secrets.
- AI cannot bypass normal APIs.
- Mutating suggestions require user review and confirmation.
- Drafts must not auto-send.

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

- stale PostgreSQL wording in current TypeScript comments
- generic package name `react-example`
- AI Studio artifacts/metadata no longer needed locally
- shadcn component audit
- local interaction test
- gradual TypeScript strictness plan

Do not mix these cleanup tasks with backend feature work unless explicitly requested.
