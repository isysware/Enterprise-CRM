-- ==============================================================================
-- PHASE 2C: PERMISSIONS CATALOG & ROLE-PERMISSION MATRIX SEED
-- Migration File: 004_permissions_matrix_seed.sql
-- Description: Seeds the canonical 18 permission capabilities and maps them 
--              to the 5 CRM roles in accordance with the existing Roles & Permissions UI.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEED CANONICAL PERMISSIONS (Idempotent upsert via unique permission code)
-- ------------------------------------------------------------------------------
INSERT INTO public.permissions (code, module, name, description)
VALUES
    -- 1. Lead Visibility & Pipeline
    (
        'leads.view_all',
        'Lead Visibility & Pipeline',
        'Full Lead Visibility (Within Allowed Scope)',
        'View all leads available within the user''s authorized organizational scope.'
    ),
    (
        'leads.view_team',
        'Lead Visibility & Pipeline',
        'Team & Department Leads Visibility',
        'View leads belonging to assigned team members and direct report subordinates.'
    ),
    (
        'leads.view_assigned',
        'Lead Visibility & Pipeline',
        'Assigned Direct Leads Visibility',
        'View leads specifically assigned to the user profile.'
    ),

    -- 2. Lead Actions & Ownership
    (
        'leads.create',
        'Lead Actions & Ownership',
        'Create New Leads',
        'Add new prospective customer records to the CRM pipeline.'
    ),
    (
        'leads.edit_scoped',
        'Lead Actions & Ownership',
        'Edit All Scoped Leads',
        'Modify details, status, contact records, and pricing for visible leads.'
    ),
    (
        'leads.delete',
        'Lead Actions & Ownership',
        'Delete Lead Records',
        'Permanently remove leads and associated follow-up histories from CRM.'
    ),
    (
        'leads.reassign',
        'Lead Actions & Ownership',
        'Reassign Lead Ownership',
        'Transfer customer lead ownership to subordinate team members or reps.'
    ),
    (
        'proposals.generate',
        'Lead Actions & Ownership',
        'Generate & Send Proposals',
        'Create commercial proposals, customize itemized quotation tables, and export PDFs.'
    ),
    (
        'leads.bulk_import_export',
        'Lead Actions & Ownership',
        'Bulk CSV Import & Export',
        'Import leads via spreadsheet and export pipeline data to CSV.'
    ),

    -- 3. Business & Analytics
    (
        'clients.view',
        'Business & Analytics',
        'Access Active Clients Directory',
        'View converted accounts, recurring billings, and client ledgers.'
    ),
    (
        'reports.view',
        'Business & Analytics',
        'View Analytics & Performance Reports',
        'Access executive dashboards, conversion stats, and staff league tables.'
    ),
    (
        'teams.manage',
        'Business & Analytics',
        'Manage Teams & Departments',
        'Create and configure sales teams, team leaders, and department members.'
    ),
    (
        'services.manage',
        'Business & Analytics',
        'Manage Service & Product Catalogs',
        'Add, edit base pricing, and adjust service offerings and software packages.'
    ),

    -- 4. System Administration
    (
        'users.manage',
        'System Administration',
        'Manage User Accounts & Credentials',
        'Provision staff members, change passwords, and deactivate accounts.'
    ),
    (
        'users.manage_super_admin',
        'System Administration',
        'Manage Super Admin Profiles',
        'Edit, password-reset, or modify Super Admin master accounts.'
    ),
    (
        'roles.manage',
        'System Administration',
        'Edit Role Permissions Matrix',
        'Customize and enforce granular access control matrices across all roles.'
    ),
    (
        'audit_logs.view',
        'System Administration',
        'Access Security Audit Trail Logs',
        'Review complete historical event logs and user access records.'
    ),
    (
        'settings.manage',
        'System Administration',
        'System Configurations & Currency',
        'Modify company branding, default currency, timezones, and stale lead thresholds.'
    )
ON CONFLICT (code) DO UPDATE SET
    module = EXCLUDED.module,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 2. SEED ROLE-PERMISSION MAPPINGS (Idempotent resolution via code joins)
-- ------------------------------------------------------------------------------
INSERT INTO public.role_permissions (role_id, permission_id, enabled)
SELECT 
    r.id AS role_id,
    p.id AS permission_id,
    map.enabled
FROM (
    VALUES
        -- ======================================================================
        -- 1. Super Admin: 18/18 enabled (Full unrestricted administrative master)
        -- ======================================================================
        ('super_admin', 'leads.view_all', TRUE),
        ('super_admin', 'leads.view_team', TRUE),
        ('super_admin', 'leads.view_assigned', TRUE),
        ('super_admin', 'leads.create', TRUE),
        ('super_admin', 'leads.edit_scoped', TRUE),
        ('super_admin', 'leads.delete', TRUE),
        ('super_admin', 'leads.reassign', TRUE),
        ('super_admin', 'proposals.generate', TRUE),
        ('super_admin', 'leads.bulk_import_export', TRUE),
        ('super_admin', 'clients.view', TRUE),
        ('super_admin', 'reports.view', TRUE),
        ('super_admin', 'teams.manage', TRUE),
        ('super_admin', 'services.manage', TRUE),
        ('super_admin', 'users.manage', TRUE),
        ('super_admin', 'users.manage_super_admin', TRUE),
        ('super_admin', 'roles.manage', TRUE),
        ('super_admin', 'audit_logs.view', TRUE),
        ('super_admin', 'settings.manage', TRUE),

        -- ======================================================================
        -- 2. Admin: 17/18 enabled (All permissions except managing Super Admin)
        -- ======================================================================
        ('admin', 'leads.view_all', TRUE),
        ('admin', 'leads.view_team', TRUE),
        ('admin', 'leads.view_assigned', TRUE),
        ('admin', 'leads.create', TRUE),
        ('admin', 'leads.edit_scoped', TRUE),
        ('admin', 'leads.delete', TRUE),
        ('admin', 'leads.reassign', TRUE),
        ('admin', 'proposals.generate', TRUE),
        ('admin', 'leads.bulk_import_export', TRUE),
        ('admin', 'clients.view', TRUE),
        ('admin', 'reports.view', TRUE),
        ('admin', 'teams.manage', TRUE),
        ('admin', 'services.manage', TRUE),
        ('admin', 'users.manage', TRUE),
        ('admin', 'users.manage_super_admin', FALSE),
        ('admin', 'roles.manage', TRUE),
        ('admin', 'audit_logs.view', TRUE),
        ('admin', 'settings.manage', TRUE),

        -- ======================================================================
        -- 3. Manager: 9/18 enabled (Department pipeline, reports, clients, reassign)
        -- ======================================================================
        ('manager', 'leads.view_all', TRUE),
        ('manager', 'leads.view_team', TRUE),
        ('manager', 'leads.view_assigned', TRUE),
        ('manager', 'leads.create', TRUE),
        ('manager', 'leads.edit_scoped', TRUE),
        ('manager', 'leads.delete', FALSE),
        ('manager', 'leads.reassign', TRUE),
        ('manager', 'proposals.generate', TRUE),
        ('manager', 'leads.bulk_import_export', FALSE),
        ('manager', 'clients.view', TRUE),
        ('manager', 'reports.view', TRUE),
        ('manager', 'teams.manage', FALSE),
        ('manager', 'services.manage', FALSE),
        ('manager', 'users.manage', FALSE),
        ('manager', 'users.manage_super_admin', FALSE),
        ('manager', 'roles.manage', FALSE),
        ('manager', 'audit_logs.view', FALSE),
        ('manager', 'settings.manage', FALSE),

        -- ======================================================================
        -- 4. Team Lead: 6/18 enabled (Assigned sub-team pipeline, reports, clients, reassign)
        -- ======================================================================
        ('team_lead', 'leads.view_all', FALSE),
        ('team_lead', 'leads.view_team', TRUE),
        ('team_lead', 'leads.view_assigned', FALSE),
        ('team_lead', 'leads.create', TRUE),
        ('team_lead', 'leads.edit_scoped', TRUE),
        ('team_lead', 'leads.delete', FALSE),
        ('team_lead', 'leads.reassign', TRUE),
        ('team_lead', 'proposals.generate', FALSE),
        ('team_lead', 'leads.bulk_import_export', FALSE),
        ('team_lead', 'clients.view', TRUE),
        ('team_lead', 'reports.view', TRUE),
        ('team_lead', 'teams.manage', FALSE),
        ('team_lead', 'services.manage', FALSE),
        ('team_lead', 'users.manage', FALSE),
        ('team_lead', 'users.manage_super_admin', FALSE),
        ('team_lead', 'roles.manage', FALSE),
        ('team_lead', 'audit_logs.view', FALSE),
        ('team_lead', 'settings.manage', FALSE),

        -- ======================================================================
        -- 5. Employee: 2/18 enabled (Assigned direct leads, create leads)
        -- ======================================================================
        ('employee', 'leads.view_all', FALSE),
        ('employee', 'leads.view_team', FALSE),
        ('employee', 'leads.view_assigned', TRUE),
        ('employee', 'leads.create', TRUE),
        ('employee', 'leads.edit_scoped', FALSE),
        ('employee', 'leads.delete', FALSE),
        ('employee', 'leads.reassign', FALSE),
        ('employee', 'proposals.generate', FALSE),
        ('employee', 'leads.bulk_import_export', FALSE),
        ('employee', 'clients.view', FALSE),
        ('employee', 'reports.view', FALSE),
        ('employee', 'teams.manage', FALSE),
        ('employee', 'services.manage', FALSE),
        ('employee', 'users.manage', FALSE),
        ('employee', 'users.manage_super_admin', FALSE),
        ('employee', 'roles.manage', FALSE),
        ('employee', 'audit_logs.view', FALSE),
        ('employee', 'settings.manage', FALSE)
) AS map(role_code, permission_code, enabled)
JOIN public.roles r ON r.code = map.role_code
JOIN public.permissions p ON p.code = map.permission_code
ON CONFLICT (role_id, permission_id) 
DO UPDATE SET 
    enabled = EXCLUDED.enabled;

-- ------------------------------------------------------------------------------
-- 3. VERIFICATION QUERIES (FOR MANUAL EXECUTION IN SUPABASE SQL EDITOR)
-- ------------------------------------------------------------------------------
/*
-- Verification A: Return all permissions ordered by module & code
SELECT 
    id,
    module,
    code,
    name,
    description
FROM public.permissions
ORDER BY module, code;

-- Verification B: Total permissions count (Expected: 18)
SELECT count(*) AS total_permissions FROM public.permissions;

-- Verification C: Enabled capabilities count per role code
SELECT 
    r.code AS role_code,
    r.name AS role_name,
    r.hierarchy_level,
    count(rp.permission_id) FILTER (WHERE rp.enabled = TRUE) AS enabled_permissions_count,
    count(rp.permission_id) AS total_mapped_permissions
FROM public.roles r
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
GROUP BY r.id, r.code, r.name, r.hierarchy_level
ORDER BY r.hierarchy_level DESC;

-- Verification D: Complete matrix overview
SELECT 
    r.code AS role_code,
    p.module,
    p.code AS permission_code,
    p.name AS permission_name,
    rp.enabled
FROM public.roles r
CROSS JOIN public.permissions p
LEFT JOIN public.role_permissions rp 
    ON rp.role_id = r.id AND rp.permission_id = p.id
ORDER BY r.hierarchy_level DESC, p.module, p.code;
*/
