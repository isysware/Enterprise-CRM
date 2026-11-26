# Enterprise Lead CRM — SKILLS.md

This file defines the technical skills, engineering practices, and implementation standards expected when working on this project.

At the start of every development task, read:

1. `PRD.md`
2. `TRD.md`
3. `AGENT.md`
4. `SKILLS.md`

Do not implement from memory when the current code or these documents provide the answer.

---

## 1. Product-Domain Skills

### CRM Lead Lifecycle

Understand and preserve:

- Lead capture.
- Qualification.
- Status progression.
- Follow-up scheduling.
- Assignment/reassignment.
- Proposal creation.
- Client conversion.
- Controlled reversal where supported.
- Pipeline/report analytics.

Canonical lead statuses currently include:

- New
- Contacted
- Follow-Up Required
- Qualified
- Won
- Hold
- Cold
- Returned
- Converted
- Lost

Never silently simplify this lifecycle.

### Sales Organization Hierarchy

Understand:

- Super Admin
- Admin
- Manager
- Team Lead
- Employee

Always distinguish:

- role
- dynamic permission
- hard organizational scope
- explicit manager/team-lead relationship
- team membership

Team membership alone is not supervisory authority.

### Commercial Models

Support configurable models such as:

- SaaS Monthly Subscription
- One-Time Project
- Ownership
- Hybrid/Custom Quotation

Dynamic pricing fields must remain data-driven.

---

## 2. Next.js Skills

Use Next.js App Router correctly.

Required practices:

- Know Server vs Client Component boundaries.
- Use `"use client"` only where hooks/browser APIs require it.
- Avoid render-time state mutations.
- Avoid hydration mismatches.
- Do not access `window`, `document`, or `localStorage` unsafely during SSR.
- Do not wrap the entire app in unnecessary `next/dynamic`.
- Keep client-side CRM interaction reliable.
- Use `next/font` for Poppins.

When debugging a preview/runtime issue:

1. reproduce locally
2. inspect browser console
3. inspect first runtime error
4. distinguish hosting-preview issue from application issue
5. avoid random UI rewrites

---

## 3. TypeScript Skills

- Define DTOs/interfaces explicitly.
- Avoid new `any` unless necessary and documented.
- Preserve enum/union semantics.
- Never silently change a field contract used by reports/forms.
- Keep API and database types separate from UI display types where beneficial.
- Prefer safe parsing/validation at system boundaries.

---

## 4. shadcn/ui & UI Engineering

The project uses a shadcn/ui foundation plus existing CRM-specific primitives.

Use shadcn/ui when it improves consistency for:

- buttons
- inputs
- dialogs
- sheets
- selects
- dropdowns
- alert dialogs
- tabs
- tooltips
- popovers
- tables
- badges
- cards

Do not rewrite stable components merely to claim shadcn usage.

Preserve application-specific primitives such as:

- `DataTableScrollFrame`
- report components
- complex CRM modals/drawers
- specialized chart/metric components

Visual rules:

- Poppins.
- Blue/white enterprise design.
- Lucide icons.
- No emoji/cartoon icons.
- Compact, professional density.
- Minimal shadows.
- Consistent borders/radii.
- Accessible focus states.

---

## 5. React State & Form Skills

- Never call state setters directly during render.
- Prevent double submissions.
- Preserve form values on validation errors.
- Use shared modal/drawer shells.
- Maintain mobile-safe internal scrolling.
- Keep destructive actions behind confirmation.
- Do not show success before mutation succeeds.

---

## 6. Express.js Backend Skills

Backend implementation must use production-oriented Express patterns:

- modular routers
- controllers/services/repositories where useful
- centralized error handling
- validation middleware
- auth middleware
- RBAC/scope middleware
- structured logging
- rate limiting
- secure headers
- CORS allowlist
- environment validation

Do not put all backend logic in one `server.ts`.

---

## 7. PostgreSQL Database Skills

Required:

- Relational schema design with foreign key constraints
- Indexes on frequently queried columns (user email, lead status, assignedToId, teamId)
- Normalized identifiers and unique constraints
- Keyset or limit/offset pagination
- SQL aggregations and joins for reporting
- ACID transactions for multi-table business mutations
- Database connection pooling
- Final database is PostgreSQL (connection added later; MongoDB/Mongoose and Supabase are NOT used)

---

## 8. Relational Data Modeling Skills

Required:

- Canonical table definitions per business entity
- Timestamps (createdAt, updatedAt) enabled across tables
- Validation in schema plus request layer
- Never return password hash in user responses
- Keep business authorization outside raw model queries

---

## 9. Authentication & Security Skills

Mandatory knowledge:

- password hashing
- secure session/token lifecycle
- HttpOnly cookies
- CSRF considerations depending on auth topology
- CORS
- rate limiting
- brute-force protection
- object-level authorization
- secure secret handling
- least privilege

Never trust role/capability fields sent by frontend.

Backend derives actor identity and permissions from the authenticated session.

---

## 10. RBAC & Scope Skills

The most important project rule:

**Capability does not equal scope.**

Correct flow:

1. resolve authenticated user
2. resolve hard scope
3. resolve effective capabilities
4. authorize action
5. query only permitted records

Never:

1. query all organization data
2. send it to frontend
3. hide unauthorized rows in UI

Protected invariants:

- Super Admin-only Roles Matrix.
- Only Super Admin can manage Admin.
- Admin cannot create/promote to Admin or Super Admin.
- Employee cannot gain cross-user scope from a permission toggle.

---

## 11. Audit & Data Integrity Skills

Meaningful mutations require actor attribution.

Prefer:

- explicit status changes
- reversible operations
- audit records
- immutable historical snapshots where required

Avoid:

- silent history rewrites
- deleting converted history without trace
- changing old proposal/commercial values when master settings change

---

## 12. Reporting Skills

Reports must be:

- scope-safe
- filterable
- based on canonical records
- reproducible
- honest

Current report families:

1. Sales & Pipeline
2. Team & Staff Performance
3. Follow-Ups & Activity
4. Clients & Conversions
5. Source & Service Performance
6. Commercial & Revenue

Know the difference between:

- pipeline value
- converted value
- realized/active client revenue
- average deal value

Never fabricate trends because the UI has space for a chart.

---

## 13. Excel / Print / PDF Skills

- `.xlsx` exports must contain only currently authorized/filtered data.
- Keep numeric values numeric where practical.
- Include report metadata.
- Print/PDF view must hide app chrome.
- Do not label CSV as Excel.
- Do not fake file generation.

---

## 14. Meta Lead Ads Integration Skills

Backend-only sensitive operations:

- OAuth
- token exchange/refresh
- webhook verification
- secret storage

Incoming lead ingestion needs:

- source attribution
- external ID dedupe
- idempotency
- validation
- audit
- retry/error handling

Never store Meta secrets in browser code.

---

## 15. WhatsApp / Baileys Skills

Baileys belongs in the backend runtime.

Understand:

- QR/pairing session
- auth state persistence
- reconnect lifecycle
- connection status
- inbound message processing
- controlled outbound action

Never:

- generate fake QR
- expose session credentials
- pretend connection succeeded
- run Baileys from frontend

---

## 16. AI Assistant Skills (Internal CRM Copilot)

Internal CRM Copilot rules:

- operates as an INTERNAL CRM COPILOT for operational intelligence
- for CRM questions: query authorized CRM/PostgreSQL database records only; strictly NO Google/web/external data sourcing
- authenticate user first and resolve capability matrix + hard organizational hierarchy ceiling
- queries authorized records (e.g. yesterday's leads, today's follow-ups, missed follow-ups, pipeline summary, team/user performance, client/conversion info)
- provider key is backend-only; zero keys in frontend
- context is authorization-scoped and sanitized; sensitive credentials excluded
- context should be minimal and focused, not a database dump
- no cross-scope inference; AI cannot expand user access
- mutating actions require explicit user confirmation and execution through normal CRM API authorization
- drafts do not auto-send

When AI is unavailable, return a clear service state, not fake answers.

---

## 17. Testing Skills

Before marking a task complete:

- TypeScript/typecheck.
- Existing authorization tests.
- Backend tests when backend exists.
- Production build.
- Manual smoke check for changed UI/workflow.
- Role/scope tests for security-sensitive changes.

For RBAC changes, test both:

- visible UI
- direct backend/API attempt

UI hiding is not a security test.

---

## 18. Debugging Skills

Debug from evidence.

Order:

1. reproduce
2. inspect console/log
3. identify first real error
4. isolate layer
5. fix minimum necessary code
6. rerun tests
7. manually verify

Do not generate synthetic “passed” claims when actual preview/local behavior is broken.

---

## 19. Git & Change Management

- Small coherent commits.
- Do not mix UI redesign, RBAC changes, and backend migrations in one commit.
- Preserve known-good checkpoints.
- Do not overwrite `.git`.
- Do not commit `.env`.
- Do not commit secrets.
- Review diffs before commit.
- Keep docs synchronized when architecture/business rules change.

---

## 20. Deployment Skills

For Namecheap:

- confirm Node runtime.
- configure environment variables securely.
- configure HTTPS.
- configure backend process/restart.
- configure PostgreSQL access and connection pooling.
- configure frontend/backend origins.
- verify CORS.
- verify persistent runtime needs for integrations.

Deployment success means more than “build passed”; login, APIs, database, uploads, reports, and integrations must be smoke-tested in production.
