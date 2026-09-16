import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { RolePermission, UserRole } from '../../types';
import {
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  Edit3,
  Trash2,
  Share2,
  Users,
  Briefcase,
  BarChart3,
  Network,
  Package,
  History,
  Settings,
  Sparkles,
  FileSpreadsheet,
  FileSignature,
  Plus,
  Inbox,
  UserCheck
} from 'lucide-react';

interface PermissionDefinition {
  key: keyof Omit<RolePermission, 'role' | 'description'>;
  label: string;
  category: 'Lead Visibility & Pipeline' | 'Lead Actions & Ownership' | 'Business & Analytics' | 'System Administration';
  description: string;
  icon: React.ElementType;
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // 1. Lead Visibility & Pipeline
  {
    key: 'canViewAllLeads',
    label: 'Full Lead Visibility (Within Allowed Scope)',
    category: 'Lead Visibility & Pipeline',
    description: 'View all leads available within the user\'s authorized organizational scope.',
    icon: Eye
  },
  {
    key: 'canViewTeamLeads',
    label: 'Team & Department Leads Visibility',
    category: 'Lead Visibility & Pipeline',
    description: 'View leads belonging to assigned team members and direct report subordinates.',
    icon: Users
  },
  {
    key: 'canViewAssignedLeads',
    label: 'Assigned Direct Leads Visibility',
    category: 'Lead Visibility & Pipeline',
    description: 'View leads specifically assigned to the user profile.',
    icon: Eye
  },
  {
    key: 'canViewIncomingLeads',
    label: 'View Incoming Leads Inbox',
    category: 'Lead Visibility & Pipeline',
    description: 'View new leads received from connected Meta Ads and WhatsApp channels.',
    icon: Inbox
  },

  // 2. Lead Actions & Ownership
  {
    key: 'canCreateLeads',
    label: 'Create New Leads',
    category: 'Lead Actions & Ownership',
    description: 'Add new prospective customer records to the CRM pipeline.',
    icon: Plus
  },
  {
    key: 'canEditAllLeads',
    label: 'Edit All Scoped Leads',
    category: 'Lead Actions & Ownership',
    description: 'Modify details, status, contact records, and pricing for visible leads.',
    icon: Edit3
  },
  {
    key: 'canDeleteLeads',
    label: 'Delete Lead Records',
    category: 'Lead Actions & Ownership',
    description: 'Permanently remove leads and associated follow-up histories from CRM.',
    icon: Trash2
  },
  {
    key: 'canReassignLeads',
    label: 'Reassign Lead Ownership',
    category: 'Lead Actions & Ownership',
    description: 'Transfer customer lead ownership to subordinate team members or reps.',
    icon: Share2
  },
  {
    key: 'canAssignIncomingLeads',
    label: 'Assign Incoming Leads',
    category: 'Lead Actions & Ownership',
    description: 'Assign incoming integration leads to authorized staff and add them to CRM.',
    icon: UserCheck
  },
  {
    key: 'canGenerateProposals',
    label: 'Generate & Send Proposals',
    category: 'Lead Actions & Ownership',
    description: 'Create commercial proposals, customize itemized quotation tables, and export PDFs.',
    icon: FileSignature
  },
  {
    key: 'canBulkImportExport',
    label: 'Bulk CSV Import & Export',
    category: 'Lead Actions & Ownership',
    description: 'Import leads via spreadsheet and export pipeline data to CSV.',
    icon: FileSpreadsheet
  },

  // 3. Business & Analytics
  {
    key: 'canViewClients',
    label: 'Access Active Clients Directory',
    category: 'Business & Analytics',
    description: 'View converted accounts, recurring billings, and client ledgers.',
    icon: Briefcase
  },
  {
    key: 'canViewReports',
    label: 'View Analytics & Performance Reports',
    category: 'Business & Analytics',
    description: 'Access executive dashboards, conversion stats, and staff league tables.',
    icon: BarChart3
  },
  {
    key: 'canManageTeams',
    label: 'Manage Teams & Departments',
    category: 'Business & Analytics',
    description: 'Create and configure sales teams, team leaders, and department members.',
    icon: Network
  },
  {
    key: 'canManageServices',
    label: 'Manage Service & Product Catalogs',
    category: 'Business & Analytics',
    description: 'Add, edit base pricing, and adjust service offerings and software packages.',
    icon: Package
  },

  // 4. System Administration
  {
    key: 'canManageUsers',
    label: 'Manage User Accounts & Credentials',
    category: 'System Administration',
    description: 'Provision staff members, change passwords, and deactivate accounts.',
    icon: Users
  },
  {
    key: 'canManageSuperAdmin',
    label: 'Manage Super Admin Profiles',
    category: 'System Administration',
    description: 'Edit, password-reset, or modify Super Admin master accounts.',
    icon: Lock
  },
  {
    key: 'canManageRoles',
    label: 'Edit Role Permissions Matrix',
    category: 'System Administration',
    description: 'Customize and enforce granular access control matrices across all roles.',
    icon: ShieldCheck
  },
  {
    key: 'canManageIntegrations',
    label: 'Manage Meta & WhatsApp Connections',
    category: 'System Administration',
    description: 'Connect, disconnect, and manage Meta Lead Ads and WhatsApp integrations.',
    icon: Share2
  },
  {
    key: 'canViewAuditLogs',
    label: 'Access Security Audit Trail Logs',
    category: 'System Administration',
    description: 'Review complete historical event logs and user access records.',
    icon: History
  },
  {
    key: 'canAccessSettings',
    label: 'System Configurations & Currency',
    category: 'System Administration',
    description: 'Modify company branding, default currency, timezones, and stale lead thresholds.',
    icon: Settings
  }
];

const ROLES_ORDER: UserRole[] = ['Super Admin', 'Admin', 'Manager', 'Team Lead', 'Employee'];

export const RolesAdminView: React.FC = () => {
  const {
    rolePermissions,
    saveAllRolePermissions,
    resetRolePermissionsToDefault,
    currentUser,
    canManageRoles
  } = useCRM();

  // Local draft state for matrix editing
  const [matrixDraft, setMatrixDraft] = useState<RolePermission[]>(() => {
    return JSON.parse(JSON.stringify(rolePermissions));
  });

  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'reset'; message: string } | null>(null);

  // Sync draft when external rolePermissions changes (e.g. user switch or reset)
  useEffect(() => {
    setMatrixDraft(JSON.parse(JSON.stringify(rolePermissions)));
  }, [rolePermissions]);

  // Check if draft has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(matrixDraft) !== JSON.stringify(rolePermissions);
  }, [matrixDraft, rolePermissions]);

  // Cell Locking Safeguards Logic
  const getCellLockStatus = (role: UserRole, key: keyof Omit<RolePermission, 'role' | 'description'>): { locked: boolean; reason?: string } => {
    // If current actor is Admin, the ENTIRE Super Admin column is locked
    if (currentUser?.role === 'Admin' && role === 'Super Admin') {
      return { locked: true, reason: 'Only a Super Admin can modify Super Admin permissions.' };
    }

    // Super Admin critical controls are permanently locked ON
    if (role === 'Super Admin' && (key === 'canManageSuperAdmin' || key === 'canManageRoles')) {
      return { locked: true, reason: 'Super Admin master safeguard (Permanently Enabled)' };
    }

    // canManageSuperAdmin is locked OFF for all non-Super-Admin roles
    if (role !== 'Super Admin' && key === 'canManageSuperAdmin') {
      return { locked: true, reason: 'Super Admin master accounts can only be managed by Super Admin.' };
    }

    // canManageRoles is locked OFF for Manager, Team Lead, and Employee
    if ((role === 'Manager' || role === 'Team Lead' || role === 'Employee') && key === 'canManageRoles') {
      return { locked: true, reason: 'Role permission matrix management is restricted to administrative roles.' };
    }

    // Employee is structurally excluded from Incoming Leads integrations
    if (role === 'Employee' && (key === 'canViewIncomingLeads' || key === 'canAssignIncomingLeads' || key === 'canManageIntegrations')) {
      return { locked: true, reason: 'Employee is structurally excluded from Incoming Leads integrations.' };
    }

    return { locked: false };
  };

  // Toggle specific permission
  const handleToggle = (role: UserRole, key: keyof Omit<RolePermission, 'role' | 'description'>) => {
    const lockStatus = getCellLockStatus(role, key);
    if (lockStatus.locked) {
      return;
    }

    setMatrixDraft(prev =>
      prev.map(item => {
        if (item.role === role) {
          return {
            ...item,
            [key]: !item[key]
          };
        }
        return item;
      })
    );
  };

  // Direct Route & Capability Guard
  const canAccessMatrix = currentUser && (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') && canManageRoles;
  if (!canAccessMatrix) {
    return (
      <div id="roles-admin-unauthorized" className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Access Restricted</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Only authorized administrators with role management capabilities can configure the permissions matrix.
        </p>
      </div>
    );
  }

  // Save changes handler
  const handleSave = () => {
    saveAllRolePermissions(matrixDraft);
    setSaveFeedback({
      type: 'success',
      message: 'Role permissions matrix saved successfully! All access rules and data visibility scopes updated in real time.'
    });
    setTimeout(() => setSaveFeedback(null), 4000);
  };

  // Reset to default handler
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset role capabilities to factory default matrix?')) {
      resetRolePermissionsToDefault();
      setSaveFeedback({
        type: 'reset',
        message: 'Role permissions restored to factory default matrix.'
      });
      setTimeout(() => setSaveFeedback(null), 4000);
    }
  };

  // Categories grouping
  const categories = useMemo(() => {
    const map = new Map<string, PermissionDefinition[]>();
    PERMISSION_DEFINITIONS.forEach(def => {
      if (!map.has(def.category)) {
        map.set(def.category, []);
      }
      map.get(def.category)!.push(def);
    });
    return Array.from(map.entries());
  }, []);

  const getRoleCardColor = (role: UserRole) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'Admin':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'Manager':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'Team Lead':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Employee':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Roles & Permissions Matrix
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive authorization matrix. Toggle permissions for any role to dynamically enforce visibility scoping and administrative access in real time.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={handleReset}
            type="button"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-300/60 dark:border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Reset to Default
          </button>

          <button
            onClick={handleSave}
            type="button"
            disabled={!hasUnsavedChanges}
            className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm ${
              hasUnsavedChanges
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 ring-2 ring-indigo-500/50 animate-pulse'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-70'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
            {hasUnsavedChanges && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* Save Notification / Alert */}
      {saveFeedback && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveFeedback.message}</span>
        </div>
      )}

      {hasUnsavedChanges && !saveFeedback && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You have unsaved permission changes. Click <strong>Save Changes</strong> to apply them across the CRM.</span>
          </div>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer shadow-xs"
          >
            Save Now
          </button>
        </div>
      )}

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ROLES_ORDER.map(role => {
          const roleData = matrixDraft.find(r => r.role === role);
          const activeCount = roleData
            ? PERMISSION_DEFINITIONS.filter(def => !!roleData[def.key]).length
            : 0;

          return (
            <div
              key={role}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-2"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleCardColor(role)}`}>
                    {role}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {activeCount}/{PERMISSION_DEFINITIONS.length} Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-3">
                  {roleData?.description || 'Custom configured role access.'}
                </p>
              </div>

              {/* Mini progress indicator */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(activeCount / PERMISSION_DEFINITIONS.length) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Granular Capability Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Editable Capabilities & Scope Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any toggle to enable or disable capabilities for a role. Changes are reflected dynamically upon saving.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
            {PERMISSION_DEFINITIONS.length} Managed Capabilities
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                <th className="p-4 min-w-[260px]">Capability & Description</th>
                {ROLES_ORDER.map(role => (
                  <th key={role} className="p-4 text-center min-w-[95px]">
                    <div className="inline-block">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleCardColor(role)}`}>
                        {role}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map(([categoryName, perms]) => (
                <React.Fragment key={categoryName}>
                  {/* Category Header Row */}
                  <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                    <td
                      colSpan={ROLES_ORDER.length + 1}
                      className="px-4 py-2.5 font-bold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-slate-100/50 dark:bg-slate-800/50 border-y border-slate-200/60 dark:border-slate-800"
                    >
                      {categoryName}
                    </td>
                  </tr>

                  {/* Permissions inside Category */}
                  {perms.map(permDef => {
                    const Icon = permDef.icon;

                    return (
                      <tr
                        key={permDef.key}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-xs">
                                {permDef.label}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                {permDef.description}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Toggles for each role */}
                        {ROLES_ORDER.map(role => {
                          const roleData = matrixDraft.find(r => r.role === role);
                          const isEnabled = !!roleData?.[permDef.key];
                          const lockStatus = getCellLockStatus(role, permDef.key);

                          return (
                            <td key={role} className="p-4 text-center align-middle">
                              {lockStatus.locked ? (
                                <div
                                  title={lockStatus.reason}
                                  className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed mx-auto text-[11px] font-medium"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span className={`text-[10px] font-semibold ${isEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                                    {isEnabled ? 'ON' : 'OFF'}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggle(role, permDef.key)}
                                  title={`${isEnabled ? 'Disable' : 'Enable'} ${permDef.label} for ${role}`}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden mx-auto ${
                                    isEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Master safeguards prevent lockout of administrative and role governance privileges.</span>
          </div>

          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSave}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
              >
                Save All Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
