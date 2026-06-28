import React from 'react';
import { Link } from 'react-router-dom';
import { DatabaseZap, Sparkles, Brain, Cpu, BarChart3, LineChart, MessageSquare, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between overflow-hidden relative">

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 h-20 flex items-center justify-between border-b border-slate-900/60">
        <div className="flex items-center gap-2">
          <DatabaseZap className="h-7 w-7 text-indigo-500 animate-float" />
          <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            DD (Data Doctor)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row items-center gap-12 py-16 lg:py-24">
        {/* Left Col - Copy */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold animate-pulse-glow">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Introducing Next-Gen Analytics</span>
          </div>

          <div className="text-[10px] font-black uppercase tracking-widest mt-4 mb-2 rainbow-animated-text block">
            an application by ganga dheeresh
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white">
            Upload ANY Dataset. <br />
            Get <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Instant AI Insights.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            No fixed columns. No complex configurations. Our engine automatically parses dates, categories, and numbers to build cleaning suggestions, custom Plotly charts, forecasts, and lets you query your data in plain English.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
            <Link to="/register" className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-all shadow-xl hover:shadow-indigo-500/20 group">
              <span>Start Free Analysis</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login" className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-white font-semibold px-6 py-3.5 rounded-xl transition-all">
              <span>Access Account</span>
            </Link>
          </div>
        </div>

        {/* Right Col - 3D Showcase Panel */}
        <div className="flex-1 w-full max-w-md lg:max-w-none perspective-1000">
          <div className="w-full aspect-[4/3] rounded-2xl glass-panel p-6 border border-glass shadow-glass rotate-y-12 transform-style-3d hover:transform-none transition-transform duration-700 relative">
            <div className="absolute top-4 left-4 h-3 w-3 bg-red-500 rounded-full"></div>
            <div className="absolute top-4 left-9 h-3 w-3 bg-yellow-500 rounded-full"></div>
            <div className="absolute top-4 left-14 h-3 w-3 bg-green-500 rounded-full"></div>
            
            {/* Simulation of Interface */}
            <div className="mt-8 space-y-4">
              <div className="h-6 w-1/3 bg-slate-800/80 rounded-lg"></div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex flex-col justify-between">
                  <div className="h-2 w-1/2 bg-slate-700 rounded"></div>
                  <div className="h-4 w-2/3 bg-indigo-400 rounded"></div>
                </div>
                <div className="h-16 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex flex-col justify-between">
                  <div className="h-2 w-1/2 bg-slate-700 rounded"></div>
                  <div className="h-4 w-2/3 bg-purple-400 rounded"></div>
                </div>
                <div className="h-16 bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 flex flex-col justify-between">
                  <div className="h-2 w-1/2 bg-slate-700 rounded"></div>
                  <div className="h-4 w-2/3 bg-pink-400 rounded"></div>
                </div>
              </div>

              {/* Chart Wireframe */}
              <div className="h-32 bg-slate-900/60 border border-slate-800/60 rounded-xl flex items-end justify-between p-4">
                <div className="w-6 bg-indigo-500/30 h-10 rounded-t"></div>
                <div className="w-6 bg-purple-500/40 h-20 rounded-t"></div>
                <div className="w-6 bg-indigo-500/50 h-16 rounded-t"></div>
                <div className="w-6 bg-purple-500/60 h-28 rounded-t"></div>
                <div className="w-6 bg-pink-500/50 h-24 rounded-t"></div>
              </div>

              {/* Input Chat Box */}
              <div className="h-10 bg-slate-900 border border-slate-800 rounded-xl px-3 flex items-center justify-between text-xs text-slate-500">
                <span>Ask: "Which category has the highest sales?"</span>
                <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 border-t border-slate-900/60">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl transition-all">
            <Cpu className="h-6 w-6 text-indigo-400 mb-3" />
            <h4 className="font-semibold text-sm mb-1 text-white">Universal Loader</h4>
            <p className="text-xs text-slate-500">Reads CSV and Excel files instantly, categorizing columns automatically.</p>
          </div>
          <div className="p-5 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl transition-all">
            <Brain className="h-6 w-6 text-purple-400 mb-3" />
            <h4 className="font-semibold text-sm mb-1 text-white">AI Data Chat</h4>
            <p className="text-xs text-slate-500">Ask plain questions, generating tables, Plotly charts, and analysis.</p>
          </div>
          <div className="p-5 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl transition-all">
            <LineChart className="h-6 w-6 text-pink-400 mb-3" />
            <h4 className="font-semibold text-sm mb-1 text-white">Holt-Winters Forecasting</h4>
            <p className="text-xs text-slate-500">Detect trends and model future series with full confidence levels.</p>
          </div>
          <div className="p-5 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl transition-all">
            <BarChart3 className="h-6 w-6 text-emerald-400 mb-3" />
            <h4 className="font-semibold text-sm mb-1 text-white">Advanced Segmentation</h4>
            <p className="text-xs text-slate-500">Form K-Means clusters and monthly user cohorts with zero configuration.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-600 border-t border-slate-900/40">
        &copy; {new Date().getFullYear()} DD (Data Doctor) Analytics Platform. Built for Production.
      </footer>
    </div>
  );
};

export default LandingPage;
