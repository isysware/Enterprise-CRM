-- ==============================================================================
-- PHASE 2C: CORE TABLE PRIVILEGE HARDENING & LEAST PRIVILEGE ENFORCEMENT
-- Migration File: 003_core_privilege_hardening.sql
-- Description: Revokes all unnecessary table privileges (TRUNCATE, REFERENCES, 
--              TRIGGER, etc.) from anon and authenticated, leaving authenticated 
--              with SELECT only on the 7 core public tables.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN EXISTING TABLE PRIVILEGES: REVOKE ALL FROM ANON
-- ------------------------------------------------------------------------------
REVOKE ALL ON TABLE public.organizations FROM anon;
REVOKE ALL ON TABLE public.roles FROM anon;
REVOKE ALL ON TABLE public.permissions FROM anon;
REVOKE ALL ON TABLE public.role_permissions FROM anon;
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.teams FROM anon;
REVOKE ALL ON TABLE public.team_members FROM anon;

-- ------------------------------------------------------------------------------
-- 2. HARDEN EXISTING TABLE PRIVILEGES: LEAST PRIVILEGE FOR AUTHENTICATED
-- ------------------------------------------------------------------------------
-- Step 2a: Revoke all existing privileges (including TRUNCATE, REFERENCES, TRIGGER)
REVOKE ALL ON TABLE public.organizations FROM authenticated;
REVOKE ALL ON TABLE public.roles FROM authenticated;
REVOKE ALL ON TABLE public.permissions FROM authenticated;
REVOKE ALL ON TABLE public.role_permissions FROM authenticated;
REVOKE ALL ON TABLE public.profiles FROM authenticated;
REVOKE ALL ON TABLE public.teams FROM authenticated;
REVOKE ALL ON TABLE public.team_members FROM authenticated;

-- Step 2b: Grant back strictly SELECT privilege only
GRANT SELECT ON TABLE public.organizations TO authenticated;
GRANT SELECT ON TABLE public.roles TO authenticated;
GRANT SELECT ON TABLE public.permissions TO authenticated;
GRANT SELECT ON TABLE public.role_permissions TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.teams TO authenticated;
GRANT SELECT ON TABLE public.team_members TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. HARDEN FUTURE DEFAULT PRIVILEGES (PUBLIC SCHEMA ONLY)
-- ------------------------------------------------------------------------------
-- Prevent future public tables from automatically inheriting broad privileges for anon/authenticated
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;

-- ------------------------------------------------------------------------------
-- 4. VERIFICATION QUERY (FOR MANUAL EXECUTION IN SUPABASE SQL EDITOR)
-- ------------------------------------------------------------------------------
/*
-- Run this query after executing the migration to verify role_table_grants:
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
      'organizations', 
      'roles', 
      'permissions', 
      'role_permissions', 
      'profiles', 
      'teams', 
      'team_members'
  )
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, table_name, privilege_type;

-- EXPECTED RESULT:
-- 1. grantee = 'anon': 0 rows
-- 2. grantee = 'authenticated': exactly 7 rows, all with privilege_type = 'SELECT'
*/
