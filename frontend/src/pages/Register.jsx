import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DatabaseZap, Loader2, AlertCircle, Eye, EyeOff, User, Mail, Lock, Sparkles } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await register(username, email, password, phoneNumber);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different username/email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Decorative Glow Orbs - Colorful & Moving */}
      <div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/15 blur-[130px] pointer-events-none -z-5 animate-float-slow-1"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-pink-500/15 to-indigo-500/10 blur-[120px] pointer-events-none -z-5 animate-float-slow-2"></div>
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[110px] pointer-events-none -z-5 animate-float-slow-3"></div>

      <div className="w-full max-w-lg relative z-10 transition-all duration-300">
        
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold tracking-widest uppercase mb-4 animate-pulse-glow">
            <Sparkles className="h-3 w-3" />
            <span>Provisioning Terminal</span>
          </div>

          <div className="relative mb-3">
            <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-xl animate-pulse"></div>
            <div className="relative p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-purple-400 animate-float shadow-2xl">
              <DatabaseZap className="h-9 w-9 text-purple-400" />
            </div>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              DD (Data Doctor)
            </span>
          </h2>
          <div className="text-[10px] font-black uppercase tracking-widest mt-2 rainbow-animated-text">
            an application by ganga dheeresh
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">Provision user credentials for clean data analysis</p>
        </div>

        {/* Register Form Card */}
        <GlassCard className="border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Subtle top light bar */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500 to-indigo-500"></div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Data Account Name
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-3 text-slate-500 group-focus-within:text-purple-400 transition-colors">
                  <User className="h-4.5 w-4.5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm shadow-inner"
                  placeholder="Choose username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Email Address
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-3 text-slate-500 group-focus-within:text-purple-400 transition-colors">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-10 px-4 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm shadow-inner"
                  placeholder="name@company.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* WhatsApp Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                WhatsApp Phone Number
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-3 text-slate-500 group-focus-within:text-purple-400 transition-colors">
                  <span className="font-serif text-lg leading-none italic block -mt-1 ml-0.5">#</span>
                </span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-10 px-4 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm shadow-inner"
                  placeholder="+1234567890"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Private Access Key
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-3 text-slate-500 group-focus-within:text-purple-400 transition-colors">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm shadow-inner"
                  placeholder="Create password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-350 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Verify Key
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-3 text-slate-500 group-focus-within:text-purple-400 transition-colors">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm shadow-inner"
                  placeholder="Re-enter password"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-500/5 border border-red-500/10 text-red-400 rounded-xl text-xs flex items-center gap-2.5 animate-pulse-glow">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] text-sm mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                <span>Provision Terminal Credentials</span>
              )}
            </button>
          </form>

          {/* Redirect to Login */}
          <p className="text-center text-xs text-slate-500 mt-6 font-medium">
            Already have credentials?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors underline decoration-purple-500/30 underline-offset-4">
              Establish session
            </Link>
          </p>
        </GlassCard>
        
        {/* Back Link */}
        <p className="text-center mt-6">
          <Link to="/" className="text-xs text-slate-650 hover:text-slate-450 transition-colors font-medium">
            &larr; Return to main landing
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
