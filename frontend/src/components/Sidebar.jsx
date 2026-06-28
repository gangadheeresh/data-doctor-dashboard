import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDataset } from '../context/DatasetContext';
import { 
  LayoutDashboard, 
  Database, 
  Wand2, 
  MessageSquare, 
  TrendingUp, 
  LineChart, 
  FileDown, 
  Settings, 
  LogOut, 
  Sun, 
  Moon,
  DatabaseZap,
  Sparkles,
  BarChart3
} from 'lucide-react';

const Sidebar = () => {
  const { user, settings, logout } = useAuth();
  const { theme, setTheme, toggleTheme } = useTheme();
  const { selectedDataset } = useDataset();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/datasets', label: 'Datasets', icon: Database },
    { to: '/cleaning', label: 'Data Cleaning', icon: Wand2 },
    { to: '/chat', label: 'AI Chat', icon: MessageSquare },
    { to: '/insights', label: 'Insights', icon: TrendingUp },
    { to: '/charts', label: 'Chart Builder', icon: BarChart3 },
    { to: '/forecasting', label: 'Forecasting', icon: LineChart },
    { to: '/reports', label: 'Reports', icon: FileDown },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`w-64 h-screen border-r flex flex-col shrink-0 transition-all duration-300 ${
      theme === 'dark' 
        ? 'bg-slate-950/40 border-slate-800/80 text-slate-100' 
        : theme === 'midnight'
          ? 'bg-white/40 border-white/30 text-slate-900 shadow-glass-light'
          : theme === 'light'
            ? 'bg-black border-white/10 text-slate-100 shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.05)]'
            : 'bg-white/80 border-slate-200 text-slate-800'
    } backdrop-blur-md`}>
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-2 border-b border-inherit">
        <DatabaseZap className="h-6 w-6 text-indigo-500 animate-float" />
        <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          DD (Data Doctor)
        </span>
      </div>

      {/* Active Dataset Banner */}
      {selectedDataset && (
        <div className={`mx-4 mt-4 p-3 rounded-xl border flex items-center gap-2 ${
          theme === 'dark'
            ? 'bg-indigo-500/5 border-indigo-500/10 text-indigo-300'
            : theme === 'midnight'
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
              : theme === 'light'
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                : 'bg-indigo-50 border-indigo-100 text-indigo-800'
        }`}>
          <Database className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">Active Dataset</p>
            <p className="text-xs font-semibold truncate">{selectedDataset.filename}</p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive 
                    ? 'sidebar-link-active' 
                    : theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      : theme === 'midnight'
                        ? 'text-slate-750 hover:text-slate-950 hover:bg-white/30 font-medium'
                        : theme === 'light'
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Profile & Controls Footer */}
      <div className="p-4 border-t border-inherit space-y-4">
        
        {/* Theme Segment Selection */}
        <div className={`p-1 flex rounded-xl border transition-colors ${
          theme === 'dark' 
            ? 'bg-slate-900/60 border-slate-800' 
            : theme === 'midnight'
              ? 'bg-white/30 border-white/20 shadow-inner'
              : theme === 'light'
                ? 'bg-black/60 border-white/5 shadow-inner'
                : 'bg-slate-100 border-slate-200'
        }`}>
          {/* Light Theme Button */}
          <button
            onClick={() => setTheme('midnight')}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              theme === 'midnight'
                ? 'bg-white/60 text-indigo-950 border border-white/50 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-400'
            }`}
            title="Light Mode"
          >
            <Sun className="h-3.5 w-3.5 mr-1 shrink-0 text-amber-500" />
            <span>Light</span>
          </button>
          
          {/* Dark Theme Button */}
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              theme === 'dark'
                ? 'bg-slate-800 text-slate-100 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-400'
            }`}
            title="Dark Mode"
          >
            <Moon className="h-3.5 w-3.5 mr-1 shrink-0" />
            <span>Dark</span>
          </button>

          {/* Midnight Theme Button */}
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              theme === 'light'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-400'
            }`}
            title="Midnight Mode"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 shrink-0 animate-pulse text-indigo-400" />
            <span>Midnt</span>
          </button>
        </div>

        {/* Logout Action */}
        <button
          onClick={logout}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            theme === 'dark'
              ? 'border-red-500/10 text-red-400 hover:bg-red-500/10'
              : theme === 'midnight'
                ? 'border-red-500/10 text-red-700 hover:bg-red-500/10 bg-red-500/5'
                : theme === 'light'
                  ? 'border-red-500/10 text-red-400 hover:bg-red-500/10 bg-red-500/5'
                  : 'border-red-200 text-red-650 hover:bg-red-50'
          }`}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>

        {/* User Card */}
        {user && (
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
            theme === 'dark' 
              ? 'bg-slate-900/40 border-slate-800' 
              : theme === 'midnight'
                ? 'bg-white/30 border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                : theme === 'light'
                  ? 'bg-white/10 border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]'
                  : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white uppercase overflow-hidden shrink-0">
              {settings?.profile_pic ? (
                <img src={settings.profile_pic} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                user.username.slice(0, 2)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user.username}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
