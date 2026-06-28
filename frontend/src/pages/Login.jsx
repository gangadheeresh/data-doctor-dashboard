import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DatabaseZap, Loader2, AlertCircle, Eye, EyeOff, User, Lock, Sparkles, Terminal } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await login('admin', 'admin123');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed. Make sure Flask is running.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex relative overflow-hidden font-sans">

      {/* Decorative Glow Orbs - Colorful & Moving */}
      <div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/15 blur-[130px] pointer-events-none -z-5 animate-float-slow-1"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-pink-500/15 to-indigo-500/10 blur-[120px] pointer-events-none -z-5 animate-float-slow-2"></div>
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[110px] pointer-events-none -z-5 animate-float-slow-3"></div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 min-h-screen z-10">
        
        {/* Left Panel: Showcase (Only on LG screens and up) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 border-r border-slate-900 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
          
          {/* Top: Branding */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <DatabaseZap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider text-white">DATA DOCTOR</span>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none">DD-Analytics</p>
            </div>
          </div>

          {/* Middle: Rich Copy & Interactive Mockup */}
          <div className="relative z-10 my-auto py-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-wider uppercase mb-6">
              <Sparkles className="h-3 w-3" />
              <span>AI-Driven Platform</span>
            </div>
            
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Uncover the stories <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                hidden in your data.
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-md">
              Clean messy datasets, forecast future trends, and generate production-ready PDF reports with our enterprise AI analytics suite.
            </p>

            {/* Showcase Cards Container */}
            <div className="space-y-4 max-w-md">
              {/* Feature 1 */}
              <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl hover:border-slate-800 transition-all flex gap-4 group">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-purple-400 group-hover:text-purple-300 transition-colors h-11 w-11 flex items-center justify-center shrink-0 shadow-md">
                  <DatabaseZap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Intelligent Data Cleaning</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Automatic detection of missing values, anomalies, and duplicates.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl hover:border-slate-800 transition-all flex gap-4 group">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 group-hover:text-indigo-300 transition-colors h-11 w-11 flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Advanced AI Chat Query</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Ask questions in natural language and get immediate SQL generation & analysis.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl hover:border-slate-800 transition-all flex gap-4 group">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-pink-400 group-hover:text-pink-300 transition-colors h-11 w-11 flex items-center justify-center shrink-0 shadow-md">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Predictive Forecasting</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Deploy ML models to forecast future metrics with one-click visualization.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Footer Info */}
          <div className="relative z-10 flex justify-between items-center text-[10px] text-slate-500 font-medium">
            <span>© 2026 Data Doctor Inc.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Terms</a>
            </div>
          </div>
        </div>

        {/* Right Panel: Login Card Console (Centered Form) */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center p-6 md:p-12 relative">
          <div className="w-full max-w-md relative">
            
            {/* Top Logo - Only visible on Mobile/Tablet */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-3 shadow-md">
                <DatabaseZap className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  DATA DOCTOR
                </span>
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Enterprise Analytics Portal</p>
              
              <div className="text-[10px] font-black uppercase tracking-widest mt-3 rainbow-animated-text">
                an application by ganga dheeresh
              </div>
            </div>

            {/* Main Form Title */}
            <div className="mb-8 hidden lg:block">
              <h2 className="text-3xl font-black tracking-tight text-white">Welcome back</h2>
              <p className="text-slate-400 text-sm mt-1.5 font-medium">Please enter your credentials to access your workspace.</p>
            </div>

            {/* Glass Card form container */}
            <div className="p-8 rounded-2xl bg-slate-950/5 border border-white/15 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl relative overflow-hidden">
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Username Input */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Username / Email
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <User className="h-4.5 w-4.5" />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm shadow-inner"
                      placeholder="Enter your username"
                      disabled={loading || demoLoading}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <Lock className="h-4.5 w-4.5" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3.5 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm shadow-inner"
                      placeholder="••••••••"
                      disabled={loading || demoLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                      disabled={loading || demoLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 bg-red-500/5 border border-red-500/10 text-red-400 rounded-xl text-xs flex items-center gap-2.5 animate-pulse-glow">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] text-sm mt-6 cursor-pointer animate-none"
                  disabled={loading || demoLoading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
                
                {/* 1-Click Guest Login */}
                <div className="pt-2 border-t border-slate-800/60 mt-4">
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    className="w-full flex items-center justify-center gap-2 bg-white/[0.02] hover:bg-white/[0.06] text-indigo-400 border border-white/[0.08] hover:border-indigo-500/30 font-medium py-3 rounded-xl transition-all text-xs cursor-pointer"
                    disabled={loading || demoLoading}
                  >
                    {demoLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        <span>Entering Workspace...</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="h-4 w-4 text-indigo-400" />
                        <span>Quick Guest Access (1-Click)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Provision Account */}
              <p className="text-center text-xs text-slate-500 mt-6 font-medium">
                New data explorer?{' '}
                <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors underline decoration-indigo-500/30 underline-offset-4">
                  Provision account
                </Link>
              </p>
            </div>
            
            {/* Back Button */}
            <p className="text-center mt-6">
              <Link to="/" className="text-xs text-slate-500 hover:text-slate-400 transition-colors font-medium">
                &larr; Return to main landing
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
