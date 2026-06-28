import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import { Settings, Loader2, CheckCircle2, AlertCircle, User } from 'lucide-react';

const SettingsPage = () => {
  const { user, settings, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Profile forms
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(settings?.phone_number || user?.phone_number || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState(settings?.profile_pic || '');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Sync user profile values when loaded asynchronously
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      if (user.phone_number) setPhoneNumber(user.phone_number);
    }
    if (settings) {
      setProfilePic(settings.profile_pic || '');
    }
  }, [user, settings]);



  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        username,
        email,
        ...(password && { password }),
        theme,
        profile_pic: profilePic,
        phone_number: phoneNumber
      };

      await updateProfile(payload);
      setSuccess('Settings updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white m-0">Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage user account credentials and configure API integrations</p>
      </div>

      {success && (
        <div className="max-w-2xl p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center gap-2.5 animate-pulse-glow">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="max-w-2xl p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Left Column: Profile settings */}
        <GlassCard>
          <div className="flex items-center gap-2.5 mb-4 border-b border-slate-800/60 pb-3">
            <User className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">Account Credentials</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Profile Picture URL
              </label>
              <input
                type="url"
                value={profilePic}
                onChange={(e) => setProfilePic(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="https://example.com/avatar.png"
                disabled={loading}
              />
            </div>

            <div className="border-t border-slate-800/50 pt-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Change Password</p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Leave blank to keep current"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Re-enter password"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-850 disabled:text-slate-600 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg hover:shadow-indigo-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Account Info</span>
              )}
            </button>
          </form>
        </GlassCard>

        {/* Right Column: theme settings */}
        <div className="space-y-6">
          <GlassCard>
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-800/60 pb-3">
              <Settings className="h-5 w-5 text-pink-400" />
              <h3 className="text-sm font-semibold text-slate-200">General Interface</h3>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Toggle Theme</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Toggle between the soft blue Light theme and the full-black Midnt theme.</p>
              </div>
              <button
                onClick={toggleTheme}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-colors"
              >
                Switch to {theme === 'midnight' ? 'Midnt' : 'Light'}
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
