import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { Mail, ShieldAlert, KeyRound, CheckCircle, XCircle, ArrowRight, ArrowLeft, RefreshCw, Home, Terminal } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import AnimatedBackground from '../components/AnimatedBackground';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Password, 4: Result
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultStatus, setResultStatus] = useState({ success: false, message: '' });

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 1. Submit Email to get OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide a valid registered email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      // Advance to next step and set cooldown
      setStep(2);
      setCooldown(60);
    } catch (err) {
      setError(err.message || 'Recovery request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit OTP to verify
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Reset Password
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in both key fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Keys do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, password }),
      });
      setResultStatus({ success: true, message: data.message || 'Access key updated successfully.' });
      setStep(4);
    } catch (err) {
      setResultStatus({ success: false, message: err.message || 'Failed to update access key.' });
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Animated Background */}
      <AnimatedBackground />

      {/* Extreme Neon Glow Orbs - LED Brightness */}
      <div className="absolute top-[20%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none -z-5 animate-pulse"></div>
      <div className="absolute top-[60%] left-[30%] -translate-x-[50%] -translate-y-[50%] w-[350px] h-[350px] rounded-full bg-fuchsia-500/10 blur-[110px] pointer-events-none -z-5 animate-pulse"></div>
      <div className="absolute top-[50%] left-[70%] -translate-x-[50%] -translate-y-[50%] w-[380px] h-[380px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none -z-5 animate-pulse"></div>

      <div className="w-full max-w-md relative z-10 transition-all duration-300">
        
        {/* LED Lights Panel Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-slate-300 text-[10px] font-bold tracking-widest uppercase mb-4 shadow-[0_0_10px_rgba(255,255,255,0.05)]">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            <span>Node Recovery System</span>
          </div>

          {/* LED Status Bar */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-full mb-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Status Lights:</span>
            <div className="flex gap-2">
              {/* LED 1: Email */}
              <div 
                className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${
                  step === 1 ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee,0_0_4px_#22d3ee]' : 
                  step > 1 ? 'bg-cyan-600 shadow-[0_0_4px_#0891b2]' : 'bg-slate-800'
                }`}
                title="Email Verification"
              ></div>
              {/* LED 2: OTP Verification */}
              <div 
                className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${
                  step === 2 ? 'bg-fuchsia-400 shadow-[0_0_12px_#e879f9,0_0_4px_#e879f9]' : 
                  step > 2 ? 'bg-fuchsia-600 shadow-[0_0_4px_#c084fc]' : 'bg-slate-800'
                }`}
                title="OTP Decryption"
              ></div>
              {/* LED 3: Reset Key */}
              <div 
                className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${
                  step === 3 ? 'bg-emerald-400 shadow-[0_0_12px_#34d399,0_0_4px_#34d399]' : 
                  step > 3 ? 'bg-emerald-600 shadow-[0_0_4px_#059669]' : 'bg-slate-800'
                }`}
                title="Update Credentials"
              ></div>
            </div>
          </div>

          <h2 className="text-3xl font-black text-center tracking-tight bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            Reset Password
          </h2>
        </div>

        {/* LED Glow Container */}
        <GlassCard className="border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-2xl bg-slate-950/20">
          
          {/* Neon Top Laser Line */}
          <div className={`absolute top-0 left-0 right-0 h-[2.5px] transition-all duration-500 ${
            step === 1 ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]' : 
            step === 2 ? 'bg-fuchsia-400 shadow-[0_0_12px_#e879f9]' : 
            step === 3 ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 
            resultStatus.success ? 'bg-green-400 shadow-[0_0_12px_#4ade80]' : 'bg-red-500 shadow-[0_0_12px_#f87171]'
          }`}></div>

          {/* STEP 1: ENTER EMAIL */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-5 animate-none">
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Provide your registered email address below. The security module will generate and dispatch a 6-digit access code (OTP) via Resend.
              </p>
              
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Secure Email Address
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all text-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                    placeholder="name@company.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/5 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2.5 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-[0.98] text-xs cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Dispatched Request...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Verification Code</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: ENTER OTP */}
          {step === 2 && (
            <form onSubmit={handleOtpSubmit} className="space-y-5 animate-pulse-glow">
              <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-xl border border-slate-800 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                <p className="text-[10px] text-slate-400 font-medium">
                  We've transmitted a recovery key to <span className="text-cyan-400 font-bold tracking-wider">{email}</span>. 
                  Please retrieve it and enter below.
                </p>
                <span className="text-[11px] leading-relaxed text-slate-350">
                  Verification OTP generated via Resend API. The code will expire in 5 minutes.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  6-Digit Decryption Code
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-fuchsia-400 transition-colors">
                    <KeyRound className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400/30 tracking-[0.4em] font-mono text-center text-lg transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] focus:shadow-[0_0_15px_rgba(232,121,249,0.2)]"
                    placeholder="000000"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/5 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2.5 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setError(''); setStep(1); }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-400 font-semibold py-2.5 rounded-xl transition-all hover:bg-slate-800 hover:text-slate-200 text-xs cursor-pointer"
                  disabled={loading}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Edit Email</span>
                </button>
                
                <button
                  type="submit"
                  className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:shadow-[0_0_20px_rgba(217,70,239,0.5)] active:scale-[0.98] text-xs cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verify Code</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: RESET PASSWORD */}
          {step === 3 && (
            <form onSubmit={handlePasswordReset} className="space-y-5 animate-none">
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Authorization verified. Please formulate a strong access key to reset your session.
              </p>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  New Private Access Key
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all text-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] focus:shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                  placeholder="Create new password"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Verify Access Key
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all text-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] focus:shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                  placeholder="Re-enter password"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/5 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2.5 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-[0.98] text-xs cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Commit New Credentials</span>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: FEEDBACK & RESPONSE */}
          {step === 4 && (
            <div className="text-center py-4 space-y-6 animate-none">
              
              {resultStatus.success ? (
                <div className="space-y-4">
                  {/* Glowing LED Success Circle */}
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 shadow-[0_0_30px_#22c55e,0_0_10px_rgba(34,197,94,0.3)] animate-pulse">
                      <CheckCircle className="h-12 w-12" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Reset Successful</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    {resultStatus.message} You can now log into your console using the new secure credentials.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Glowing LED Failure Circle */}
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 shadow-[0_0_30px_#ef4444,0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
                      <XCircle className="h-12 w-12" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Reset Failed</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    {resultStatus.message} The recovery sequence encountered a terminal exception. Please try again.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/60">
                {resultStatus.success ? (
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] text-xs"
                  >
                    <span>Proceed to Log In</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <button
                    onClick={() => { setError(''); setStep(1); }}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-all text-xs"
                  >
                    <span>Retry Reset Sequence</span>
                  </button>
                )}

                {/* Direct Redirection to Home Page */}
                <Link
                  to="/"
                  className="w-full flex items-center justify-center gap-2 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 font-semibold py-2.5 rounded-xl transition-all text-xs"
                >
                  <Home className="h-4 w-4" />
                  <span>Return to Homepage (Home)</span>
                </Link>
              </div>
            </div>
          )}

        </GlassCard>
        
        {/* Back Link (Only shown before final status step) */}
        {step < 4 && (
          <p className="text-center mt-6">
            <Link to="/login" className="text-xs text-slate-505 hover:text-slate-400 transition-colors font-semibold">
              &larr; Return to Authentication Console
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
