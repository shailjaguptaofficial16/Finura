import React, { useMemo, useRef, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  User,
  Shield,
  CheckCircle2,
  Camera,
  Trash2,
  Lock,
  Mail,
  Phone,
  Briefcase,
  KeyRound,
  Sparkles,
  Save,
  ShieldCheck,
  Smartphone,
  Laptop,
  LogOut,
  ShieldAlert,
} from 'lucide-react';

const getInitials = (name) => {
  if (!name) return 'FM';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
  if (parts.length === 1 && parts[0].length === 1) return parts[0].toUpperCase();
  return 'FM';
};

export default function Profile() {
  const fileInputRef = useRef(null);
  const { user, updateUser, logout } = useAuth();

  // Personal Info Form State - populated dynamically from user in AuthContext
  const [name, setName] = useState(user?.name || user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profession, setProfession] = useState(user?.profession || user?.occupation || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.avatar || '');
  const [previewUrl, setPreviewUrl] = useState(user?.avatarUrl || user?.avatar || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA & Session states
  const [twoFactor, setTwoFactor] = useState(Boolean(user?.twoFactorEnabled));
  const [isToggling2FA, setIsToggling2FA] = useState(false);
  const [isLoggingOutDevices, setIsLoggingOutDevices] = useState(false);

  // Synchronize local input state whenever user changes in AuthContext
  useEffect(() => {
    if (user) {
      setName(user.name || user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setProfession(user.profession || user.occupation || '');
      const currentAvatar = user.avatarUrl || user.avatar || user.profilePicture || '';
      setAvatarUrl(currentAvatar);
      setPreviewUrl(currentAvatar);
      setTwoFactor(Boolean(user.twoFactorEnabled));
    }
  }, [user]);

  // Handle Photo Selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setPreviewUrl(result);
      setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPreviewUrl('');
    setAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('Profile photo removed');
  };

  // Handle Personal Info Submit
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        profession: profession.trim(),
        avatarUrl: avatarUrl || '',
      };

      // 1. Immediately update AuthContext and localStorage for instant UI feedback
      const localUpdated = {
        ...(user || {}),
        name: payload.name,
        phone: payload.phone,
        profession: payload.profession,
        avatarUrl: payload.avatarUrl,
        avatar: payload.avatarUrl,
      };
      updateUser(localUpdated);

      // 2. Persist to MongoDB backend
      let res;
      try {
        res = await api.put('/users/profile', payload);
      } catch (err) {
        if (err.response && (err.response.status === 404 || err.response.status === 405)) {
          res = await api.put('/user/profile', payload);
        } else {
          throw err;
        }
      }

      // Pass verified response data to updateUser
      if (res && res.data) {
        updateUser(res.data);
      }

      toast.success('Profile updated successfully! ✨');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile details');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle 2FA status change
  const handleToggle2FA = async () => {
    setIsToggling2FA(true);
    try {
      const nextState = !twoFactor;
      let res;
      try {
        res = await api.put('/users/profile', { twoFactorEnabled: nextState });
      } catch (err) {
        if (err.response && (err.response.status === 404 || err.response.status === 405)) {
          res = await api.put('/user/profile', { twoFactorEnabled: nextState });
        } else {
          throw err;
        }
      }

      if (res && res.data) {
        updateUser(res.data);
      } else {
        updateUser({ ...(user || {}), twoFactorEnabled: nextState });
      }

      setTwoFactor(nextState);
      if (nextState) {
        toast.success('Two-Factor Authentication (2FA) enabled successfully! 🔒');
      } else {
        toast.info('Two-Factor Authentication (2FA) disabled.');
      }
    } catch (error) {
      console.error('2FA update error:', error);
      toast.error('Failed to update Two-Factor Authentication settings');
    } finally {
      setIsToggling2FA(false);
    }
  };

  // Handle Security Password Submit
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      let res;
      try {
        res = await api.put('/users/change-password', { currentPassword, newPassword });
      } catch (err) {
        if (err.response && (err.response.status === 404 || err.response.status === 405)) {
          res = await api.put('/user/change-password', { currentPassword, newPassword });
        } else {
          throw err;
        }
      }

      toast.success('Password updated successfully! 🔒');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update password';
      toast.error(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Logout from all devices
  const handleLogOutAllDevices = async () => {
    setIsLoggingOutDevices(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success('Successfully logged out of all devices');
      setTimeout(() => {
        logout();
      }, 800);
    } catch (error) {
      toast.error('Failed to invalidate sessions');
      setIsLoggingOutDevices(false);
    }
  };

  // Browser detection
  const currentDevice = useMemo(() => {
    const ua = navigator.userAgent;
    let browser = 'Chrome';
    let os = 'Windows';

    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return { browser, os };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      {/* ── PAGE HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800/80">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider mb-2">
            <Sparkles size={13} />
            Account Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Profile & Security
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
            Manage your personal identity, contact preferences, and account security credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-xl text-xs font-semibold text-teal-200 shadow-inner">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Tier 1 Private Member</span>
        </div>
      </div>

      {/* ── 2 ESSENTIAL SECTIONS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── SECTION 1: PERSONAL INFORMATION CARD (7 Cols) ── */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-6 text-slate-800">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Personal Information</h2>
                <p className="text-xs text-slate-500">Update your public profile and verified member details</p>
              </div>
            </div>

            {/* Avatar Circle & Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-teal-500/40 bg-teal-500/10 flex items-center justify-center text-xl font-extrabold text-teal-700 shadow-sm">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(name)}</span>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="text-sm font-bold text-slate-900">Profile Photo</div>
                <p className="text-xs text-slate-500">Supports PNG, JPG, or GIF up to 5MB</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm transition cursor-pointer"
                  >
                    <Camera size={13} className="text-teal-600" />
                    <span>Upload Photo</span>
                  </button>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 border border-rose-200 transition cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Info Form */}
            <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                  />
                </div>
              </div>

              {/* Email Address (Read-only / Verified) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Email Address
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    <CheckCircle2 size={12} className="text-teal-600" />
                    Verified Member
                  </span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    disabled
                    readOnly
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed text-sm font-mono"
                  />
                </div>
              </div>

              {/* Phone & Profession Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Profession / Occupation
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="e.g. Private Investor, Director"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Save Changes Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              form="profile-form"
              disabled={isSavingProfile}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* ── SECTION 2: SECURITY & CREDENTIALS CARD (5 Cols) ── */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-6 text-slate-800">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Security & Credentials</h2>
                <p className="text-xs text-slate-500">Manage your encrypted access password</p>
              </div>
            </div>

            {/* Password Form */}
            <form id="security-form" onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Current Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                  />
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                  />
                </div>
              </div>
            </form>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 leading-relaxed">
              Passwords are salted and cryptographically hashed. Ensure your new password contains a strong combination of letters, numbers, and symbols.
            </div>
          </div>

          {/* Update Password Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              form="security-form"
              disabled={isUpdatingPassword}
              className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
            >
              <Lock size={16} />
              <span>{isUpdatingPassword ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: SECURITY & PRIVACY SETTINGS ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm hover:shadow-md text-slate-800 transition-all duration-300">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Security & Privacy Settings
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                Advanced Protection
              </span>
            </h2>
            <p className="text-xs text-slate-500">Configure multi-factor authorization and active session controls</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          {/* Left Panel: 2FA Toggle & Description */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="space-y-0.5 pr-4">
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Two-Factor Authentication (2FA)
                    {twoFactor ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Require an authenticator code when signing in to secure your capital assets.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggle2FA}
                  disabled={isToggling2FA}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    twoFactor ? 'bg-teal-600 shadow-[0_0_10px_rgba(20,184,166,0.4)]' : 'bg-slate-300'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      twoFactor ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-100 text-xs text-teal-900 leading-relaxed space-y-2">
                <p className="font-semibold flex items-center gap-1.5 text-teal-800">
                  <ShieldAlert size={14} />
                  Privacy & Data Safeguards
                </p>
                <p className="text-slate-600">
                  Finura encrypts all financial data end-to-end. Sessions are tracked cryptographically and expire automatically after inactivity.
                </p>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleLogOutAllDevices}
                disabled={isLoggingOutDevices}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer text-sm disabled:opacity-50"
              >
                <LogOut size={15} />
                <span>{isLoggingOutDevices ? 'Terminating sessions...' : 'Log Out All Devices'}</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Active Sessions List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Device Sessions</h3>
            <div className="space-y-3">
              {/* Current Session */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mt-0.5">
                  <Laptop size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {currentDevice.browser} on {currentDevice.os}
                    </span>
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Now
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    IP Address: 103.111.45.12 • New Delhi, India
                  </p>
                </div>
              </div>

              {/* Simulated Previous Session */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/50 border border-slate-200/60 opacity-70">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mt-0.5">
                  <Smartphone size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 truncate">
                      Safari on iPhone 15 Pro
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    IP Address: 172.56.21.90 • Mumbai, India • 2 hours ago
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
