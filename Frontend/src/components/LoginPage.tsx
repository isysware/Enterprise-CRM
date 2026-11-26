import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { UserRole } from '../types';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  KeyRound,
  ShieldCheck,
  Crown,
  Briefcase,
  Users,
  Layers,
  ArrowRight,
  Sparkles,
  ChevronDown
} from 'lucide-react';

const ROLE_PRESETS: {
  role: UserRole;
  email: string;
  pass: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    role: 'Super Admin',
    email: 'superadmin@crm.com',
    pass: 'Admin@123',
    title: 'Super Admin',
    icon: Crown
  },
  {
    role: 'Admin',
    email: 'admin@crm.com',
    pass: 'Admin@123',
    title: 'Admin',
    icon: ShieldCheck
  },
  {
    role: 'Manager',
    email: 'manager@crm.com',
    pass: 'Manager@123',
    title: 'Manager',
    icon: Briefcase
  },
  {
    role: 'Team Lead',
    email: 'teamlead@crm.com',
    pass: 'Lead@123',
    title: 'Team Lead',
    icon: Users
  },
  {
    role: 'Employee',
    email: 'employee@crm.com',
    pass: 'Emp@123',
    title: 'Employee',
    icon: Layers
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

  // Switch role via dropdown and auto-populate demo credentials
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
    <div className="min-h-screen w-full bg-white dark:bg-slate-950 flex flex-col lg:flex-row overflow-x-hidden font-sans antialiased">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: FULL-HEIGHT AUTHENTICATION CANVAS                           */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-1/2 min-h-screen p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/80">
        
        {/* Top Brand & Portal Selector Dropdown Header */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2.5">
            {settings.companyLogo ? (
              <img
                src={settings.companyLogo}
                alt={settings.companyName || 'Logo'}
                className="h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {settings.companyName || 'iSysware'}
            </span>
          </div>

          {/* 5 Portals Dropdown Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
              Portal:
            </span>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={e => handleSelectRole(e.target.value as UserRole)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl pl-3 pr-8 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] cursor-pointer shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-750 transition-all"
              >
                <option value="Super Admin">👑 Super Admin Portal</option>
                <option value="Admin">🛡️ Admin Portal</option>
                <option value="Manager">💼 Manager Portal</option>
                <option value="Team Lead">👥 Team Lead Portal</option>
                <option value="Employee">⚡ Employee Portal</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Center Form Section (Vertically Centered) */}
        <div className="max-w-md w-full mx-auto my-auto py-8 space-y-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Enter your email and password to access your account.
            </p>
          </div>

          {/* Error Message Alert */}
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
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

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="font-medium text-[#2563EB] dark:text-blue-400 hover:underline transition-colors cursor-pointer"
              >
                Forgot Your Password?
              </button>
            </div>

            {/* Primary Log In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Log In</span>
              )}
            </button>

            {/* Or Login With Divider */}
            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-medium whitespace-nowrap">
                Or Login With
              </span>
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            </div>

            {/* Social Login Buttons: Google & Apple */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectRole('Super Admin')}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('Admin')}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.89c.66-.82 1.11-1.96.99-3.1-.96.04-2.11.64-2.8 1.45-.6.7-.1.14-1.84 1.05-3.04 1.07-.02 2.1.88 2.86 1.69z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>

            {/* Register Callout */}
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              Don't Have An Account?{' '}
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                Register Now.
              </button>
            </p>
          </form>
        </div>

        {/* Bottom Copyright and Privacy Links */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <span>Copyright © 2026 {settings.companyName || 'iSysware'} Enterprises LTD.</span>
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: FULL-HEIGHT HERO CANVAS (ROYAL BLUE CARD)                  */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-1/2 min-h-screen p-3 sm:p-5 lg:p-6 flex bg-[#F8FAFC] dark:bg-slate-950">
        <div className="w-full h-full min-h-[620px] rounded-2xl sm:rounded-3xl lg:rounded-[36px] bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] p-6 sm:p-10 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden shadow-2xl">
          
          {/* Background Geometric Rings Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-15">
            <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full border-[60px] border-white" />
            <div className="absolute top-1/4 -right-16 w-[450px] h-[450px] rounded-full border-[40px] border-white" />
            <div className="absolute -bottom-24 -left-24 w-[350px] h-[350px] rounded-full border-[30px] border-white" />
          </div>

          {/* Hero Header Copy */}
          <div className="relative z-10 max-w-xl space-y-3">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
              Effortlessly manage your team and operations.
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-normal">
              Log in to access your CRM dashboard and manage your team.
            </p>
          </div>

          {/* Dashboard Floating Showcase Mockup */}
          <div className="relative z-10 my-8 flex items-center justify-center">
            <div className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl text-slate-800 dark:text-slate-100 border border-white/20 relative">
              
              {/* Top Metrics Row */}
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                {/* Metric 1: Total Sales */}
                <div className="bg-[#5B46F6]/10 dark:bg-indigo-950/60 rounded-xl p-2.5 border border-[#5B46F6]/20">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Sales</span>
                  <span className="text-sm sm:text-base font-bold text-[#5B46F6] dark:text-indigo-400 block mt-0.5">$189,374</span>
                  <span className="text-[8px] font-bold text-[#5B46F6] bg-[#5B46F6]/15 px-1 py-0.5 rounded mt-1 inline-block">+14% this month</span>
                </div>

                {/* Metric 2: Deal Performance */}
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Deal Performance</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white block mt-0.5">00:01:30</span>
                  <div className="h-4 w-full mt-1">
                    <svg viewBox="0 0 80 16" className="w-full h-full">
                      <path d="M 0 12 Q 20 4, 40 8 T 80 2" fill="none" stroke="#6366F1" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {/* Metric 3: Total Profit */}
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Profit</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white block mt-0.5">$25,684</span>
                  <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded mt-1 inline-block">+8% growth</span>
                </div>
              </div>

              {/* Overlapping Floating Donut/Gauge Card */}
              <div className="absolute -top-6 -right-4 sm:-right-6 w-36 sm:w-44 bg-white dark:bg-slate-850 rounded-2xl p-3 shadow-xl border border-slate-200/80 dark:border-slate-700 text-center z-20">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 pb-1">
                  <span>Sales Categories</span>
                  <span className="text-[8px] text-blue-600">Monthly</span>
                </div>

                {/* Semi-Donut Gauge SVG */}
                <div className="relative w-24 h-14 mx-auto my-1">
                  <svg viewBox="0 0 100 55" className="w-full h-full">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E2E8F0" strokeWidth="12" strokeLinecap="round" />
                    <path d="M 10 50 A 40 40 0 0 1 75 22" fill="none" stroke="#5B46F6" strokeWidth="12" strokeLinecap="round" />
                    <path d="M 75 22 A 40 40 0 0 1 90 50" fill="none" stroke="#A78BFA" strokeWidth="12" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">8,248</span>
                    <span className="text-[8px] text-slate-400">Units</span>
                  </div>
                </div>

                <div className="space-y-0.5 text-[8px] text-left text-slate-600 dark:text-slate-300 font-medium pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#5B46F6]" /> Software Suite</span>
                    <span className="font-bold">52%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" /> POS Licenses</span>
                    <span className="font-bold">30%</span>
                  </div>
                </div>
              </div>

              {/* Mini Data Table Preview */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-[9px]">
                <div className="bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 font-bold text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                  <span>RECENT CONVERSIONS</span>
                  <span>STATUS</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  <div className="px-2.5 py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">ARFO Men's Salon</span>
                      <span className="text-[8px] text-slate-400">Enterprise POS • PKR 65,000</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold text-[8px]">Closed Won</span>
                  </div>
                  <div className="px-2.5 py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">The Shave Club</span>
                      <span className="text-[8px] text-slate-400">Cloud ERP • Follow-up Today</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold text-[8px]">Pending F/U</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Enterprise Badge */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-blue-200/80 pt-4 border-t border-white/10">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Enterprise Grade Security &amp; End-to-End Encryption</span>
            </span>
            <span className="font-mono text-[10px] text-white font-bold bg-white/15 px-2 py-0.5 rounded-full">v3.4 Live</span>
          </div>

        </div>
      </div>

      {/* Forgot Password / Credentials Reset Help Modal */}
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
