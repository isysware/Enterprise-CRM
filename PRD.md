# Enterprise Lead CRM — Product Requirements Document (PRD)

**Document status:** Baseline product specification  
**Product:** Enterprise Lead CRM  
**Company / default workspace:** iSysware  
**Current phase:** Frontend completed in Google AI Studio; local verification and backend/database integration are next  
**Final target stack:** Next.js + TypeScript + shadcn/ui frontend, Node.js + Express.js backend, MongoDB Atlas database, Namecheap deployment

---

## 1. Product Vision

Enterprise Lead CRM is a role-aware sales CRM for managing the complete lead lifecycle from lead capture through follow-up, proposal, conversion, client management, reporting, and administration.

The product must provide:

- One centralized CRM workspace for sales operations.
- Strict role-based access and organizational data scoping.
- Clear lead ownership, team hierarchy, follow-up accountability, and conversion tracking.
- Configurable services, lead sources, pricing models, proposal templates, and application settings.
- Management reporting without duplicate or fabricated analytics.
- Future Meta Lead Ads, WhatsApp/Baileys, and AI Assistant integrations through a secure backend.
- Full actor attribution and audit history for meaningful business actions.

The current frontend uses local mock data/local browser persistence only. The production backend and MongoDB Atlas database are intentionally deferred to the next development phase.

---

## 2. Product Goals

1. Centralize leads from manual entry, CSV import, Meta Lead Ads, WhatsApp, calls, website, referrals, and other sources.
2. Give each role only the information and actions allowed within its organizational hierarchy.
3. Make sales follow-up discipline measurable through due, missed, completed, and upcoming activity.
4. Provide managers and administrators with real current pipeline and performance analytics.
5. Support proposal generation and configurable commercial/pricing models.
6. Convert qualified leads into clients without losing lead history.
7. Maintain immutable/traceable business history where destructive deletion would create reporting or accountability problems.
8. Prepare a secure foundation for external integrations and AI-assisted CRM workflows.
9. Keep the user interface professional, responsive, clean, and consistent across all modules.

---

## 3. User Roles

The canonical roles are:

### 3.1 Super Admin

Organization-level authority.

Key responsibilities:

- Organization-wide CRM visibility.
- Manage Admin, Manager, Team Lead, and Employee accounts.
- Only role allowed to create/manage Admin accounts.
- Only role allowed to edit the Roles & Permissions matrix.
- Manage teams, services, sources, settings, integrations, reports, and operational data.
- Protected Super Admin authority must never be granted to lower roles through dynamic permission toggles.

Ordinary user creation must not expose creation of another Super Admin account unless a future protected provisioning workflow is explicitly designed.

### 3.2 Admin

Organization-wide operational administrator.

Allowed:

- Manage Manager, Team Lead, and Employee accounts.
- Manage operational teams, services, sources, settings, leads, reports, and other allowed CRM modules.

Forbidden:

- Create Super Admin.
- Create Admin.
- Promote any user to Admin or Super Admin.
- Edit, deactivate, delete, reset credentials, or change role of any Super Admin.
- Edit, deactivate, delete, reset credentials, or change role of any Admin.
- Edit Roles & Permissions matrix.

### 3.3 Manager

Scope: canonical managed hierarchy only.

Typical access:

- Managed teams.
- Team Leads and Employees under the manager.
- Leads, follow-ups, clients, reports, assignment/reassignment, and performance within that hierarchy.
- No organization-wide access outside the managed scope.

### 3.4 Team Lead

Scope: canonical led team/sub-team only.

Typical access:

- Own led team.
- Direct reporting Employees.
- Authorized leads and follow-ups.
- Team operational performance within scope.
- No cross-team supervisory authority.

Secondary membership must never grant supervisory authority.

### 3.5 Employee

Scope: self only.

Typical access:

- Own assigned leads.
- Own follow-ups/calendar.
- Personal CRM work.
- No cross-user rankings, team-wide visibility, user administration, integration management, or organization-wide reporting unless the product is explicitly changed later.

---

## 4. Authorization Model

The product uses two independent authorization layers:

### 4.1 Hard Organizational Scope

Hard scope defines the maximum records a role can ever access.

- Super Admin: organization scope.
- Admin: organization operational scope.
- Manager: managed hierarchy.
- Team Lead: led team/direct employees.
- Employee: self.

Hard scope can never be expanded by a dynamic permission.

### 4.2 Dynamic Capabilities

The frontend currently defines 21 canonical capabilities:

1. `canViewAllLeads`
2. `canViewTeamLeads`
3. `canViewAssignedLeads`
4. `canEditAllLeads`
5. `canCreateLeads`
6. `canDeleteLeads`
7. `canReassignLeads`
8. `canGenerateProposals`
9. `canManageUsers`
10. `canManageSuperAdmin`
11. `canManageRoles`
12. `canManageTeams`
13. `canManageServices`
14. `canViewReports`
15. `canViewClients`
16. `canViewAuditLogs`
17. `canAccessSettings`
18. `canBulkImportExport`
19. `canViewIncomingLeads`
20. `canAssignIncomingLeads`
21. `canManageIntegrations`

Rules:

- Dynamic permissions may reduce access.
- Dynamic permissions may never expand hard scope.
- `canManageRoles` and `canManageSuperAdmin` are hard-reserved for Super Admin.
- Employee Incoming Lead capabilities remain locked off.
- Backend enforcement is mandatory. Frontend permission checks are UX controls, not production security.

---

## 5. Core Modules

### 5.1 Authentication & Session

Requirements:

- Unified login screen.
- User status must be checked before login is accepted.
- Production authentication must move to backend-managed secure sessions.
- Passwords must never be stored in plain text in MongoDB.
- Login/logout actions should be auditable.
- Current mock credentials/local authentication are development-only.

### 5.2 Dashboard

Purpose: live operational summary, not a replacement for detailed reports.

Current dashboard scope includes:

- Personalized greeting.
- Scoped lead count.
- Pipeline value.
- Missed follow-ups.
- Hot/urgent leads.
- New leads.
- Converted deals.
- Pending follow-ups.
- Pipeline stage distribution.
- Pipeline snapshot.
- Lead source performance.
- Follow-up health.
- Lead quality.
- Priority mix.
- Team workload.
- Scope-aware Performance Center.
- Recent activity.

Dashboard values must always come from the user's authorized scope.

### 5.3 Leads

A lead includes:

- Contact name.
- Business/company name.
- Phone.
- Email.
- City.
- Services of interest.
- Lead value in PKR.
- Source.
- Status.
- Priority.
- Quality.
- Assigned representative.
- Team.
- Dates.
- Next follow-up.
- Tags.
- Notes.
- Pricing/budget information.
- Activity timeline.

Canonical statuses currently include:

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

Priority:

- Urgent
- High
- Medium
- Low

Quality:

- Good
- Average
- Poor

Core actions:

- Create.
- Edit where authorized.
- Reassign where authorized.
- Change status.
- Schedule follow-up.
- Log interaction/activity.
- Generate proposal where authorized.
- Convert to client.
- Delete only where explicitly permitted.
- Filter/search/table/Kanban views.
- CSV import/export.

### 5.4 Incoming Leads

Purpose: capture external lead sources before they enter the normal lead pipeline.

Current/future sources:

- Meta Lead Ads.
- WhatsApp/Baileys.
- Other integrations later.

Rules:

- Incoming lead deduplication is based on `externalId`, not phone number.
- Assignment requires the relevant Incoming Lead capability and normal lead creation authority.
- Source/campaign/ad/message attribution must be preserved when converted into a CRM lead.
- Employee has no Incoming Lead access.
- Integration secrets must never exist in browser state.

### 5.5 Follow-Ups

Fields:

- Lead.
- Client/business context.
- Phone.
- Date.
- Time.
- Type.
- Assigned user.
- Notes.
- Status.
- Completion/result notes.

Types currently supported:

- Call
- Meeting
- WhatsApp
- Demo
- Visit
- Email

Statuses:

- Pending
- Done
- Missed
- Cancelled

Actions:

- Schedule.
- Reschedule.
- Complete.
- Cancel/delete where existing product rules allow.

### 5.6 Calendar

Requirements:

- Month calendar.
- Agenda/list mode for smaller screens.
- Scheduled follow-up visibility.
- Selected day activity panel.
- Current day highlighting.
- Mobile-safe layout.
- All records must respect user scope.

### 5.7 Clients & Conversion

Lead-to-client conversion must preserve attribution and commercial context.

Client data includes:

- Business/client identity.
- Contact data.
- Services.
- Source.
- Pricing model.
- Final value.
- Assigned owner.
- Generated-by / closed-by attribution where available.
- Payment terms.
- Package/conversion notes.
- Converted date.
- Status.

Client statuses:

- Active
- Paused
- Cancelled

A controlled return/reversal to lead may be supported. History must not silently disappear.

### 5.8 Proposals

Proposal functionality includes:

- Lead/client context.
- Proposal number/reference.
- Scope of work.
- Deliverables.
- Line items.
- Discounts.
- Tax.
- Grand total.
- Payment milestones.
- Terms and conditions.
- Company/letterhead information.
- Authorized signatory.
- Print/PDF-friendly output.
- Status history.

Proposal statuses:

- Draft
- Sent
- Accepted
- Revised
- Declined

The frontend must not claim an email/message was sent unless a real backend delivery action succeeded.

### 5.9 Teams

Team structure includes:

- Team name/code.
- Description.
- Manager.
- Team Lead.
- Members.
- Primary membership context.

Rules:

- At most one primary team membership per user.
- Secondary membership grants no supervisory authority.
- Manager and Team Lead authority must be based on explicit canonical relationships, not arbitrary membership.

### 5.10 Users

User administration includes:

- Name.
- Email/username.
- Phone.
- Role.
- Team.
- Manager/Team Lead relationships.
- Status.
- Credentials flow.

Production password storage must use a secure password hash.

Protected account rules from Section 3 are mandatory.

### 5.11 Roles & Permissions

- Super Admin only.
- 21-capability matrix.
- Protected hard-locked capabilities.
- Save/reset functions.
- Backend must enforce the same model.

### 5.12 Services

Service master includes:

- Name.
- Category.
- Description.
- Pricing model.
- Default price.
- Status.

Services page is master-data focused. Sales performance belongs in Reports.

### 5.13 Lead Sources

Lead Source master includes:

- Name.
- Description.
- Status.

Source page is master-data focused. Conversion/pipeline analytics belong in Reports.

### 5.14 Pricing Models

The system supports configurable pricing models and dynamic fields.

Current examples:

- Monthly Subscription (SaaS)
- One-Time Project
- Ownership Model
- Custom Quotation / Hybrid

Dynamic field types currently include:

- Currency
- Number
- Text
- Dropdown
- Date

Models can specify whether a numeric field contributes to calculated deal value.

### 5.15 Reporting

Reporting is separate from the Dashboard.

Exactly six consolidated report families are currently defined:

1. Sales & Pipeline
2. Team & Staff Performance
3. Follow-Ups & Activity
4. Clients & Conversions
5. Source & Service Performance
6. Commercial & Revenue

Rules:

- Reports are read-only analytics.
- Scope is applied before report filters.
- No fake targets, growth, historical trends, response times, or forecast metrics.
- Employee reporting must remain personal-only.
- Export must honor active report, active filters, and authorized scope.
- Excel export uses `.xlsx`.
- PDF/Print uses print-optimized output.

### 5.16 Activity Logs

Track meaningful actions with:

- Timestamp.
- Actor user.
- Actor role.
- Action.
- Entity/module.
- Entity title/reference.
- Details.

Do not fabricate IP, device, browser, location, or other audit information that was not captured.

### 5.17 Settings

Dedicated settings sections:

- Organization Identity.
- Letterhead & PDF.
- Pricing Models.
- Communication & Alerts.

Current settings include:

- Application/company identity.
- Logo/local preview.
- Address/contact/tax details.
- Currency and symbol.
- Timezone.
- Proposal validity/terms.
- Letterhead/background.
- Signatory.
- Stale lead threshold.
- Follow-up reminder.
- WhatsApp message templates/preferences.

File previews are currently frontend-only until backend storage is connected.

### 5.18 AI Assistant

The AI Assistant frontend is already prepared.

Principles:

- AI never expands user scope.
- Backend receives only pre-authorized/sanitized context.
- No API keys or LLM secrets in frontend.
- No fake AI responses.
- CRM Quick Insights are deterministic and clearly separate from AI-generated content.
- Mutating actions require explicit user review and normal CRM authorization.
- AI may draft messages/proposal text but must not auto-send messages.

Future backend endpoint:

`POST /api/ai/assistant`

---

## 6. External Integrations

### 6.1 Meta Lead Ads

Future backend responsibilities:

- OAuth flow.
- Token storage server-side.
- Page/form subscription.
- Webhook validation.
- Incoming lead ingestion.
- Deduplication using external lead ID.
- Audit and error handling.

Frontend must never store Meta secrets.

### 6.2 WhatsApp / Baileys

Future backend responsibilities:

- Session lifecycle.
- QR/pairing code generation.
- Secure auth/session credential storage.
- Reconnection.
- Incoming message/lead handling.
- Optional message sending only after user-authorized workflow.

Frontend must never fabricate QR codes or connection states.

---

## 7. CSV Lead Import

Canonical CSV fields:

- Name
- Phone
- Business
- Email
- City
- Service
- ValuePKR
- Source

Rules:

- Name and Phone required.
- Preserve quoted CSV parsing.
- Do not fabricate missing optional fields.
- Import is permission-gated.
- Validation/preview must precede posting.
- Backend phase should add idempotency/duplicate controls where necessary.

---

## 8. User Experience Requirements

- Poppins typography.
- Blue/white enterprise CRM visual system.
- shadcn/ui foundation and reusable UI primitives.
- Responsive at desktop, tablet, and mobile widths.
- No page-level horizontal overflow.
- Wide tables use the shared docked horizontal-scroll behavior.
- Forms/modals use consistent shells, field spacing, validation, and action footers.
- Destructive operations use shared confirmation UX.
- Lucide icons; no emoji/cartoon iconography.
- Reports and Settings use nested main-sidebar navigation.
- Accessible focus states, labels, keyboard interaction, and button types.

---

## 9. Data Integrity Rules

1. Hard scope is always applied before filters and capabilities.
2. No direct client trust for sensitive permissions.
3. Protected Admin/Super Admin rules are immutable unless product requirements explicitly change.
4. Incoming Lead dedupe uses `externalId`.
5. Posted/audited business history should prefer controlled reversal over silent destructive mutation where history matters.
6. Metrics must be derived from actual stored data.
7. Pipeline value must not automatically be called revenue.
8. AI context must be sanitized and scoped before leaving the backend.
9. Integration credentials are server-only.
10. Every backend mutation must capture the authenticated actor where auditability is relevant.

---

## 10. Non-Functional Requirements

### Security

- Server-side RBAC on every protected endpoint.
- Password hashing.
- Secure sessions/tokens.
- Input validation.
- Rate limiting.
- Secure headers.
- CORS configured only for approved origins.
- Secrets in server environment variables only.
- No sensitive data in frontend bundles.
- Audit logging.
- Fail-closed authorization.

### Performance

- Indexed MongoDB queries.
- Paginated large lists/logs/reports.
- Avoid loading full organization datasets when not required.
- Efficient report aggregation.
- Lazy-load heavy UI where useful without breaking interaction.

### Reliability

- Central error handling.
- Idempotency for integration ingestion and sensitive repeated mutations.
- Retry strategy for external integration processing.
- Backups through MongoDB Atlas policy.
- Production logging.

### Accessibility

- Keyboard support.
- Semantic buttons/labels.
- Focus visibility.
- Reasonable contrast.
- Responsive usable modals/drawers.

---

## 11. Final Target Technology

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui components/foundation
- Poppins
- Lucide icons

### Backend

- Node.js
- Express.js
- REST API
- Validation layer
- Server-side RBAC
- Secure authentication/session management

### Database

- MongoDB Atlas
- Mongoose or equivalent ODM may be used during backend implementation if selected consistently.

### Deployment

- Namecheap is the production deployment target.
- Before final backend deployment, verify the selected Namecheap plan supports the required Node.js runtime and any long-lived connection requirements.
- If WhatsApp/Baileys needs a persistent process unavailable on the selected shared plan, keep the same application architecture and deploy that backend component on an appropriate Namecheap Node/VPS environment.

---

## 12. Current Development Status

Completed:

- Next.js frontend migration.
- UI design system.
- Role-aware navigation.
- Dashboard.
- Leads.
- Incoming Leads UI.
- Follow-Ups.
- Calendar.
- Clients.
- Reports.
- Users.
- Roles & Permissions.
- Teams.
- Services.
- Lead Sources.
- Activity Logs.
- Settings.
- Proposal Builder.
- CSV import.
- AI Assistant frontend contract.
- Frontend authorization tests.

Not production-connected yet:

- Express backend.
- MongoDB Atlas.
- Real authentication.
- Real API persistence.
- Real file storage.
- Meta OAuth/webhooks.
- WhatsApp/Baileys runtime.
- Real AI model backend.
- Production audit persistence.
- Production deployment.

---

## 13. Acceptance Criteria for Production Release

The product is ready for production only when:

1. Frontend runs cleanly with production API instead of local mock/localStorage business persistence.
2. Express backend is implemented and documented.
3. MongoDB Atlas schemas/indexes/migrations/seed strategy are complete.
4. Authentication is secure and server enforced.
5. All 21 capabilities and hard scopes are enforced backend-side.
6. Protected Admin/Super Admin rules pass integration tests.
7. Lead/follow-up/client/proposal workflows persist correctly.
8. Reports reconcile with canonical database records.
9. External integration secrets are server-only.
10. Meta/WhatsApp states are real, not simulated.
11. AI Assistant uses a secure server endpoint and scoped context.
12. Audit logging is persistent.
13. Error handling, validation, rate limiting, and security headers are active.
14. Automated tests and production build pass.
15. Namecheap deployment is verified end-to-end.
