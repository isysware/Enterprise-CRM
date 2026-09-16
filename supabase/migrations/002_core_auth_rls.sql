-- ==============================================================================
-- PHASE 2B: CORE AUTH, SECURITY HELPERS & ROW LEVEL SECURITY (RLS) BOOTSTRAP
-- Migration File: 002_core_auth_rls.sql
-- Description: Establishes private security helper schema/functions and 
--              conservative, non-recursive RLS policies for the 7 core tables.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PRIVATE SECURITY HELPER SCHEMA (Not exposed through Supabase Data API)
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke all default privileges on private schema for defense in depth
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. SECURITY HELPER FUNCTIONS (STABLE, SECURITY DEFINER with search_path = '')
-- ------------------------------------------------------------------------------

-- Get current authenticated user's profile ID (strictly requires status = 'active')
CREATE OR REPLACE FUNCTION private.current_profile_id()
RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT p.id INTO v_profile_id
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.status = 'active';
    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Get current authenticated user's organization ID
CREATE OR REPLACE FUNCTION private.current_organization_id()
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT p.organization_id INTO v_org_id
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.status = 'active';
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Get current authenticated user's role code (e.g., 'super_admin', 'admin')
CREATE OR REPLACE FUNCTION private.current_role_code()
RETURNS TEXT AS $$
DECLARE
    v_role_code TEXT;
BEGIN
    SELECT r.code INTO v_role_code
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND p.status = 'active';
    RETURN v_role_code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Get current authenticated user's hierarchy level (e.g., 100, 80, 60, 40, 20)
CREATE OR REPLACE FUNCTION private.current_role_level()
RETURNS INTEGER AS $$
DECLARE
    v_level INTEGER;
BEGIN
    SELECT r.hierarchy_level INTO v_level
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND p.status = 'active';
    RETURN pg_catalog.coalesce(v_level, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Check if current user is active Super Admin
CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (private.current_role_code() = 'super_admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Check if current active user is an assigned member of target team (breaks RLS recursion)
CREATE OR REPLACE FUNCTION private.is_current_user_team_member(target_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_member BOOLEAN;
BEGIN
    IF target_team_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.profiles p ON tm.profile_id = p.id
        WHERE tm.team_id = target_team_id
          AND tm.profile_id = auth.uid()
          AND p.status = 'active'
    ) INTO v_is_member;

    RETURN pg_catalog.coalesce(v_is_member, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Check if target team belongs to current active user's organization (breaks RLS recursion)
CREATE OR REPLACE FUNCTION private.team_belongs_to_current_org(target_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_org UUID;
    v_team_org UUID;
BEGIN
    IF target_team_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_current_org := private.current_organization_id();
    IF v_current_org IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT t.organization_id INTO v_team_org
    FROM public.teams t
    WHERE t.id = target_team_id;

    RETURN (v_team_org IS NOT NULL AND v_team_org = v_current_org);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Revoke all function execution privileges from PUBLIC and anon
REVOKE ALL ON FUNCTION private.current_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_profile_id() FROM anon;
GRANT EXECUTE ON FUNCTION private.current_profile_id() TO authenticated;

REVOKE ALL ON FUNCTION private.current_organization_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_organization_id() FROM anon;
GRANT EXECUTE ON FUNCTION private.current_organization_id() TO authenticated;

REVOKE ALL ON FUNCTION private.current_role_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_role_code() FROM anon;
GRANT EXECUTE ON FUNCTION private.current_role_code() TO authenticated;

REVOKE ALL ON FUNCTION private.current_role_level() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_role_level() FROM anon;
GRANT EXECUTE ON FUNCTION private.current_role_level() TO authenticated;

REVOKE ALL ON FUNCTION private.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_super_admin() FROM anon;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated;

REVOKE ALL ON FUNCTION private.is_current_user_team_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_current_user_team_member(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION private.is_current_user_team_member(UUID) TO authenticated;

REVOKE ALL ON FUNCTION private.team_belongs_to_current_org(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.team_belongs_to_current_org(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION private.team_belongs_to_current_org(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. MINIMAL TABLE PRIVILEGES (Authenticated SELECT Only, Zero Anon Privileges)
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT ON public.team_members TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- (a) Organizations: Authenticated users may read only their assigned organization
DROP POLICY IF EXISTS organizations_select_own_org ON public.organizations;
CREATE POLICY organizations_select_own_org
ON public.organizations
FOR SELECT
TO authenticated
USING (
    id = (SELECT private.current_organization_id())
);

-- (b) Roles: Authenticated active CRM users may read system role metadata
DROP POLICY IF EXISTS roles_select_authenticated ON public.roles;
CREATE POLICY roles_select_authenticated
ON public.roles
FOR SELECT
TO authenticated
USING (
    (SELECT private.current_organization_id()) IS NOT NULL
);

-- (c) Permissions: Authenticated active CRM users may read permission definitions
DROP POLICY IF EXISTS permissions_select_authenticated ON public.permissions;
CREATE POLICY permissions_select_authenticated
ON public.permissions
FOR SELECT
TO authenticated
USING (
    (SELECT private.current_organization_id()) IS NOT NULL
);

-- (d) Role Permissions: Authenticated active CRM users may read role-permission mapping
DROP POLICY IF EXISTS role_permissions_select_authenticated ON public.role_permissions;
CREATE POLICY role_permissions_select_authenticated
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
    (SELECT private.current_organization_id()) IS NOT NULL
);

-- (e) Profiles: Active users can view their own profile, or Super Admins can view same-org profiles
DROP POLICY IF EXISTS profiles_select_self_or_super_admin ON public.profiles;
CREATE POLICY profiles_select_self_or_super_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = (SELECT private.current_profile_id())
    OR (
        (SELECT private.is_super_admin())
        AND organization_id = (SELECT private.current_organization_id())
    )
);

-- (f) Teams: Super Admin can read organization teams, or members can read teams they belong to
DROP POLICY IF EXISTS teams_select_scoped ON public.teams;
CREATE POLICY teams_select_scoped
ON public.teams
FOR SELECT
TO authenticated
USING (
    organization_id = (SELECT private.current_organization_id())
    AND (
        (SELECT private.is_super_admin())
        OR private.is_current_user_team_member(id)
    )
);

-- (g) Team Members: Active users can view their own membership rows, or Super Admin can view org memberships
DROP POLICY IF EXISTS team_members_select_scoped ON public.team_members;
CREATE POLICY team_members_select_scoped
ON public.team_members
FOR SELECT
TO authenticated
USING (
    profile_id = (SELECT private.current_profile_id())
    OR (
        (SELECT private.is_super_admin())
        AND private.team_belongs_to_current_org(team_id)
    )
);
