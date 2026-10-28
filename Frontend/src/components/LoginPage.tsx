import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { UserRole } from '../types';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Check,
  KeyRound,
  X,
  Sparkles,
  Users,
  Briefcase,
  Layers,
  Crown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Activity,
  CheckCircle2,
  DollarSign,
  BarChart3,
  CalendarCheck,
  Target
} from 'lucide-react';
import { getRoleBadgeStyle } from '../utils/formatters';

const ROLE_PRESETS: {
  role: UserRole;
  email: string;
  pass: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeBg: string;
}[] = [
  {
    role: 'Super Admin',
    email: 'superadmin@crm.com',
    pass: 'Admin@123',
    title: 'Super Admin',
    description: 'Master system & user access',
    icon: Crown,
    color: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  },
  {
    role: 'Admin',
    email: 'admin@crm.com',
    pass: 'Admin@123',
    title: 'Admin',
    description: 'Full CRM & team management',
    icon: ShieldCheck,
    color: 'from-blue-600 to-indigo-600',
    badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  },
  {
    role: 'Manager',
    email: 'manager@crm.com',
    pass: 'Manager@123',
    title: 'Manager',
    description: 'Team leads & reports',
    icon: Briefcase,
    color: 'from-purple-600 to-pink-600',
    badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  },
  {
    role: 'Team Lead',
    email: 'teamlead@crm.com',
    pass: 'Lead@123',
    title: 'Team Lead',
    description: 'Team oversight & pipeline',
    icon: Users,
    color: 'from-teal-600 to-emerald-600',
    badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
  },
  {
    role: 'Employee',
    email: 'employee@crm.com',
    pass: 'Emp@123',
    title: 'Employee',
    description: 'Assigned leads & follow-ups',
    icon: Layers,
    color: 'from-slate-600 to-slate-700',
    badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  }
];

const SHOWCASE_SLIDES = [
  {
    tag: 'ENTERPRISE CRM PLATFORM',
    title: 'Unified Sales Pipelines & Role-Based Governance',
    desc: 'Accelerate deal velocity, manage inquiries seamlessly, and empower every team member with role-tailored workspaces.',
    stat1: { label: 'Active Pipeline Yield', val: '79.4%' },
    stat2: { label: 'Avg Deal Velocity', val: '14 Days' }
  },
  {
    tag: 'FOLLOW-UP AUTOMATION',
    title: 'Intelligent Interaction & Multi-Touch Scheduling',
    desc: 'Never let a prospective client slip away. Track WhatsApp touchpoints, direct calls, proposals, and automated alerts in real-time.',
    stat1: { label: 'Follow-Up Quota', val: '98.2%' },
    stat2: { label: 'Response Time', val: '< 15 Mins' }
  },
  {
    tag: 'FINANCIAL INTELLIGENCE',
    title: 'Multi-Model Commercial & Revenue Analytics',
    desc: 'Deep financial visibility across SaaS monthly subscriptions, one-time project contracts, and enterprise software ownership.',
    stat1: { label: 'Monthly Revenue', val: 'Rs. 4.8M+' },
    stat2: { label: 'Retention Rate', val: '96.5%' }
  }
];

export const LoginPage: React.FC = () => {
  const { login, users, settings } = useCRM();

  const [selectedRole, setSelectedRole] = useState<UserRole>('Super Admin');
  const [email, setEmail] = useState('superadmin@crm.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto rotate showcase slides
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Handle switching role tab
  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    const preset = ROLE_PRESETS.find(p => p.role === role);
    if (preset) {
      setEmail(preset.email);
      setPassword(preset.pass);
    }
  };

  // Quick Auto-Fill Handler
  const handleQuickFill = (role: UserRole, customEmail?: string, customPass?: string) => {
    const preset = ROLE_PRESETS.find(p => p.role === role);
    setSelectedRole(role);
    setEmail(customEmail || preset?.email || 'superadmin@crm.com');
    setPassword(customPass || preset?.pass || 'Admin@123');
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

  const matchedUser = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
  const activePreset = ROLE_PRESETS.find(p => p.role === selectedRole);
  const currentSlide = SHOWCASE_SLIDES[activeSlide];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans">
      {/* ========================================================================= */}
      {/* LEFT SIDE: BRAND & DASHBOARD 3D SHOWCASE (DEEP INDIGO/PURPLE CANVAS)      */}
      {/* ========================================================================= */}
      <div className="lg:w-1/2 xl:w-[52%] relative bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#1e1b4b] p-6 sm:p-10 lg:p-12 xl:p-16 flex flex-col justify-between overflow-hidden text-white min-h-[500px] lg:min-h-screen">
        {/* Soft Glowing Geometric Abstract Ambient Shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -right-24 w-96 h-96 bg-indigo-400/25 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />
          {/* Subtle geometric dot grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />
        </div>

        {/* Top Brand Tagline */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.companyLogo ? (
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shadow-lg">
                <img
                  src={settings.companyLogo}
                  alt={settings.companyName || 'Logo'}
                  className="w-full h-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-400 to-purple-300 p-0.5 shadow-lg shadow-indigo-900/40">
                <div className="w-full h-full bg-[#312e81] rounded-[10px] flex items-center justify-center font-black text-base text-white">
                  {settings.companyName ? settings.companyName.charAt(0) : 'i'}
                </div>
              </div>
            )}
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{settings.companyName || 'iSysware'}</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20">
                  CRM System
                </span>
              </h2>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="font-semibold">v3.4 Enterprise</span>
          </div>
        </div>

        {/* Center: Modern Floating 3D-Angled CRM Dashboard Showcase Card */}
        <div className="relative z-10 my-8 lg:my-auto flex flex-col items-center justify-center">
          <div className="w-full max-w-lg relative group">
            {/* Ambient Backlight Behind Showcase Card */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-pink-500/30 via-indigo-400/40 to-purple-600/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />

            {/* The Main 3D Angled Glass Dashboard Container */}
            <div className="relative rounded-2xl sm:rounded-3xl bg-slate-950/80 backdrop-blur-xl border border-white/20 p-5 sm:p-6 shadow-2xl space-y-4 transform transition-all duration-300 hover:scale-[1.01]">
              {/* Showcase Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-mono font-medium text-slate-400 ml-2">live-crm-pipeline.isysware</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Active Session
                </span>
              </div>

              {/* Showcase Top Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Metric 1: Visitors / Leads */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Leads</p>
                  <p className="text-xl font-black text-white mt-0.5">20.3K</p>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 mt-0.5">
                    <TrendingUp className="w-3 h-3" /> +14.8% this week
                  </span>
                </div>

                {/* Metric 2: Conversion Rate */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Yield Rate</p>
                  <p className="text-xl font-black text-indigo-300 mt-0.5">79.4%</p>
                  <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-0.5 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Industry Leading
                  </span>
                </div>

                {/* Metric 3: Active Revenue */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pipeline Value</p>
                  <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">Rs. 8.4M</p>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">SaaS + Projects</span>
                </div>
              </div>

              {/* Mini SVG Revenue Trend Line Chart */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    Revenue &amp; Deal Flow Velocity
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">+28.5% Growth</span>
                </div>

                <div className="h-20 w-full relative pt-1">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 70" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                      d="M 0 50 Q 50 45, 90 30 T 170 35 T 230 15 T 300 8 L 300 70 L 0 70 Z"
                      fill="url(#chartGrad)"
                    />
                    {/* Glowing Stroke */}
                    <path
                      d="M 0 50 Q 50 45, 90 30 T 170 35 T 230 15 T 300 8"
                      fill="none"
                      stroke="#a5b4fc"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Highlight Pulsing Node at end */}
                    <circle cx="300" cy="8" r="4.5" fill="#38bdf8" />
                    <circle cx="300" cy="8" r="8" fill="#38bdf8" opacity="0.3" className="animate-ping" />
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span className="text-white font-bold">Week 4 (Peak)</span>
                </div>
              </div>

              {/* Deal Pipeline Status Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Closed Won (PKR 350k)
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Live Demo Completed
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <CalendarCheck className="w-3 h-3" /> 18 Follow-Ups Today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Carousel / Testimonials */}
        <div className="relative z-10 pt-6 border-t border-white/15 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
              {currentSlide.tag}
            </span>

            {/* Navigation Dots & Arrows */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                {SHOWCASE_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      activeSlide === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveSlide(prev => (prev === 0 ? SHOWCASE_SLIDES.length - 1 : prev - 1))}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSlide(prev => (prev + 1) % SHOWCASE_SLIDES.length)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1 animate-fadeIn">
            <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
              {currentSlide.title}
            </h3>
            <p className="text-xs sm:text-sm text-indigo-100/80 leading-relaxed max-w-xl">
              {currentSlide.desc}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDE: CLEAN, MINIMALIST AUTHENTICATION FORM (CRISP SURFACE)         */}
      {/* ========================================================================= */}
      <div className="lg:w-1/2 xl:w-[48%] bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6 my-auto">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>{settings.companyName || 'iSysware'} CRM</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome back!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Please enter your credentials or choose your assigned role to access your personalized CRM workspace.
            </p>
          </div>

          {/* Role Selection Tabs / Segmented Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  1
                </span>
                <span>Select Portal Role</span>
              </label>

              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                {selectedRole}
              </span>
            </div>

            {/* Clean Segmented Role Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {ROLE_PRESETS.map(preset => {
                const isSelected = selectedRole === preset.role;
                const IconComponent = preset.icon;

                return (
                  <button
                    key={preset.role}
                    type="button"
                    onClick={() => handleSelectRole(preset.role)}
                    className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className="text-[10px] leading-tight truncate w-full">{preset.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Inline Red Error Alert Box */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-rose-400 hover:text-rose-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Email Address Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. superadmin@crm.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password
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
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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

            {/* Options Row: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Action Button: Gradient Purple Login */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:via-indigo-600 hover:to-purple-500 text-white font-bold text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition-all disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to CRM</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick 1-Click Demo Testing Toolbar */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Quick 1-Click Demo Portals:
              </span>
              <span className="text-[10px] text-slate-400">Auto-fills credentials</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ROLE_PRESETS.map(p => (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => handleQuickFill(p.role, p.email, p.pass)}
                  className="text-xs bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <p.icon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{p.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Security Notice */}
          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Role-Based Access Control &amp; Session Persistence Active</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Credentials Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base">Account Credentials Help</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  <span className="text-indigo-600 dark:text-indigo-300 font-semibold">superadmin@crm.com / Admin@123</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Admin:</span>
                  <span className="text-indigo-600 dark:text-indigo-300 font-semibold">admin@crm.com / Admin@123</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Manager:</span>
                  <span className="text-indigo-600 dark:text-indigo-300 font-semibold">manager@crm.com / Manager@123</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Team Lead:</span>
                  <span className="text-indigo-600 dark:text-indigo-300 font-semibold">teamlead@crm.com / Lead@123</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Employee:</span>
                  <span className="text-indigo-600 dark:text-indigo-300 font-semibold">employee@crm.com / Emp@123</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
