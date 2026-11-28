import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Key,
  Camera,
  Upload,
  Trash2,
  Sparkles,
  Link as LinkIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Building2,
  Check
} from 'lucide-react';
import { ModalShell, FormField, Input, Select, Button, Badge } from '../ui';
import { UserRole } from '../../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUser, changeMyPassword, resetUserPassword, teams } = useCRM();

  // Profile fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [imageError, setImageError] = useState(false);
  const [teamId, setTeamId] = useState('');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or currentUser changes
  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setAvatar(currentUser.avatar || '');
      setTeamId(currentUser.teamId || '');
      setImageError(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, currentUser]);

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'Super Admin';

  // Handle local image upload via FileReader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        setImageError(false);
        setErrorMessage('');
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Generate random avatar using Dicebear
  const handleGenerateDicebear = () => {
    const randomSeed = `${(name.trim() || 'user').toLowerCase()}-${Math.random().toString(36).substring(2, 7)}`;
    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(randomSeed)}`;
    setAvatar(url);
    setImageError(false);
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    setImageError(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
    if (score <= 4) return { label: 'Good', color: 'bg-amber-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  const displayAvatar =
    avatar.trim() ||
    currentUser.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim() || 'admin')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid email address is required.');
      return;
    }

    // Password validation if updating password
    const isUpdatingPassword = Boolean(newPassword || confirmPassword || currentPassword);
    if (isUpdatingPassword) {
      if (!newPassword) {
        setErrorMessage('Please enter your new password.');
        return;
      }
      if (newPassword.length < 8) {
        setErrorMessage('New password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        setErrorMessage('New password must contain at least one uppercase letter (A-Z).');
        return;
      }
      if (!/[a-z]/.test(newPassword)) {
        setErrorMessage('New password must contain at least one lowercase letter (a-z).');
        return;
      }
      if (!/[0-9]/.test(newPassword)) {
        setErrorMessage('New password must contain at least one number (0-9).');
        return;
      }
      if (!/[^A-Za-z0-9]/.test(newPassword)) {
        setErrorMessage('New password must contain at least one special character (e.g. !@#$%^&*).');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirmation do not match.');
        return;
      }
      if (!isSuperAdmin && !currentPassword) {
        setErrorMessage('Please enter your current password to authorize password change.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Update Profile Details in PostgreSQL
      const assignedTeam = teams.find(t => t.id === teamId);
      const updateResult = await updateUser({
        ...currentUser,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        avatar: avatar.trim() || displayAvatar,
        teamId: teamId || undefined,
        teamName: assignedTeam?.name || undefined
      });

      if (!updateResult.success) {
        setErrorMessage(updateResult.error || 'Failed to update profile details.');
        setIsSubmitting(false);
        return;
      }

      // 2. Update Password if specified
      if (isUpdatingPassword) {
        let pwdResult: { success: boolean; error?: string };

        if (currentPassword) {
          pwdResult = await changeMyPassword(currentPassword, newPassword);
        } else if (isSuperAdmin) {
          pwdResult = await resetUserPassword(currentUser.id, newPassword);
        } else {
          pwdResult = { success: false, error: 'Current password is required.' };
        }

        if (!pwdResult.success) {
          setErrorMessage(pwdResult.error || 'Profile saved, but password change failed.');
          setIsSubmitting(false);
          return;
        }
      }

      setSuccessMessage('Profile and account credentials updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while saving profile.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#2563EB] flex items-center justify-center shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white leading-tight">
              Profile & Account Settings
            </h3>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">
              Update your identity details, avatar, and security credentials
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-[#64748B] dark:text-slate-400">
            Account: <span className="font-semibold text-[#0F172A] dark:text-slate-200">{currentUser.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-profile-modal-form"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              leftIcon={isSubmitting ? undefined : <Check className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="user-profile-modal-form" onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Feedback Banners */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* SECTION 1: PROFILE PICTURE & AVATAR */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-[#E5EAF1] dark:border-slate-700 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Profile Picture</span>
            </label>
            {avatar.trim() && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                Custom Avatar Set
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Avatar Preview */}
            <div className="relative shrink-0">
              {displayAvatar && !imageError ? (
                <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-[#2563EB]/40 shadow-sm bg-white dark:bg-slate-800 flex items-center justify-center">
                  <img
                    src={displayAvatar}
                    alt={name || 'Avatar Preview'}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#2563EB] text-white font-bold text-2xl flex items-center justify-center ring-2 ring-blue-400 shadow-sm">
                  {(name.trim() || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload custom image"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md hover:bg-[#1D4ED8] transition-transform active:scale-90 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 w-full space-y-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Upload Image
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateDicebear}
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                >
                  Random Avatar
                </Button>

                {avatar && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  >
                    Reset
                  </Button>
                )}
              </div>

              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="url"
                  value={avatar}
                  onChange={e => {
                    setAvatar(e.target.value);
                    setImageError(false);
                  }}
                  placeholder="Or paste direct image URL (https://...)"
                  className="pl-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: IDENTITY DETAILS */}
        <div className="space-y-3.5">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
            Identity Details
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Full Name" required>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Asad Khan"
                  className="pl-8"
                />
              </div>
            </FormField>

            <FormField label="Email Address" required>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. superadmin@isysware.com"
                  className="pl-8 font-mono"
                />
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Phone Number">
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                  placeholder="03001234567 (11 digits)"
                  className="pl-8 font-mono"
                />
              </div>
            </FormField>

            <FormField label="Assigned Team / Department">
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10" />
                <Select
                  value={teamId}
                  onChange={e => setTeamId(e.target.value)}
                  className="pl-8"
                >
                  <option value="">Unassigned / Corporate HQ</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.code ? `(${t.code})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
            </FormField>
          </div>
        </div>

        {/* SECTION 3: ROLE & PERMISSION CONTEXT */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Assigned Security Role</span>
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#2563EB] dark:text-blue-400">
              {currentUser.role}
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
            {isSuperAdmin
              ? 'Root Authority: Full global oversight, security configuration, user management, and canonical audit visibility.'
              : `Operational Tier: Governed by enterprise RBAC policies and organizational scope.`}
          </p>
        </div>

        {/* SECTION 4: SECURITY & PASSWORD CHANGE */}
        <div className="space-y-3.5 pt-4 border-t border-[#E5EAF1] dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Change Account Password</span>
            </span>
            <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-medium">
              Leave empty to keep current password
            </span>
          </div>

          {!isSuperAdmin && (
            <FormField label="Current Password" required={Boolean(newPassword || confirmPassword)}>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="pl-8 pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </FormField>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField
              label="New Password"
              helperText="Min 8 characters, uppercase, lowercase, number, and symbol"
            >
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 chars, e.g. Pass@123)"
                  className="pl-8 pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </FormField>

            <FormField label="Confirm New Password">
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="pl-8 pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </FormField>
          </div>

          {/* Password strength meter if user is typing a new password */}
          {newPassword && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#64748B] dark:text-slate-400">Password Strength:</span>
                <span className="font-semibold text-[#0F172A] dark:text-white">{pwdStrength.label}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                  style={{ width: pwdStrength.width }}
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-rose-500 font-medium">Passwords do not match.</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match!
                </p>
              )}
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  );
};
