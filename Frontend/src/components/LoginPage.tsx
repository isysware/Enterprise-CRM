import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { UserRole } from '../types';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

const ROLE_PRESETS: {
  role: UserRole;
  email: string;
  pass: string;
  title: string;
}[] = [
  {
    role: 'Super Admin',
    email: 'superadmin@crm.com',
    pass: 'Admin@123',
    title: 'Super Admin Portal'
  },
  {
    role: 'Admin',
    email: 'admin@crm.com',
    pass: 'Admin@123',
    title: 'Admin Portal'
  },
  {
    role: 'Manager',
    email: 'manager@crm.com',
    pass: 'Manager@123',
    title: 'Manager Portal'
  },
  {
    role: 'Team Lead',
    email: 'teamlead@crm.com',
    pass: 'Lead@123',
    title: 'Team Lead Portal'
  },
  {
    role: 'Employee',
    email: 'employee@crm.com',
    pass: 'Emp@123',
    title: 'Employee Portal'
  }
];

export const LoginPage: React.FC = () => {
  const { login, settings } = useCRM();

  const [selectedRole, setSelectedRole] = useState<UserRole>('Super Admin');
  const [email, setEmail] = useState('superadmin@crm.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Switch portal and populate credentials
  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    const preset = ROLE_PRESETS.find(p => p.role === role);
    if (preset) {
      setEmail(preset.email);
      setPassword(preset.pass);
    }
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = login(email, password, selectedRole);
      if (!res.success) {
        setError(res.error || 'Invalid credentials or role mismatch. Please try again.');
      }
      setLoading(false);
    }, 180);
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased text-slate-900 dark:text-white">
      {/* ========================================================================= */}
      {/* TOP BRAND HEADER (CENTERED LOGO, TITLE & SECURITY PILL)                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center text-center mb-6">
        {/* Brand Circular Logo Badge */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-[0_10px_30px_rgba(11,19,43,0.3)] flex items-center justify-center overflow-hidden mb-4 transition-transform hover:scale-105">
          <img
            src={settings.companyLogo || '/isysware-logo.png'}
            alt={settings.companyName || 'iSysware Logo'}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/isysware-logo.png';
            }}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Brand System Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {settings.companyName || 'iSysware'} CRM
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enterprise Lead &amp; Customer Relationship Management System
        </p>

        {/* Security Badge Pill */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
          <span>Enterprise Suite • PostgreSQL Server Authentication Active</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTER AUTHENTICATION CARD (EXACT MATCH TO REFERENCE DESIGN)              */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 max-w-[440px] w-full space-y-4">
        
        {/* Error Alert Box */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Portal Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Portal / Role <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={e => handleSelectRole(e.target.value as UserRole)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold rounded-xl pl-3.5 pr-9 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] cursor-pointer shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"
              >
                {ROLE_PRESETS.map(p => (
                  <option key={p.role} value={p.role}>
                    {p.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Email / Employee ID Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email / Employee ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. superadmin@isysware.com"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Options Row: Remember Me & Help / Support */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-slate-600 dark:text-slate-400 font-medium">Remember this workstation</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-slate-500 hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Help / Support
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to CRM Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* FOOTER NOTICE BELOW CARD (MATCHING REFERENCE DESIGN)                     */}
      {/* ========================================================================= */}
      <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
        <p>iSysware Software Solutions CRM • Strict 5–Portals Role Boundary Enforced.</p>
        <p>All reports remain table-based with zero charts per PRD &amp; TRD requirements.</p>
      </div>

      {/* Help / Support & Credentials Reference Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base">Account Credentials Help</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              If you forgot your password or need a credential reset, please contact your organization's <strong>Super Admin</strong>.
            </p>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Default Demo Credentials Reference:</p>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                <li className="flex items-center justify-between">
                  <span>• Super Admin:</span>
                  <span className="text-[#2563EB] font-semibold">superadmin@crm.com / Admin@123</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Admin:</span>
                  <span className="text-[#2563EB] font-semibold">admin@crm.com / Admin@123</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Manager:</span>
                  <span className="text-[#2563EB] font-semibold">manager@crm.com / Manager@123</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Team Lead:</span>
                  <span className="text-[#2563EB] font-semibold">teamlead@crm.com / Lead@123</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Employee:</span>
                  <span className="text-[#2563EB] font-semibold">employee@crm.com / Emp@123</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
