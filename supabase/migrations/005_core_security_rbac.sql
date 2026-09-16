-- ============================================================================
-- Migration 005 (Part 7B.1): Core Security, RBAC Helpers & Expanded SELECT RLS
-- ============================================================================
-- Purpose:
-- 1. Precheck data integrity for primary team memberships (fail-closed guard).
-- 2. Enforce one primary team membership per profile via partial unique index.
-- 3. Define private, non-recursive security and hierarchy scope helpers:
--    - private.has_permission(permission_code text)
--    - private.is_org_admin()
--    - private.get_subordinate_profile_ids()
--    - private.is_profile_in_current_scope(target_profile_id uuid)
-- 4. Replace conservative SELECT RLS policies with hierarchy-aware SELECT policies
--    for profiles, teams, and team_members.
--
-- Invariants:
-- - Hard Scope Ceilings are strictly enforced (Super Admin/Admin -> Org;
--   Manager -> Managed hierarchy; Team Lead -> Led sub-team; Employee -> Self).
-- - Random team memberships never grant management or supervisory authority.
-- - Conflicting hierarchy signals fail closed.
-- - No table write grants are added; authenticated write access remains revoked.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COMPREHENSIVE LEGACY DATA INTEGRITY PRECHECKS (FAIL-CLOSED GUARDS)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_dup_primary_count INTEGER;
  v_team_mgr_cross_org_count INTEGER;
  v_team_mgr_bad_role_count INTEGER;
  v_active_team_bad_mgr_count INTEGER;
  v_team_lead_cross_org_count INTEGER;
  v_team_lead_bad_role_count INTEGER;
  v_active_team_bad_lead_count INTEGER;
  v_team_member_cross_org_count INTEGER;
  v_active_prof_inactive_mgr_count INTEGER;
  v_active_prof_inactive_team_count INTEGER;
  v_pri_member_bad_mgr_count INTEGER;
  v_pri_member_bad_role_count INTEGER;
  v_prof_mgr_cross_org_count INTEGER;
  v_prof_mgr_bad_role_count INTEGER;
  v_self_mgr_count INTEGER;
BEGIN
  -- A. Multiple primary memberships per profile
  SELECT pg_catalog.count(*)
  INTO v_dup_primary_count
  FROM (
    SELECT profile_id
    FROM public.team_members
    WHERE is_primary = TRUE
    GROUP BY profile_id
    HAVING pg_catalog.count(*) > 1
  ) dups;

  IF v_dup_primary_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (A): % profile(s) have multiple primary teams. Manual resolution required before applying unique index.',
      v_dup_primary_count;
  END IF;

  -- B. team.manager_id belongs to different organization
  SELECT pg_catalog.count(*)
  INTO v_team_mgr_cross_org_count
  FROM public.teams t
  JOIN public.profiles p ON t.manager_id = p.id
  WHERE t.manager_id IS NOT NULL
    AND t.organization_id IS DISTINCT FROM p.organization_id;

  IF v_team_mgr_cross_org_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (B): % team(s) have a manager from a different organization.',
      v_team_mgr_cross_org_count;
  END IF;

  -- C. team.manager_id has invalid or unresolved role (Allowed: manager, admin, super_admin)
  SELECT pg_catalog.count(*)
  INTO v_team_mgr_bad_role_count
  FROM public.teams t
  JOIN public.profiles p ON t.manager_id = p.id
  LEFT JOIN public.roles r ON p.role_id = r.id
  WHERE t.manager_id IS NOT NULL
    AND (r.code IS NULL OR r.code NOT IN ('manager', 'admin', 'super_admin'));

  IF v_team_mgr_bad_role_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (C): % team(s) have a manager whose role is not manager, admin, or super_admin.',
      v_team_mgr_bad_role_count;
  END IF;

  -- D. ACTIVE team has inactive/suspended manager
  SELECT pg_catalog.count(*)
  INTO v_active_team_bad_mgr_count
  FROM public.teams t
  JOIN public.profiles p ON t.manager_id = p.id
  WHERE t.status = 'active'
    AND t.manager_id IS NOT NULL
    AND p.status != 'active';

  IF v_active_team_bad_mgr_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (D): % active team(s) have an inactive or suspended manager.',
      v_active_team_bad_mgr_count;
  END IF;

  -- E. team.team_lead_id belongs to different organization
  SELECT pg_catalog.count(*)
  INTO v_team_lead_cross_org_count
  FROM public.teams t
  JOIN public.profiles p ON t.team_lead_id = p.id
  WHERE t.team_lead_id IS NOT NULL
    AND t.organization_id IS DISTINCT FROM p.organization_id;

  IF v_team_lead_cross_org_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (E): % team(s) have a team lead from a different organization.',
      v_team_lead_cross_org_count;
  END IF;

  -- F. team.team_lead_id has invalid or unresolved role (Allowed: team_lead, manager)
  SELECT pg_catalog.count(*)
  INTO v_team_lead_bad_role_count
  FROM public.teams t
  JOIN public.profiles p ON t.team_lead_id = p.id
  LEFT JOIN public.roles r ON p.role_id = r.id
  WHERE t.team_lead_id IS NOT NULL
    AND (r.code IS NULL OR r.code NOT IN ('team_lead', 'manager'));

  IF v_team_lead_bad_role_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (F): % team(s) have a team lead whose role is not team_lead or manager.',
      v_team_lead_bad_role_count;
  END IF;

  -- G. ACTIVE team has inactive/suspended team lead
  SELECT pg_catalog.count(*)
  INTO v_active_team_bad_lead_count
  FROM public.teams t
  JOIN public.profiles p ON t.team_lead_id = p.id
  WHERE t.status = 'active'
    AND t.team_lead_id IS NOT NULL
    AND p.status != 'active';

  IF v_active_team_bad_lead_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (G): % active team(s) have an inactive or suspended team lead.',
      v_active_team_bad_lead_count;
  END IF;

  -- H. team_members cross-organization relationship
  SELECT pg_catalog.count(*)
  INTO v_team_member_cross_org_count
  FROM public.team_members tm
  JOIN public.teams t ON tm.team_id = t.id
  JOIN public.profiles p ON tm.profile_id = p.id
  WHERE t.organization_id IS DISTINCT FROM p.organization_id;

  IF v_team_member_cross_org_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (H): % team membership(s) cross organization boundaries.',
      v_team_member_cross_org_count;
  END IF;

  -- NOTE ON INACTIVE PROFILES WITH PRIMARY MEMBERSHIPS:
  -- Inactive/suspended profiles retaining an existing primary membership is an allowed temporary
  -- state for administrative cleanup (manage_user_profile allows deactivation without cascading deletes,
  -- and manage_team_membership allows removal/cleanup). Therefore, this state is not a hard migration blocker.

  -- I. Active profile with inactive or suspended direct manager
  SELECT pg_catalog.count(*)
  INTO v_active_prof_inactive_mgr_count
  FROM public.profiles sub
  JOIN public.profiles mgr ON sub.manager_id = mgr.id
  WHERE sub.status = 'active'
    AND sub.manager_id IS NOT NULL
    AND mgr.status != 'active';

  IF v_active_prof_inactive_mgr_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (I): % active profile(s) have an inactive or suspended direct manager.',
      v_active_prof_inactive_mgr_count;
  END IF;

  -- J. Active profile whose primary team is inactive or archived
  SELECT pg_catalog.count(*)
  INTO v_active_prof_inactive_team_count
  FROM public.team_members tm
  JOIN public.profiles p ON tm.profile_id = p.id
  JOIN public.teams t ON tm.team_id = t.id
  WHERE p.status = 'active'
    AND tm.is_primary = TRUE
    AND t.status != 'active';

  IF v_active_prof_inactive_team_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (J): % active profile(s) have an inactive or archived primary team.',
      v_active_prof_inactive_team_count;
  END IF;

  -- K. Active profile whose active primary team has inconsistent direct manager
  -- If profile.manager_id IS NOT NULL, it must equal primary_team.manager_id OR primary_team.team_lead_id
  SELECT pg_catalog.count(*)
  INTO v_pri_member_bad_mgr_count
  FROM public.team_members tm
  JOIN public.profiles p ON tm.profile_id = p.id
  JOIN public.teams t ON tm.team_id = t.id
  WHERE p.status = 'active'
    AND tm.is_primary = TRUE
    AND t.status = 'active'
    AND p.manager_id IS NOT NULL
    AND (p.manager_id IS DISTINCT FROM t.manager_id)
    AND (p.manager_id IS DISTINCT FROM t.team_lead_id);

  IF v_pri_member_bad_mgr_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (K): % active profile(s) with an active primary team have a direct manager that is neither the team manager nor team lead.',
      v_pri_member_bad_mgr_count;
  END IF;

  -- L. Active profile holding primary membership must have an assigned canonical system role
  SELECT pg_catalog.count(*)
  INTO v_pri_member_bad_role_count
  FROM public.team_members tm
  JOIN public.profiles p ON tm.profile_id = p.id
  LEFT JOIN public.roles r ON p.role_id = r.id
  WHERE p.status = 'active'
    AND tm.is_primary = TRUE
    AND (r.code IS NULL OR r.code NOT IN ('super_admin', 'admin', 'manager', 'team_lead', 'employee'));

  IF v_pri_member_bad_role_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (L): % active profile(s) holding primary membership have an unresolved or non-canonical role.',
      v_pri_member_bad_role_count;
  END IF;

  -- M. profiles.manager_id cross-organization relationship
  SELECT pg_catalog.count(*)
  INTO v_prof_mgr_cross_org_count
  FROM public.profiles sub
  JOIN public.profiles mgr ON sub.manager_id = mgr.id
  WHERE sub.manager_id IS NOT NULL
    AND sub.organization_id IS DISTINCT FROM mgr.organization_id;

  IF v_prof_mgr_cross_org_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (M): % profile(s) have a direct manager in a different organization.',
      v_prof_mgr_cross_org_count;
  END IF;

  -- N. active profile manager relationship where manager role is invalid or not strictly higher hierarchy
  SELECT pg_catalog.count(*)
  INTO v_prof_mgr_bad_role_count
  FROM public.profiles sub
  JOIN public.profiles mgr ON sub.manager_id = mgr.id
  LEFT JOIN public.roles sub_r ON sub.role_id = sub_r.id
  LEFT JOIN public.roles mgr_r ON mgr.role_id = mgr_r.id
  WHERE sub.status = 'active'
    AND sub.manager_id IS NOT NULL
    AND (
      mgr_r.hierarchy_level IS NULL
      OR sub_r.hierarchy_level IS NULL
      OR mgr_r.hierarchy_level <= sub_r.hierarchy_level
    );

  IF v_prof_mgr_bad_role_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (N): % active profile(s) have a manager whose hierarchy level is not strictly higher.',
      v_prof_mgr_bad_role_count;
  END IF;

  -- O. Obvious self-manager relationship: profiles.id = profiles.manager_id
  SELECT pg_catalog.count(*)
  INTO v_self_mgr_count
  FROM public.profiles
  WHERE manager_id IS NOT NULL
    AND id = manager_id;

  IF v_self_mgr_count > 0 THEN
    RAISE EXCEPTION 'Legacy Data Violation (O): % profile(s) list themselves as their own direct manager.',
      v_self_mgr_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. PARTIAL UNIQUE INDEX FOR PRIMARY TEAM MEMBERSHIP
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_members_one_primary_per_profile
  ON public.team_members (profile_id)
  WHERE is_primary = TRUE;

-- ----------------------------------------------------------------------------
-- 3. NEW PRIVATE READ & SECURITY HELPERS
-- ----------------------------------------------------------------------------

-- A. Dynamic RBAC Capability Check
CREATE OR REPLACE FUNCTION private.has_permission(permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pg_catalog.coalesce(
    (
      SELECT rp.enabled
      FROM public.profiles p
      JOIN public.role_permissions rp ON rp.role_id = p.role_id
      JOIN public.permissions perm ON perm.id = rp.permission_id
      WHERE p.id = (SELECT auth.uid())
        AND p.status = 'active'
        AND p.organization_id = (SELECT private.current_organization_id())
        AND (SELECT private.current_organization_id()) IS NOT NULL
        AND perm.code = permission_code
      LIMIT 1
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION private.has_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_permission(TEXT) TO authenticated;

-- B. Organization Admin Check (Super Admin Level 100 or Admin Level 80)
CREATE OR REPLACE FUNCTION private.is_org_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    (SELECT private.current_organization_id()) IS NOT NULL
    AND (SELECT private.current_role_level()) >= 80
  );
$$;

REVOKE ALL ON FUNCTION private.is_org_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_org_admin() TO authenticated;

-- C. Canonical Subordinate Profile Resolution (Hierarchy Scope Ceiling)
CREATE OR REPLACE FUNCTION private.get_subordinate_profile_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_org_id UUID;
  v_role_level INTEGER;
BEGIN
  v_actor_id := (SELECT private.current_profile_id());
  v_org_id := (SELECT private.current_organization_id());
  v_role_level := (SELECT private.current_role_level());

  -- Inactive, unassigned, or unauthenticated actors have empty scope
  IF v_actor_id IS NULL OR v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- 1. Super Admin (100) & Admin (80): Entire Organization Scope
  IF v_role_level >= 80 THEN
    RETURN QUERY
    SELECT p.id
    FROM public.profiles p
    WHERE p.organization_id = v_org_id
      AND p.status = 'active';
    RETURN;
  END IF;

  -- Always return self
  RETURN NEXT v_actor_id;

  -- 2. Manager (60): Managed Teams Subordinates (Primary Membership Only) + Direct Reports (Fail-Closed)
  IF v_role_level = 60 THEN
    RETURN QUERY
    SELECT DISTINCT p.id
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.organization_id = v_org_id
      AND p.status = 'active'
      AND p.id != v_actor_id
      AND r.hierarchy_level < 60 -- Target must be lower hierarchy (Team Lead or Employee)
      AND (
        -- Subordinates whose PRIMARY active team is explicitly managed by actor,
        -- AND whose direct manager_id is consistent (NULL, the current manager, or the Team Lead of that same primary team)
        EXISTS (
          SELECT 1
          FROM public.team_members tm
          JOIN public.teams t ON tm.team_id = t.id
          WHERE tm.profile_id = p.id
            AND tm.is_primary = TRUE
            AND t.organization_id = v_org_id
            AND t.status = 'active'
            AND t.manager_id = v_actor_id
            AND (
              p.manager_id IS NULL
              OR p.manager_id = v_actor_id
              OR (t.team_lead_id IS NOT NULL AND p.manager_id = t.team_lead_id)
            )
        )
        OR
        -- Direct reports, provided their PRIMARY active team is not managed by another manager (fail-closed)
        (
          p.manager_id = v_actor_id
          AND NOT EXISTS (
            SELECT 1
            FROM public.team_members tm_pri
            JOIN public.teams t_other ON tm_pri.team_id = t_other.id
            WHERE tm_pri.profile_id = p.id
              AND tm_pri.is_primary = TRUE
              AND t_other.organization_id = v_org_id
              AND t_other.status = 'active'
              AND t_other.manager_id IS NOT NULL
              AND t_other.manager_id != v_actor_id
          )
        )
      );
    RETURN;
  END IF;

  -- 3. Team Lead (40): Direct Employees whose PRIMARY active team is explicitly led by actor,
  -- and whose direct manager_id is consistent (NULL, the current Team Lead, or the Manager of that same primary team)
  IF v_role_level = 40 THEN
    RETURN QUERY
    SELECT DISTINCT p.id
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    JOIN public.team_members tm ON tm.profile_id = p.id
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.is_primary = TRUE
      AND p.organization_id = v_org_id
      AND p.status = 'active'
      AND p.id != v_actor_id
      AND r.hierarchy_level <= 20 -- Strictly Employees (level <= 20)
      AND t.organization_id = v_org_id
      AND t.status = 'active'
      AND t.team_lead_id = v_actor_id
      AND (
        p.manager_id IS NULL
        OR p.manager_id = v_actor_id
        OR (t.manager_id IS NOT NULL AND p.manager_id = t.manager_id)
      );
    RETURN;
  END IF;

  -- 4. Employee (20) & others: Self only (already returned above)
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION private.get_subordinate_profile_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_subordinate_profile_ids() TO authenticated;

-- D. Target Profile Scope Checker
CREATE OR REPLACE FUNCTION private.is_profile_in_current_scope(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_org_id UUID;
  v_role_level INTEGER;
BEGIN
  IF target_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_actor_id := (SELECT private.current_profile_id());
  v_org_id := (SELECT private.current_organization_id());

  -- Both active actor and active organization must be established first
  IF v_actor_id IS NULL OR v_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Self is in scope only when organization context is confirmed
  IF target_profile_id = v_actor_id THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = target_profile_id
        AND p.organization_id = v_org_id
    );
  END IF;

  v_role_level := (SELECT private.current_role_level());

  -- Organization Admins (Super Admin 100, Admin 80) can see all profiles in same org (including inactive for admin)
  IF v_role_level >= 80 THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = target_profile_id
        AND p.organization_id = v_org_id
    );
  END IF;

  -- Managers and Team Leads check their canonical subordinate set
  RETURN EXISTS (
    SELECT 1
    FROM private.get_subordinate_profile_ids() sub_id
    WHERE sub_id = target_profile_id
  );
END;
$$;

REVOKE ALL ON FUNCTION private.is_profile_in_current_scope(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_profile_in_current_scope(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. EXPANDED SELECT RLS POLICIES
-- ----------------------------------------------------------------------------

-- A. PROFILES SELECT POLICY
DROP POLICY IF EXISTS profiles_select_self_or_super_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select_scoped ON public.profiles;

CREATE POLICY profiles_select_scoped
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    private.is_profile_in_current_scope(id)
  );

-- B. TEAMS SELECT POLICY
DROP POLICY IF EXISTS teams_select_scoped ON public.teams;

CREATE POLICY teams_select_scoped
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT private.current_organization_id())
    AND (
      (SELECT private.is_org_admin())
      OR manager_id = (SELECT private.current_profile_id())
      OR team_lead_id = (SELECT private.current_profile_id())
      OR private.is_current_user_team_member(id)
    )
  );

-- C. TEAM MEMBERS SELECT POLICY
DROP POLICY IF EXISTS team_members_select_scoped ON public.team_members;

CREATE POLICY team_members_select_scoped
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    private.team_belongs_to_current_org(team_id)
    AND (
      (SELECT private.is_org_admin())
      OR profile_id = (SELECT private.current_profile_id())
      OR EXISTS (
        SELECT 1
        FROM public.teams t
        WHERE t.id = team_id
          AND t.organization_id = (SELECT private.current_organization_id())
          AND (
            t.manager_id = (SELECT private.current_profile_id())
            OR t.team_lead_id = (SELECT private.current_profile_id())
          )
      )
    )
  );

-- ============================================================================
-- 5. SUPER ADMIN & ROLE-PERMISSION HARD SAFEGUARD TRIGGERS
-- ============================================================================

-- A. Role-Permission Immutability Trigger for Core Super Admin Capabilities
-- Prevents disabling, deleting, or altering role/permission IDs on 'users.manage_super_admin' and 'roles.manage' for super_admin
CREATE OR REPLACE FUNCTION private.trg_protect_super_admin_role_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_role_code TEXT;
  v_old_perm_code TEXT;
  v_new_role_code TEXT;
  v_new_perm_code TEXT;
BEGIN
  -- Determine OLD mapping role and permission code
  SELECT r.code INTO v_old_role_code
  FROM public.roles r
  WHERE r.id = OLD.role_id;

  SELECT p.code INTO v_old_perm_code
  FROM public.permissions p
  WHERE p.id = OLD.permission_id;

  -- Protect the exact canonical locked Super Admin permissions
  IF v_old_role_code = 'super_admin' AND v_old_perm_code IN ('users.manage_super_admin', 'roles.manage') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Access Denied: Fundamental Super Admin permissions cannot be deleted.';
    ELSIF TG_OP = 'UPDATE' THEN
      -- Must not disable
      IF NEW.enabled = FALSE THEN
        RAISE EXCEPTION 'Access Denied: Fundamental Super Admin permissions cannot be disabled.';
      END IF;
      -- Must not change role_id or permission_id to bypass the protection
      IF NEW.role_id IS DISTINCT FROM OLD.role_id OR NEW.permission_id IS DISTINCT FROM OLD.permission_id THEN
        RAISE EXCEPTION 'Access Denied: Fundamental Super Admin role-permission mappings cannot be modified or remapped.';
      END IF;
    END IF;
  END IF;

  RETURN (CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
END;
$$;

REVOKE ALL ON FUNCTION private.trg_protect_super_admin_role_permissions() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_protect_super_admin_role_permissions ON public.role_permissions;
CREATE TRIGGER trg_protect_super_admin_role_permissions
  BEFORE UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION private.trg_protect_super_admin_role_permissions();

-- B. Super Admin Profile Safeguard Trigger
-- Prevents non-Super-Admin actors from modifying, deleting, or creating Super Admin profiles,
-- or promoting accounts to the super_admin role.
CREATE OR REPLACE FUNCTION private.trg_protect_super_admin_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role_code TEXT;
  v_super_admin_role_id UUID;
BEGIN
  v_caller_role_code := (SELECT private.current_role_code());

  SELECT id INTO v_super_admin_role_id
  FROM public.roles
  WHERE code = 'super_admin';

  -- Target is being inserted with super_admin role: caller must be Super Admin
  IF TG_OP = 'INSERT' AND NEW.role_id = v_super_admin_role_id THEN
    IF v_caller_role_code IS DISTINCT FROM 'super_admin' THEN
      RAISE EXCEPTION 'Access Denied: Only Super Admins can create Super Admin profiles.';
    END IF;
  END IF;

  -- Target is an existing Super Admin: non-Super-Admin caller is strictly blocked from UPDATE or DELETE
  IF (TG_OP IN ('UPDATE', 'DELETE') AND OLD.role_id = v_super_admin_role_id) THEN
    IF v_caller_role_code IS DISTINCT FROM 'super_admin' THEN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Access Denied: Only Super Admins can delete Super Admin profiles.';
      ELSIF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Access Denied: Only Super Admins can modify Super Admin profiles.';
      END IF;
    END IF;
  END IF;

  -- Attempting to assign super_admin role to a target via UPDATE
  IF TG_OP = 'UPDATE' AND NEW.role_id = v_super_admin_role_id AND (OLD.role_id IS NULL OR OLD.role_id != v_super_admin_role_id) THEN
    IF v_caller_role_code IS DISTINCT FROM 'super_admin' THEN
      RAISE EXCEPTION 'Access Denied: Only Super Admins can promote users to Super Admin.';
    END IF;
  END IF;

  RETURN (CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
END;
$$;

REVOKE ALL ON FUNCTION private.trg_protect_super_admin_profiles() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_protect_super_admin_profiles ON public.profiles;
CREATE TRIGGER trg_protect_super_admin_profiles
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.trg_protect_super_admin_profiles();

-- ----------------------------------------------------------------------------
-- 6. PUBLIC CLIENT-CALLABLE PROFILE MUTATION RPCS
-- ----------------------------------------------------------------------------

-- A. Update Own Profile (Harmless Safe Fields Only)
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL,
  p_change_full_name BOOLEAN DEFAULT FALSE,
  p_change_phone BOOLEAN DEFAULT FALSE,
  p_change_avatar_url BOOLEAN DEFAULT FALSE,
  p_change_job_title BOOLEAN DEFAULT FALSE
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_org_id UUID;
  v_updated_profile public.profiles;
BEGIN
  v_actor_id := (SELECT private.current_profile_id());
  v_org_id := (SELECT private.current_organization_id());

  IF v_actor_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Active organization profile not found.';
  END IF;

  UPDATE public.profiles
  SET
    full_name = (CASE WHEN p_change_full_name THEN p_full_name ELSE full_name END),
    phone = (CASE WHEN p_change_phone THEN p_phone ELSE phone END),
    avatar_url = (CASE WHEN p_change_avatar_url THEN p_avatar_url ELSE avatar_url END),
    job_title = (CASE WHEN p_change_job_title THEN p_job_title ELSE job_title END),
    updated_at = pg_catalog.now()
  WHERE id = v_actor_id
    AND organization_id = v_org_id
  RETURNING * INTO v_updated_profile;

  IF v_updated_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found or access denied.';
  END IF;

  RETURN v_updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_profile(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_profile(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- B. Manage User Profile (Privileged Administrative & Scoped Hierarchy Management)
CREATE OR REPLACE FUNCTION public.manage_user_profile(
  p_target_profile_id UUID,
  p_role_id UUID DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_change_role BOOLEAN DEFAULT FALSE,
  p_change_manager BOOLEAN DEFAULT FALSE,
  p_change_status BOOLEAN DEFAULT FALSE
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_org_id UUID;
  v_caller_role_code TEXT;
  v_caller_role_level INTEGER;
  v_target_profile public.profiles;
  v_target_role_code TEXT;
  v_target_role_level INTEGER;
  v_new_role_code TEXT;
  v_new_role_level INTEGER;
  v_manager_profile public.profiles;
  v_manager_role_level INTEGER;
  v_updated_profile public.profiles;
  v_has_users_manage BOOLEAN;
  v_is_super_admin BOOLEAN;
  v_curr_cycle_id UUID;
  v_depth INTEGER;
BEGIN
  -- 1. Actor & Organization Authentication
  v_actor_id := (SELECT private.current_profile_id());
  v_org_id := (SELECT private.current_organization_id());
  v_caller_role_code := (SELECT private.current_role_code());
  v_caller_role_level := (SELECT private.current_role_level());
  v_is_super_admin := (SELECT private.is_super_admin());

  IF v_actor_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Active organization profile not found.';
  END IF;

  -- 2. Verify users.manage capability
  v_has_users_manage := (SELECT private.has_permission('users.manage'));
  IF NOT v_has_users_manage THEN
    RAISE EXCEPTION 'Access Denied: users.manage capability required.';
  END IF;

  -- 3. Self-management restriction: Caller cannot manage own role, status, or manager line through management RPC
  IF p_target_profile_id = v_actor_id THEN
    RAISE EXCEPTION 'Invalid Operation: Cannot manage your own administrative fields. Use update_own_profile for profile details.';
  END IF;

  -- 4. Load & Verify Target Profile in same organization
  SELECT * INTO v_target_profile
  FROM public.profiles
  WHERE id = p_target_profile_id
    AND organization_id = v_org_id;

  IF v_target_profile.id IS NULL THEN
    RAISE EXCEPTION 'Target user not found or does not belong to your organization.';
  END IF;

  -- 5. Resolve Target Current Role
  SELECT code, hierarchy_level INTO v_target_role_code, v_target_role_level
  FROM public.roles
  WHERE id = v_target_profile.role_id;

  -- Fail closed if target has no valid role assigned and no valid role change is provided
  IF (v_target_profile.role_id IS NULL OR v_target_role_level IS NULL) AND NOT p_change_role THEN
    RAISE EXCEPTION 'Invalid Target: Target user has no valid assigned role.';
  END IF;

  -- 6. Hard Scope Ceiling Verification
  IF v_is_super_admin THEN
    -- Super Admin can manage any same-org user
    NULL;
  ELSIF v_caller_role_level = 80 THEN -- Admin
    -- Admin cannot manage Super Admin
    IF v_target_role_code = 'super_admin' THEN
      RAISE EXCEPTION 'Access Denied: Admins cannot manage Super Admin accounts.';
    END IF;
  ELSIF v_caller_role_level = 60 THEN -- Manager
    -- Manager can only manage targets in canonical fail-closed subordinate scope
    IF NOT EXISTS (
      SELECT 1 FROM private.get_subordinate_profile_ids() sub_id WHERE sub_id = p_target_profile_id
    ) OR v_target_role_level >= 60 THEN
      RAISE EXCEPTION 'Access Denied: Target is outside your managerial hierarchy scope.';
    END IF;
  ELSIF v_caller_role_level = 40 THEN -- Team Lead
    -- Team Lead can only manage Employees in their led primary team
    IF NOT EXISTS (
      SELECT 1 FROM private.get_subordinate_profile_ids() sub_id WHERE sub_id = p_target_profile_id
    ) OR v_target_role_level > 20 THEN
      RAISE EXCEPTION 'Access Denied: Team Leads can only manage direct Employees in their led team.';
    END IF;
  ELSE
    -- Employee (20) or others cannot cross-manage users
    RAISE EXCEPTION 'Access Denied: Insufficient hierarchy level for user management.';
  END IF;

  -- 7. Calculate Effective Role & Validate Role Change (if requested)
  IF p_change_role THEN
    IF p_role_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Operation: Role cannot be null.';
    END IF;

    SELECT code, hierarchy_level INTO v_new_role_code, v_new_role_level
    FROM public.roles
    WHERE id = p_role_id;

    IF v_new_role_code IS NULL OR v_new_role_level IS NULL THEN
      RAISE EXCEPTION 'Invalid Role: Specified role does not exist.';
    END IF;

    -- Super Admin can assign any role including Super Admin
    IF v_is_super_admin THEN
      NULL;
    -- Admin can assign Admin, Manager, Team Lead, Employee (levels <= 80), but NEVER Super Admin (100)
    ELSIF v_caller_role_level = 80 THEN
      IF v_new_role_code = 'super_admin' OR v_new_role_level > 80 THEN
        RAISE EXCEPTION 'Access Denied: Only Super Admins can assign the Super Admin role.';
      END IF;
    -- Manager (60) can only assign lower roles (Team Lead 40, Employee 20)
    ELSIF v_caller_role_level = 60 THEN
      IF v_new_role_level >= 60 THEN
        RAISE EXCEPTION 'Access Denied: Managers can only assign roles below Manager level.';
      END IF;
    -- Team Lead (40) can only assign/retain Employee tier (level <= 20)
    ELSIF v_caller_role_level = 40 THEN
      IF v_new_role_level > 20 THEN
        RAISE EXCEPTION 'Access Denied: Team Leads cannot promote users beyond Employee tier.';
      END IF;
    ELSE
      RAISE EXCEPTION 'Access Denied: Insufficient hierarchy level to assign roles.';
    END IF;

    -- Validate that resulting role preserves existing teams.manager_id assignments
    -- (Approved roles for teams.manager_id are: manager, admin, super_admin)
    IF EXISTS (
      SELECT 1 FROM public.teams
      WHERE manager_id = p_target_profile_id
    ) AND v_new_role_code NOT IN ('manager', 'admin', 'super_admin') THEN
      RAISE EXCEPTION 'Invalid Operation: Cannot change role because user is currently assigned as manager of one or more teams. Reassign team managers first.';
    END IF;

    -- Validate that resulting role preserves existing teams.team_lead_id assignments
    -- (Approved roles for teams.team_lead_id are: team_lead, manager)
    IF EXISTS (
      SELECT 1 FROM public.teams
      WHERE team_lead_id = p_target_profile_id
    ) AND v_new_role_code NOT IN ('team_lead', 'manager') THEN
      RAISE EXCEPTION 'Invalid Operation: Cannot change role because user is currently assigned as team lead of one or more teams. Reassign team leads first.';
    END IF;

    -- Validate that resulting role remains strictly higher in hierarchy than every active direct report
    DECLARE
      v_rep_rec RECORD;
      v_rep_role_level INTEGER;
    BEGIN
      -- Fail closed if any cross-organization profile points manager_id to target
      IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE manager_id = p_target_profile_id
          AND organization_id IS DISTINCT FROM v_org_id
      ) THEN
        RAISE EXCEPTION 'Invalid Hierarchy: Cross-organization direct reporting relationship detected for target user.';
      END IF;

      FOR v_rep_rec IN
        SELECT id, role_id
        FROM public.profiles
        WHERE organization_id = v_org_id
          AND status = 'active'
          AND manager_id = p_target_profile_id
      LOOP
        IF v_rep_rec.role_id IS NULL THEN
          RAISE EXCEPTION 'Invalid Hierarchy: Active direct report has no valid assigned role.';
        END IF;

        SELECT hierarchy_level INTO v_rep_role_level
        FROM public.roles
        WHERE id = v_rep_rec.role_id;

        IF v_rep_role_level IS NULL THEN
          RAISE EXCEPTION 'Invalid Hierarchy: Active direct report has no valid assigned role.';
        END IF;

        IF v_new_role_level <= v_rep_role_level THEN
          RAISE EXCEPTION 'Invalid Operation: Cannot change role because user has active direct reports with equal or higher hierarchy level. Reassign direct reports first.';
        END IF;
      END LOOP;
    END;
  ELSE
    v_new_role_code := v_target_role_code;
    v_new_role_level := v_target_role_level;
  END IF;

  -- Ensure effective target role has valid hierarchy level before manager/hierarchy checks
  IF v_new_role_level IS NULL THEN
    RAISE EXCEPTION 'Invalid Target: Effective target role has no valid hierarchy level.';
  END IF;

  -- 8. Validate Effective Manager Assignment & Primary Team Hierarchy Consistency
  -- Determine effective manager: newly requested manager if p_change_manager is TRUE, otherwise target's existing manager
  DECLARE
    v_effective_manager_id UUID;
    v_pri_team_id UUID;
    v_pri_team_org_id UUID;
    v_pri_team_status TEXT;
    v_pri_team_lead_id UUID;
    v_pri_team_manager_id UUID;
  BEGIN
    v_effective_manager_id := (CASE WHEN p_change_manager THEN p_manager_id ELSE v_target_profile.manager_id END);

    -- Validate Primary Team consistency if the target has an active primary team
    SELECT
      t.id, t.organization_id, t.status, t.team_lead_id, t.manager_id
    INTO
      v_pri_team_id, v_pri_team_org_id, v_pri_team_status, v_pri_team_lead_id, v_pri_team_manager_id
    FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.profile_id = p_target_profile_id
      AND tm.is_primary = TRUE;

    IF v_pri_team_id IS NOT NULL THEN
      -- Primary team must belong to the same organization
      IF v_pri_team_org_id IS DISTINCT FROM v_org_id THEN
        RAISE EXCEPTION 'Invalid Hierarchy: Primary team belongs to a different organization.';
      END IF;

      -- If primary team is active and direct manager is set, it must be the primary team's team lead or manager
      IF v_pri_team_status = 'active' AND v_effective_manager_id IS NOT NULL THEN
        IF (v_pri_team_lead_id IS DISTINCT FROM v_effective_manager_id)
           AND (v_pri_team_manager_id IS DISTINCT FROM v_effective_manager_id) THEN
          RAISE EXCEPTION 'Invalid Hierarchy: Direct manager must be the team lead or manager of user''s primary active team.';
        END IF;
      END IF;
    END IF;

    IF v_effective_manager_id IS NOT NULL THEN
      -- Cannot be self
      IF v_effective_manager_id = p_target_profile_id THEN
        RAISE EXCEPTION 'Invalid Operation: User cannot be their own manager.';
      END IF;

      -- Load manager profile
      SELECT * INTO v_manager_profile
      FROM public.profiles
      WHERE id = v_effective_manager_id;

      IF v_manager_profile.id IS NULL OR v_manager_profile.status != 'active' OR v_manager_profile.organization_id != v_org_id THEN
        RAISE EXCEPTION 'Invalid Manager: Designated manager not found, inactive, or belongs to another organization.';
      END IF;

      -- Resolve manager role level
      IF v_manager_profile.role_id IS NULL THEN
        RAISE EXCEPTION 'Invalid Manager: Designated manager has no valid assigned role.';
      END IF;

      SELECT hierarchy_level INTO v_manager_role_level
      FROM public.roles
      WHERE id = v_manager_profile.role_id;

      IF v_manager_role_level IS NULL THEN
        RAISE EXCEPTION 'Invalid Manager: Designated manager has no valid assigned role.';
      END IF;

      -- Designated manager must have strictly greater hierarchy level than target's effective role
      IF v_manager_role_level <= v_new_role_level THEN
        RAISE EXCEPTION 'Invalid Manager: Designated manager must have a strictly higher hierarchy level than the user.';
      END IF;

      -- Validate caller's managerial authority over designated new manager if caller is lower tier (Manager or Team Lead)
      IF p_change_manager THEN
        IF v_caller_role_level = 60 THEN -- Manager
          IF p_manager_id != v_actor_id AND NOT (
            v_manager_role_level = 40 AND EXISTS (
              SELECT 1 FROM private.get_subordinate_profile_ids() sub_id WHERE sub_id = p_manager_id
            )
          ) THEN
            RAISE EXCEPTION 'Access Denied: Managers can only assign subordinates to report to themselves or to a Team Lead in their hierarchy.';
          END IF;
        ELSIF v_caller_role_level = 40 THEN -- Team Lead
          IF p_manager_id != v_actor_id AND NOT (
            v_pri_team_id IS NOT NULL
            AND v_pri_team_status = 'active'
            AND v_pri_team_lead_id = v_actor_id
            AND v_pri_team_manager_id IS NOT NULL
            AND p_manager_id = v_pri_team_manager_id
          ) THEN
            RAISE EXCEPTION 'Access Denied: Team Leads can only assign direct reports to report to themselves or to their primary team manager.';
          END IF;
        END IF;
      END IF;

      -- Cycle Detection: Walk up the manager tree (up to 20 levels) ensuring target profile is not an ancestor,
      -- that no ancestor belongs to another org, and failing closed if depth limit is reached.
      v_curr_cycle_id := v_manager_profile.manager_id;
      v_depth := 0;
      WHILE v_curr_cycle_id IS NOT NULL LOOP
        IF v_depth >= 20 THEN
          RAISE EXCEPTION 'Invalid Hierarchy: Manager chain exceeds safe validation depth.';
        END IF;

        IF v_curr_cycle_id = p_target_profile_id THEN
          RAISE EXCEPTION 'Invalid Hierarchy: Circular manager reporting cycle detected.';
        END IF;

        DECLARE
          v_anc_org_id UUID;
          v_anc_next_mgr UUID;
        BEGIN
          SELECT organization_id, manager_id INTO v_anc_org_id, v_anc_next_mgr
          FROM public.profiles
          WHERE id = v_curr_cycle_id;

          IF v_anc_org_id IS DISTINCT FROM v_org_id THEN
            RAISE EXCEPTION 'Invalid Hierarchy: Reporting ancestry references a profile outside the organization.';
          END IF;

          v_curr_cycle_id := v_anc_next_mgr;
        END;

        v_depth := v_depth + 1;
      END LOOP;
    END IF;
  END;

  -- 9. Validate Status (if requested)
  IF p_change_status THEN
    IF p_status IS NULL OR p_status NOT IN ('active', 'inactive', 'suspended') THEN
      RAISE EXCEPTION 'Invalid Status: Status must be non-null and one of active, inactive, or suspended.';
    END IF;

    -- Non-Super-Admin cannot deactivate a Super Admin
    IF v_target_role_code = 'super_admin' AND NOT v_is_super_admin THEN
      RAISE EXCEPTION 'Access Denied: Only Super Admins can alter status of Super Admin accounts.';
    END IF;

    -- If activating, ensure that if target profile currently has a primary team, that primary team is active and belongs to the same org
    IF p_status = 'active' THEN
      DECLARE
        v_act_pri_team_status TEXT;
        v_act_pri_team_org_id UUID;
      BEGIN
        SELECT t.status, t.organization_id
        INTO v_act_pri_team_status, v_act_pri_team_org_id
        FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.profile_id = p_target_profile_id
          AND tm.is_primary = TRUE;

        IF v_act_pri_team_status IS NOT NULL THEN
          IF v_act_pri_team_org_id IS DISTINCT FROM v_org_id THEN
            RAISE EXCEPTION 'Invalid Operation: Cannot activate a profile whose primary team belongs to another organization.';
          END IF;
          IF v_act_pri_team_status != 'active' THEN
            RAISE EXCEPTION 'Invalid Operation: Cannot activate a profile whose primary team is inactive or archived.';
          END IF;
        END IF;
      END;
    END IF;

    -- If deactivating or suspending, ensure user is not currently managing or leading active teams,
    -- and does not have active direct reports
    IF p_status IN ('inactive', 'suspended') THEN
      -- Fail closed if any cross-organization profile points manager_id to target
      IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE manager_id = p_target_profile_id
          AND organization_id IS DISTINCT FROM v_org_id
      ) THEN
        RAISE EXCEPTION 'Invalid Hierarchy: Cross-organization direct reporting relationship detected for target user.';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.teams
        WHERE organization_id = v_org_id
          AND status = 'active'
          AND (manager_id = p_target_profile_id OR team_lead_id = p_target_profile_id)
      ) THEN
        RAISE EXCEPTION 'Invalid Operation: Cannot deactivate or suspend a user who is currently managing or leading active teams. Reassign team leadership first.';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE organization_id = v_org_id
          AND status = 'active'
          AND manager_id = p_target_profile_id
      ) THEN
        RAISE EXCEPTION 'Invalid Operation: Cannot deactivate or suspend a user who currently has active direct reports. Reassign direct reports first.';
      END IF;
    END IF;
  END IF;

  -- 10. Execute Update
  UPDATE public.profiles
  SET
    role_id = (CASE WHEN p_change_role THEN p_role_id ELSE role_id END),
    manager_id = (CASE WHEN p_change_manager THEN p_manager_id ELSE manager_id END),
    status = (CASE WHEN p_change_status THEN p_status ELSE status END),
    updated_at = pg_catalog.now()
  WHERE id = p_target_profile_id
    AND organization_id = v_org_id
  RETURNING * INTO v_updated_profile;

  RETURN v_updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_user_profile(UUID, UUID, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_user_profile(UUID, UUID, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- ============================================================================
-- 7. STEP 7B.2B: TEAM & TEAM MEMBERSHIP SECURE MUTATION LAYER
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. TEAM DATA INTEGRITY TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.trg_validate_team_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_mgr_org_id UUID;
  v_mgr_status TEXT;
  v_mgr_role_code TEXT;
  v_lead_org_id UUID;
  v_lead_status TEXT;
  v_lead_role_code TEXT;
BEGIN
  -- Validate manager_id when non-null
  IF NEW.manager_id IS NOT NULL THEN
    SELECT p.organization_id, p.status, r.code
    INTO v_mgr_org_id, v_mgr_status, v_mgr_role_code
    FROM public.profiles p
    LEFT JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = NEW.manager_id;

    IF v_mgr_org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Team Manager: Designated manager does not exist.';
    END IF;

    IF v_mgr_org_id IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'Invalid Team Manager: Designated manager belongs to a different organization.';
    END IF;

    IF v_mgr_role_code IS NULL OR v_mgr_role_code NOT IN ('manager', 'admin', 'super_admin') THEN
      RAISE EXCEPTION 'Invalid Team Manager: Designated manager must have role of Manager, Admin, or Super Admin.';
    END IF;

    IF NEW.status = 'active' AND v_mgr_status != 'active' THEN
      RAISE EXCEPTION 'Invalid Team Manager: Designated manager must be active for an active team.';
    END IF;
  END IF;

  -- Validate team_lead_id when non-null
  IF NEW.team_lead_id IS NOT NULL THEN
    SELECT p.organization_id, p.status, r.code
    INTO v_lead_org_id, v_lead_status, v_lead_role_code
    FROM public.profiles p
    LEFT JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = NEW.team_lead_id;

    IF v_lead_org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Team Lead: Designated team lead does not exist.';
    END IF;

    IF v_lead_org_id IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'Invalid Team Lead: Designated team lead belongs to a different organization.';
    END IF;

    IF v_lead_role_code IS NULL OR v_lead_role_code NOT IN ('team_lead', 'manager') THEN
      RAISE EXCEPTION 'Invalid Team Lead: Designated team lead must have role of Team Lead or Manager.';
    END IF;

    IF NEW.status = 'active' AND v_lead_status != 'active' THEN
      RAISE EXCEPTION 'Invalid Team Lead: Designated team lead must be active for an active team.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.trg_validate_team_integrity() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_validate_team_integrity ON public.teams;
CREATE TRIGGER trg_validate_team_integrity
BEFORE INSERT OR UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION private.trg_validate_team_integrity();

-- ----------------------------------------------------------------------------
-- B. TEAM MEMBERSHIP DATA INTEGRITY TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.trg_validate_team_membership_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_team_org_id UUID;
  v_team_status TEXT;
  v_profile_org_id UUID;
  v_profile_status TEXT;
  v_profile_role_code TEXT;
BEGIN
  -- Validate team exists and load status
  SELECT organization_id, status
  INTO v_team_org_id, v_team_status
  FROM public.teams
  WHERE id = NEW.team_id;

  IF v_team_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid Membership: Team does not exist.';
  END IF;

  -- Validate profile exists
  SELECT p.organization_id, p.status, r.code
  INTO v_profile_org_id, v_profile_status, v_profile_role_code
  FROM public.profiles p
  LEFT JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = NEW.profile_id;

  IF v_profile_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid Membership: Profile does not exist.';
  END IF;

  -- Validate same organization
  IF v_team_org_id IS DISTINCT FROM v_profile_org_id THEN
    RAISE EXCEPTION 'Invalid Membership: Profile and team belong to different organizations.';
  END IF;

  -- Validate target profile has one of the 5 canonical system roles
  IF v_profile_role_code IS NULL OR v_profile_role_code NOT IN ('super_admin', 'admin', 'manager', 'team_lead', 'employee') THEN
    RAISE EXCEPTION 'Invalid Membership: Target profile must have an assigned canonical system role.';
  END IF;

  -- For INSERT: target team must be active
  IF TG_OP = 'INSERT' AND v_team_status != 'active' THEN
    RAISE EXCEPTION 'Invalid Membership: Cannot add members to an inactive or archived team.';
  END IF;

  -- For a NEW membership: target profile must be active
  IF TG_OP = 'INSERT' AND v_profile_status != 'active' THEN
    RAISE EXCEPTION 'Invalid Membership: Inactive profiles cannot be added to a team.';
  END IF;

  -- For changing membership from non-primary to is_primary = TRUE: target team and profile must be active
  IF NEW.is_primary = TRUE AND (TG_OP = 'INSERT' OR OLD.is_primary IS DISTINCT FROM TRUE) THEN
    IF v_team_status != 'active' THEN
      RAISE EXCEPTION 'Invalid Membership: Cannot set primary membership on an inactive or archived team.';
    END IF;
    IF v_profile_status != 'active' THEN
      RAISE EXCEPTION 'Invalid Membership: Inactive profiles cannot have a primary team.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.trg_validate_team_membership_integrity() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_validate_team_membership_integrity ON public.team_members;
CREATE TRIGGER trg_validate_team_membership_integrity
BEFORE INSERT OR UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION private.trg_validate_team_membership_integrity();

-- ----------------------------------------------------------------------------
-- C. PUBLIC RPC: manage_team
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manage_team(
  p_action TEXT,
  p_team_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL,
  p_team_lead_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_change_name BOOLEAN DEFAULT FALSE,
  p_change_description BOOLEAN DEFAULT FALSE,
  p_change_manager BOOLEAN DEFAULT FALSE,
  p_change_team_lead BOOLEAN DEFAULT FALSE,
  p_change_status BOOLEAN DEFAULT FALSE
)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_org_id UUID;
  v_caller_role_level INTEGER;
  v_caller_role_code TEXT;
  v_is_super_admin BOOLEAN;

  v_team public.teams%ROWTYPE;
  v_result public.teams%ROWTYPE;

  v_trimmed_name TEXT;
  v_new_name TEXT;
  v_new_desc TEXT;
  v_new_manager_id UUID;
  v_new_team_lead_id UUID;
  v_new_status TEXT;

  v_tl_code TEXT;
  v_tl_status TEXT;

  v_mem_rec RECORD;
  v_mem_role_level INTEGER;
BEGIN
  -- 1. Verify capability
  IF NOT private.has_permission('teams.manage') THEN
    RAISE EXCEPTION 'Access Denied: teams.manage capability required.';
  END IF;

  -- 2. Verify actor and organization
  v_actor_id := (SELECT private.current_profile_id());
  v_org_id := (SELECT private.current_organization_id());

  IF v_actor_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Active user and organization required.';
  END IF;

  v_caller_role_level := (SELECT private.current_role_level());
  v_caller_role_code := (SELECT private.current_role_code());
  v_is_super_admin := (SELECT private.is_super_admin());

  -- Employee tier cannot manage teams
  IF v_caller_role_level <= 20 OR v_caller_role_code = 'employee' THEN
    RAISE EXCEPTION 'Access Denied: Employees cannot manage teams.';
  END IF;

  -- 3. Action validation
  IF p_action NOT IN ('create', 'update', 'archive', 'delete') THEN
    RAISE EXCEPTION 'Invalid Action: Must be create, update, archive, or delete.';
  END IF;

  -- 4. For update, archive, delete: load existing team and verify same org
  IF p_action IN ('update', 'archive', 'delete') THEN
    IF p_team_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Team: Team ID is required.';
    END IF;

    SELECT * INTO v_team
    FROM public.teams
    WHERE id = p_team_id AND organization_id = v_org_id;

    IF v_team.id IS NULL THEN
      RAISE EXCEPTION 'Team not found or does not belong to your organization.';
    END IF;
  END IF;

  -- 5. Role authorization per action
  IF v_caller_role_level = 40 THEN -- Team Lead
    IF p_action = 'create' THEN
      RAISE EXCEPTION 'Access Denied: Team Leads cannot create teams.';
    ELSIF p_action IN ('archive', 'delete') THEN
      RAISE EXCEPTION 'Access Denied: Team Leads cannot archive or delete teams.';
    ELSIF p_action = 'update' THEN
      IF v_team.team_lead_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Access Denied: Team Leads can only update teams they explicitly lead.';
      END IF;
      IF p_change_manager OR p_change_team_lead OR p_change_status THEN
        RAISE EXCEPTION 'Access Denied: Team Leads can only update team name and description.';
      END IF;
    END IF;
  ELSIF v_caller_role_level = 60 THEN -- Manager
    IF p_action = 'create' THEN
      IF p_change_manager AND p_manager_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Access Denied: Managers can only create teams managed by themselves.';
      END IF;
    ELSIF p_action IN ('update', 'archive', 'delete') THEN
      IF v_team.manager_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Access Denied: Managers can only manage teams they explicitly manage.';
      END IF;
      IF p_action = 'update' AND p_change_manager AND p_manager_id IS DISTINCT FROM v_actor_id THEN
        RAISE EXCEPTION 'Access Denied: Managers cannot reassign team management away from themselves.';
      END IF;
    END IF;
  END IF;

  -- 6. Execute actions
  IF p_action = 'create' THEN
    v_trimmed_name := trim(p_name);
    IF v_trimmed_name IS NULL OR v_trimmed_name = '' THEN
      RAISE EXCEPTION 'Invalid Team Name: Name cannot be empty.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.teams
      WHERE organization_id = v_org_id AND lower(name) = lower(v_trimmed_name)
    ) THEN
      RAISE EXCEPTION 'Invalid Team Name: A team with this name already exists in your organization.';
    END IF;

    IF p_change_status AND p_status IS NOT NULL THEN
      IF p_status NOT IN ('active', 'inactive', 'archived') THEN
        RAISE EXCEPTION 'Invalid Status: Team status must be active, inactive, or archived.';
      END IF;
      v_new_status := p_status;
    ELSE
      v_new_status := 'active';
    END IF;

    IF v_caller_role_level = 60 THEN -- Manager
      v_new_manager_id := v_actor_id;
      v_new_team_lead_id := (CASE WHEN p_change_team_lead THEN p_team_lead_id ELSE NULL END);
      IF v_new_team_lead_id IS NOT NULL AND v_new_team_lead_id != v_actor_id THEN
        SELECT r.code, p.status INTO v_tl_code, v_tl_status
        FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = v_new_team_lead_id AND p.organization_id = v_org_id;

        IF v_tl_code != 'team_lead' OR v_tl_status != 'active' OR NOT EXISTS (
          SELECT 1 FROM private.get_subordinate_profile_ids() sub_id WHERE sub_id = v_new_team_lead_id
        ) THEN
          RAISE EXCEPTION 'Access Denied: Managers can only assign themselves or an active Team Lead within their hierarchy as team lead.';
        END IF;
      END IF;
    ELSE -- Super Admin / Admin
      v_new_manager_id := (CASE WHEN p_change_manager THEN p_manager_id ELSE NULL END);
      v_new_team_lead_id := (CASE WHEN p_change_team_lead THEN p_team_lead_id ELSE NULL END);
    END IF;

    v_new_desc := (CASE WHEN p_change_description THEN p_description ELSE NULL END);

    INSERT INTO public.teams (
      organization_id,
      name,
      description,
      manager_id,
      team_lead_id,
      status
    ) VALUES (
      v_org_id,
      v_trimmed_name,
      v_new_desc,
      v_new_manager_id,
      v_new_team_lead_id,
      v_new_status
    )
    RETURNING * INTO v_result;

    RETURN v_result;

  ELSIF p_action = 'update' THEN
    -- Resolve name
    IF p_change_name THEN
      v_trimmed_name := trim(p_name);
      IF v_trimmed_name IS NULL OR v_trimmed_name = '' THEN
        RAISE EXCEPTION 'Invalid Team Name: Name cannot be empty.';
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.teams
        WHERE organization_id = v_org_id
          AND id != v_team.id
          AND lower(name) = lower(v_trimmed_name)
      ) THEN
        RAISE EXCEPTION 'Invalid Team Name: A team with this name already exists in your organization.';
      END IF;
      v_new_name := v_trimmed_name;
    ELSE
      v_new_name := v_team.name;
    END IF;

    -- Resolve description
    v_new_desc := (CASE WHEN p_change_description THEN p_description ELSE v_team.description END);

    -- Resolve manager
    IF p_change_manager THEN
      v_new_manager_id := p_manager_id;
    ELSE
      v_new_manager_id := v_team.manager_id;
    END IF;

    -- Resolve team lead
    IF p_change_team_lead THEN
      v_new_team_lead_id := p_team_lead_id;
      IF v_caller_role_level = 60 AND v_new_team_lead_id IS NOT NULL AND v_new_team_lead_id != v_actor_id THEN
        SELECT r.code, p.status INTO v_tl_code, v_tl_status
        FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = v_new_team_lead_id AND p.organization_id = v_org_id;

        IF v_tl_code != 'team_lead' OR v_tl_status != 'active' OR NOT EXISTS (
          SELECT 1 FROM private.get_subordinate_profile_ids() sub_id WHERE sub_id = v_new_team_lead_id
        ) THEN
          RAISE EXCEPTION 'Access Denied: Managers can only assign themselves or an active Team Lead within their hierarchy as team lead.';
        END IF;
      END IF;
    ELSE
      v_new_team_lead_id := v_team.team_lead_id;
    END IF;

    -- Resolve status
    IF p_change_status THEN
      IF p_status IS NULL OR p_status NOT IN ('active', 'inactive', 'archived') THEN
        RAISE EXCEPTION 'Invalid Status: Team status must be active, inactive, or archived.';
      END IF;
      v_new_status := p_status;
    ELSE
      v_new_status := v_team.status;
    END IF;

    -- Leadership change safety checks (Sections 12 & 13)
    IF p_change_manager OR p_change_team_lead THEN
      FOR v_mem_rec IN
        SELECT tm.profile_id, p.organization_id, p.role_id, p.manager_id
        FROM public.team_members tm
        JOIN public.profiles p ON tm.profile_id = p.id
        WHERE tm.team_id = v_team.id
          AND tm.is_primary = TRUE
          AND p.status = 'active'
      LOOP
        IF v_mem_rec.organization_id IS DISTINCT FROM v_org_id THEN
          RAISE EXCEPTION 'Invalid Hierarchy: Cross-organization profile membership detected in primary team.';
        END IF;

        IF v_mem_rec.role_id IS NULL THEN
          RAISE EXCEPTION 'Invalid Hierarchy: Primary team member has no valid assigned role.';
        END IF;

        SELECT hierarchy_level INTO v_mem_role_level
        FROM public.roles
        WHERE id = v_mem_rec.role_id;

        IF v_mem_role_level IS NULL THEN
          RAISE EXCEPTION 'Invalid Hierarchy: Primary team member has no valid assigned role.';
        END IF;

        IF v_mem_rec.manager_id IS NOT NULL THEN
          IF (v_new_manager_id IS NULL OR v_mem_rec.manager_id != v_new_manager_id)
             AND (v_new_team_lead_id IS NULL OR v_mem_rec.manager_id != v_new_team_lead_id) THEN
            RAISE EXCEPTION 'Invalid Operation: Changing team leadership would conflict with active primary member reporting lines. Reassign or clear affected member manager_ids first.';
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- Status change safety (Section 14)
    IF v_team.status = 'active' AND v_new_status IN ('inactive', 'archived') THEN
      IF EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.profiles p ON tm.profile_id = p.id
        WHERE tm.team_id = v_team.id
          AND tm.is_primary = TRUE
          AND p.status = 'active'
          AND p.organization_id = v_org_id
      ) THEN
        RAISE EXCEPTION 'Invalid Operation: Cannot inactivate or archive a team with active primary members. Reassign or remove primary memberships first.';
      END IF;
    END IF;

    UPDATE public.teams
    SET
      name = v_new_name,
      description = v_new_desc,
      manager_id = v_new_manager_id,
      team_lead_id = v_new_team_lead_id,
      status = v_new_status,
      updated_at = pg_catalog.now()
    WHERE id = v_team.id
    RETURNING * INTO v_result;

    RETURN v_result;

  ELSIF p_action = 'archive' THEN
    IF v_team.status = 'active' THEN
      IF EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.profiles p ON tm.profile_id = p.id
        WHERE tm.team_id = v_team.id
          AND tm.is_primary = TRUE
          AND p.status = 'active'
          AND p.organization_id = v_org_id
      ) THEN
        RAISE EXCEPTION 'Invalid Operation: Cannot archive a team with active primary members. Reassign or remove primary memberships first.';
      END IF;
    END IF;

    UPDATE public.teams
    SET
      status = 'archived',
      updated_at = pg_catalog.now()
    WHERE id = v_team.id
    RETURNING * INTO v_result;

    RETURN v_result;

  ELSIF p_action = 'delete' THEN
    IF EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = v_team.id
    ) THEN
      RAISE EXCEPTION 'Invalid Operation: Cannot delete a team with existing members. Remove all memberships first.';
    END IF;

    DELETE FROM public.teams
    WHERE id = v_team.id
    RETURNING * INTO v_result;

    RETURN v_result;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_team(TEXT, UUID, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_team(TEXT, UUID, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- ----------------------------------------------------------------------------
-- D. PUBLIC RPC: manage_team_membership
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manage_team_membership(
  p_action TEXT,
  p_team_id UUID,
  p_profile_id UUID
)
RETURNS public.team_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_org_id UUID;
  v_caller_role_level INTEGER;
  v_caller_role_code TEXT;
  v_is_super_admin BOOLEAN;

  v_team public.teams%ROWTYPE;
  v_target_profile public.profiles%ROWTYPE;
  v_target_role_code TEXT;
  v_target_role_level INTEGER;

  v_existing_membership public.team_members%ROWTYPE;
  v_result public.team_members%ROWTYPE;

  v_curr_pri_team_id UUID;
  v_curr_pri_mgr_id UUID;
  v_curr_pri_lead_id UUID;
  v_curr_pri_org_id UUID;
BEGIN
  -- 1. Verify capability
  IF NOT private.has_permission('teams.manage') THEN
    RAISE EXCEPTION 'Access Denied: teams.manage capability required.';
  END IF;

  -- 2. Verify actor and organization
  v_actor_id := (SELECT private.current_profile_id());
  v_org_id := (SELECT private.current_organization_id());

  IF v_actor_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Active user and organization required.';
  END IF;

  v_caller_role_level := (SELECT private.current_role_level());
  v_caller_role_code := (SELECT private.current_role_code());
  v_is_super_admin := (SELECT private.is_super_admin());

  -- Employee tier cannot manage team memberships
  IF v_caller_role_level <= 20 OR v_caller_role_code = 'employee' THEN
    RAISE EXCEPTION 'Access Denied: Employees cannot manage team memberships.';
  END IF;

  -- 3. Action and parameters validation
  IF p_action NOT IN ('add', 'remove', 'set_primary') THEN
    RAISE EXCEPTION 'Invalid Action: Must be add, remove, or set_primary.';
  END IF;

  IF p_team_id IS NULL OR p_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid Parameters: Team ID and Profile ID are required.';
  END IF;

  -- 4. Load target team
  SELECT * INTO v_team
  FROM public.teams
  WHERE id = p_team_id AND organization_id = v_org_id;

  IF v_team.id IS NULL THEN
    RAISE EXCEPTION 'Team not found or does not belong to your organization.';
  END IF;

  -- Verify caller authority over this team
  IF v_caller_role_level = 60 THEN -- Manager
    IF v_team.manager_id IS DISTINCT FROM v_actor_id THEN
      RAISE EXCEPTION 'Access Denied: Managers can only manage memberships in teams they explicitly manage.';
    END IF;
  ELSIF v_caller_role_level = 40 THEN -- Team Lead
    IF v_team.team_lead_id IS DISTINCT FROM v_actor_id THEN
      RAISE EXCEPTION 'Access Denied: Team Leads can only manage memberships in teams they explicitly lead.';
    END IF;
  END IF;

  -- 5. Load target profile
  SELECT * INTO v_target_profile
  FROM public.profiles
  WHERE id = p_profile_id;

  IF v_target_profile.id IS NULL THEN
    RAISE EXCEPTION 'Target profile not found.';
  END IF;

  IF v_target_profile.organization_id IS DISTINCT FROM v_org_id THEN
    RAISE EXCEPTION 'Invalid Profile: Profile belongs to another organization.';
  END IF;

  IF v_target_profile.role_id IS NOT NULL THEN
    SELECT code, hierarchy_level INTO v_target_role_code, v_target_role_level
    FROM public.roles
    WHERE id = v_target_profile.role_id;
  END IF;

  -- 6. Action-specific logic
  IF p_action = 'add' THEN
    IF v_team.status != 'active' THEN
      RAISE EXCEPTION 'Invalid Operation: Cannot add members to an inactive or archived team.';
    END IF;

    IF v_target_profile.status != 'active' THEN
      RAISE EXCEPTION 'Invalid Profile: Only active profiles can be added to teams.';
    END IF;

    IF v_target_profile.role_id IS NULL OR v_target_role_level IS NULL THEN
      RAISE EXCEPTION 'Invalid Profile: Profile has no valid assigned role.';
    END IF;

    -- Scope check for lower roles (Section 18)
    IF v_caller_role_level = 60 THEN -- Manager
      IF p_profile_id != v_actor_id AND NOT private.is_profile_in_current_scope(p_profile_id) THEN
        RAISE EXCEPTION 'Access Denied: Managers can only add users within their supervisory hierarchy scope.';
      END IF;
    ELSIF v_caller_role_level = 40 THEN -- Team Lead
      IF p_profile_id != v_actor_id AND NOT (
        v_target_role_level <= 20 AND private.is_profile_in_current_scope(p_profile_id)
      ) THEN
        RAISE EXCEPTION 'Access Denied: Team Leads can only add Employee subordinates within their hierarchy scope.';
      END IF;
    END IF;

    -- Check existing membership (Section 19)
    SELECT * INTO v_existing_membership
    FROM public.team_members
    WHERE team_id = v_team.id AND profile_id = v_target_profile.id;

    IF v_existing_membership.team_id IS NOT NULL THEN
      RETURN v_existing_membership;
    END IF;

    INSERT INTO public.team_members (team_id, profile_id, is_primary)
    VALUES (v_team.id, v_target_profile.id, FALSE)
    RETURNING * INTO v_result;

    RETURN v_result;

  ELSIF p_action = 'set_primary' THEN
    IF v_team.status != 'active' THEN
      RAISE EXCEPTION 'Invalid Operation: Cannot set an inactive or archived team as primary.';
    END IF;

    IF v_target_profile.status != 'active' THEN
      RAISE EXCEPTION 'Invalid Profile: Only active profiles can have a primary team set.';
    END IF;

    IF v_target_profile.role_id IS NULL OR v_target_role_level IS NULL THEN
      RAISE EXCEPTION 'Invalid Profile: Profile has no valid assigned role.';
    END IF;

    -- Scope check for lower roles
    IF v_caller_role_level = 60 THEN -- Manager
      IF p_profile_id != v_actor_id AND NOT private.is_profile_in_current_scope(p_profile_id) THEN
        RAISE EXCEPTION 'Access Denied: Managers can only set primary team for users within their supervisory hierarchy scope.';
      END IF;
    ELSIF v_caller_role_level = 40 THEN -- Team Lead
      IF p_profile_id != v_actor_id AND NOT (
        v_target_role_level <= 20 AND private.is_profile_in_current_scope(p_profile_id)
      ) THEN
        RAISE EXCEPTION 'Access Denied: Team Leads can only set primary team for Employee subordinates within their hierarchy scope.';
      END IF;
    END IF;

    -- Existing primary transfer guard (Section 22)
    SELECT tm.team_id, t.manager_id, t.team_lead_id, t.organization_id
    INTO v_curr_pri_team_id, v_curr_pri_mgr_id, v_curr_pri_lead_id, v_curr_pri_org_id
    FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.profile_id = v_target_profile.id
      AND tm.is_primary = TRUE;

    IF v_curr_pri_team_id IS NOT NULL THEN
      IF v_curr_pri_org_id IS DISTINCT FROM v_org_id THEN
        RAISE EXCEPTION 'Invalid Hierarchy: Existing primary team belongs to a different organization.';
      END IF;

      IF v_caller_role_level = 60 THEN -- Manager
        IF v_curr_pri_mgr_id IS DISTINCT FROM v_actor_id THEN
          RAISE EXCEPTION 'Access Denied: Managers cannot reassign primary membership from a team they do not manage.';
        END IF;
      ELSIF v_caller_role_level = 40 THEN -- Team Lead
        IF v_curr_pri_lead_id IS DISTINCT FROM v_actor_id THEN
          RAISE EXCEPTION 'Access Denied: Team Leads cannot reassign primary membership from a team they do not lead.';
        END IF;
      END IF;
    END IF;

    -- Target team / manager_id consistency (Section 23)
    IF v_target_profile.manager_id IS NOT NULL THEN
      IF (v_team.manager_id IS DISTINCT FROM v_target_profile.manager_id)
         AND (v_team.team_lead_id IS DISTINCT FROM v_target_profile.manager_id) THEN
        RAISE EXCEPTION 'Invalid Hierarchy: Cannot set primary team because user''s direct manager does not match target team''s manager or team lead. Update user''s manager first.';
      END IF;
    END IF;

    -- Primary switch atomic (Section 24)
    UPDATE public.team_members
    SET is_primary = FALSE
    WHERE profile_id = v_target_profile.id
      AND is_primary = TRUE;

    IF EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = v_team.id AND profile_id = v_target_profile.id
    ) THEN
      UPDATE public.team_members
      SET is_primary = TRUE
      WHERE team_id = v_team.id AND profile_id = v_target_profile.id
      RETURNING * INTO v_result;
    ELSE
      INSERT INTO public.team_members (team_id, profile_id, is_primary)
      VALUES (v_team.id, v_target_profile.id, TRUE)
      RETURNING * INTO v_result;
    END IF;

    RETURN v_result;

  ELSIF p_action = 'remove' THEN
    SELECT * INTO v_existing_membership
    FROM public.team_members
    WHERE team_id = v_team.id AND profile_id = v_target_profile.id;

    IF v_existing_membership.team_id IS NULL THEN
      RAISE EXCEPTION 'Membership not found for this team and profile.';
    END IF;

    -- Primary removal restrictions (Section 26)
    IF v_existing_membership.is_primary = TRUE THEN
      IF v_caller_role_level = 60 THEN -- Manager
        IF p_profile_id != v_actor_id THEN
          IF v_target_role_level >= 60 OR NOT (
            private.is_profile_in_current_scope(p_profile_id)
            OR (v_target_profile.status != 'active' AND v_team.manager_id = v_actor_id)
          ) THEN
            RAISE EXCEPTION 'Access Denied: Managers can only remove primary memberships for subordinates within their hierarchy scope.';
          END IF;
        END IF;
      ELSIF v_caller_role_level = 40 THEN -- Team Lead
        IF p_profile_id != v_actor_id THEN
          IF v_target_role_level > 20 OR NOT (
            private.is_profile_in_current_scope(p_profile_id)
            OR (v_target_profile.status != 'active' AND v_team.team_lead_id = v_actor_id)
          ) THEN
            RAISE EXCEPTION 'Access Denied: Team Leads can only remove primary memberships for Employee subordinates within their hierarchy scope.';
          END IF;
        END IF;
      END IF;
    END IF;

    DELETE FROM public.team_members
    WHERE team_id = v_team.id AND profile_id = v_target_profile.id
    RETURNING * INTO v_result;

    RETURN v_result;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_team_membership(TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_team_membership(TEXT, UUID, UUID) TO authenticated;

-- ============================================================================
-- END OF MIGRATION 005 (Part 7B.2B)
-- ============================================================================

-- ============================================================================
-- 8. STEP 7B.2C: SECURE DYNAMIC ROLE PERMISSION MATRIX MUTATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ARCHITECTURE NOTE: SINGLE-ORGANIZATION / GLOBAL RBAC CATALOG
-- ----------------------------------------------------------------------------
-- The public.roles, public.permissions, and public.role_permissions tables are
-- currently organization-global and are not partitioned by organization_id.
-- For the CURRENT product deployment, this is accepted because the platform is
-- operating as a single-organization CRM instance.
-- Multi-tenant isolation for distinct client organizations would require an
-- organization-scoped RBAC catalog design (e.g. organization_role_permissions)
-- in a future reviewed schema migration.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- A. PUBLIC RPC: save_role_permissions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_role_permissions(
  p_role_code TEXT,
  p_permission_codes TEXT[],
  p_enabled_values BOOLEAN[]
)
RETURNS TABLE (
  permission_code TEXT,
  enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_org_id UUID;
  v_caller_role_code TEXT;

  v_target_role_id UUID;
  v_target_role_code TEXT;

  v_codes_count INTEGER;
  v_values_count INTEGER;
  v_unique_count INTEGER;

  v_idx INTEGER;
  v_perm_code TEXT;
  v_enabled_val BOOLEAN;
  v_valid_perm_count INTEGER;
  v_mapped_count INTEGER;

  -- Canonical list of 18 managed system capabilities
  c_canonical_permissions CONSTANT TEXT[] := ARRAY[
    'leads.view_all',
    'leads.view_team',
    'leads.view_assigned',
    'leads.create',
    'leads.edit_scoped',
    'leads.delete',
    'leads.reassign',
    'proposals.generate',
    'leads.bulk_import_export',
    'clients.view',
    'reports.view',
    'teams.manage',
    'services.manage',
    'users.manage',
    'users.manage_super_admin',
    'roles.manage',
    'audit_logs.view',
    'settings.manage'
  ];
BEGIN
  -- 1. Verify capability
  IF NOT private.has_permission('roles.manage') THEN
    RAISE EXCEPTION 'Access Denied: roles.manage capability required.';
  END IF;

  -- 2. Verify active current profile and valid organization
  v_actor_id := (SELECT private.current_profile_id());
  v_org_id := (SELECT private.current_organization_id());

  IF v_actor_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Active user and organization required.';
  END IF;

  -- 3. Restrict actor role code strictly to 'admin' or 'super_admin'
  v_caller_role_code := (SELECT private.current_role_code());

  IF v_caller_role_code IS NULL OR v_caller_role_code NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access Denied: Only Admin and Super Admin roles can mutate the system role permission matrix.';
  END IF;

  -- 4. Target role validation
  IF p_role_code IS NULL OR trim(p_role_code) = '' THEN
    RAISE EXCEPTION 'Invalid Target Role: Role code cannot be null or empty.';
  END IF;

  SELECT r.id, r.code
  INTO v_target_role_id, v_target_role_code
  FROM public.roles r
  WHERE r.code = trim(p_role_code);

  IF v_target_role_id IS NULL THEN
    RAISE EXCEPTION 'Invalid Target Role: Unknown role code "%".', p_role_code;
  END IF;

  IF v_target_role_code NOT IN ('super_admin', 'admin', 'manager', 'team_lead', 'employee') THEN
    RAISE EXCEPTION 'Invalid Target Role: Only canonical system roles can be managed.';
  END IF;

  -- 5. Admin -> Super Admin Safeguard
  IF v_caller_role_code = 'admin' AND v_target_role_code = 'super_admin' THEN
    RAISE EXCEPTION 'Access Denied: Admin users cannot modify Super Admin role permissions.';
  END IF;

  -- 6. Input arrays validation
  IF p_permission_codes IS NULL OR p_enabled_values IS NULL THEN
    RAISE EXCEPTION 'Invalid Input: Permission codes and enabled values arrays must not be null.';
  END IF;

  -- Check dimension (must be 1D array)
  IF pg_catalog.array_ndims(p_permission_codes) IS DISTINCT FROM 1
     OR pg_catalog.array_ndims(p_enabled_values) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Invalid Input: Permission codes and enabled values must be single-dimensional arrays.';
  END IF;

  v_codes_count := pg_catalog.array_length(p_permission_codes, 1);
  v_values_count := pg_catalog.array_length(p_enabled_values, 1);

  IF v_codes_count IS NULL OR v_values_count IS NULL THEN
    RAISE EXCEPTION 'Invalid Input: Empty arrays are not accepted.';
  END IF;

  IF v_codes_count != v_values_count THEN
    RAISE EXCEPTION 'Invalid Input: Permission codes length (%) does not match enabled values length (%).',
      v_codes_count, v_values_count;
  END IF;

  IF v_codes_count < 1 OR v_codes_count > 18 THEN
    RAISE EXCEPTION 'Invalid Input: Array length must be between 1 and 18.';
  END IF;

  -- Null elements check and Super Admin permanent protections
  FOR v_idx IN 1..v_codes_count LOOP
    v_perm_code := p_permission_codes[v_idx];
    v_enabled_val := p_enabled_values[v_idx];

    IF v_perm_code IS NULL OR trim(v_perm_code) = '' THEN
      RAISE EXCEPTION 'Invalid Input: Permission code at index % is null or blank.', v_idx;
    END IF;

    IF v_enabled_val IS NULL THEN
      RAISE EXCEPTION 'Invalid Input: Enabled value at index % is null.', v_idx;
    END IF;

    -- Canonical 18 managed capabilities check
    IF NOT (v_perm_code = ANY(c_canonical_permissions)) THEN
      RAISE EXCEPTION 'Invalid Permission: "%" is not one of the 18 canonical managed capabilities.', v_perm_code;
    END IF;

    -- Super Admin protected invariants check
    IF v_target_role_code = 'super_admin'
       AND v_perm_code IN ('users.manage_super_admin', 'roles.manage')
       AND v_enabled_val = FALSE THEN
      RAISE EXCEPTION 'Access Denied: Fundamental Super Admin permission "%" cannot be disabled.', v_perm_code;
    END IF;
  END LOOP;

  -- Duplicate permission codes rejection
  SELECT count(DISTINCT c) INTO v_unique_count
  FROM pg_catalog.unnest(p_permission_codes) AS c;

  IF v_unique_count != v_codes_count THEN
    RAISE EXCEPTION 'Invalid Input: Duplicate permission codes are not permitted in the batch.';
  END IF;

  -- Verify all requested permission codes exist in public.permissions
  SELECT count(DISTINCT p.code) INTO v_valid_perm_count
  FROM public.permissions p
  WHERE p.code = ANY(p_permission_codes);

  IF v_valid_perm_count != v_codes_count THEN
    RAISE EXCEPTION 'Invalid Permission: One or more supplied permission codes do not exist in permissions catalog.';
  END IF;

  -- 7. Existing mapping required (Fail closed, UPDATE-only, no silent INSERTs)
  SELECT count(DISTINCT p.code) INTO v_mapped_count
  FROM public.role_permissions rp
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE rp.role_id = v_target_role_id
    AND p.code = ANY(p_permission_codes);

  IF v_mapped_count != v_codes_count THEN
    RAISE EXCEPTION 'Invalid Operation: One or more canonical role-permission mappings do not exist for role "%". Mappings cannot be dynamically created.',
      v_target_role_code;
  END IF;

  -- 8. Atomic batch mutation (UPDATE only enabled values)
  UPDATE public.role_permissions rp
  SET enabled = batch.enabled
  FROM (
    SELECT p.id AS permission_id, input_batch.enabled
    FROM (
      SELECT
        u.perm_code,
        u.enabled
      FROM pg_catalog.unnest(p_permission_codes, p_enabled_values) AS u(perm_code, enabled)
    ) input_batch
    JOIN public.permissions p ON p.code = input_batch.perm_code
  ) batch
  WHERE rp.role_id = v_target_role_id
    AND rp.permission_id = batch.permission_id;

  -- 9. Return stable typed resulting mappings for the updated entries
  RETURN QUERY
  SELECT
    p.code AS permission_code,
    rp.enabled
  FROM public.role_permissions rp
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE rp.role_id = v_target_role_id
    AND p.code = ANY(p_permission_codes)
  ORDER BY p.code ASC;
END;
$$;

-- Exact Function Privileges
REVOKE ALL ON FUNCTION public.save_role_permissions(TEXT, TEXT[], BOOLEAN[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_role_permissions(TEXT, TEXT[], BOOLEAN[]) TO authenticated;

-- ============================================================================
-- END OF MIGRATION 005 (Part 7B.2C)
-- ============================================================================

