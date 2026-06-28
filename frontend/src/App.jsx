import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DatasetProvider } from './context/DatasetContext';
import AnimatedBackground from './components/AnimatedBackground';

// Import Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import DashboardHome from './pages/DashboardHome';
import DatasetsPage from './pages/DatasetsPage';
import CleaningPage from './pages/CleaningPage';
import ChatPage from './pages/ChatPage';
import InsightsPage from './pages/InsightsPage';
import ForecastingPage from './pages/ForecastingPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ChartBuilderPage from './pages/ChartBuilderPage';

// Import Components
import Sidebar from './components/Sidebar';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
        <span className="text-xs">Authenticating session...</span>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Layout wrapping sidebar and content
const MainLayout = ({ children }) => {
  const { theme } = useTheme();
  
  return (
    <div className={`flex w-screen h-screen overflow-hidden transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-slate-950/20 text-slate-100' 
        : theme === 'midnight'
          ? 'bg-gradient-to-br from-indigo-100 to-indigo-300 text-indigo-950'
          : theme === 'light'
            ? 'bg-black text-slate-100'
            : 'bg-white/40 text-slate-800'
    }`}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
};

const AppContent = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected Dashboard Pages */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardHome />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/datasets"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DatasetsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cleaning"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CleaningPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ChatPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <MainLayout>
              <InsightsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/forecasting"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ForecastingPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ReportsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SettingsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/charts"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ChartBuilderPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DatasetProvider>
            <div className="relative min-h-screen overflow-hidden font-sans">
              <AnimatedBackground />
              <AppContent />
            </div>
          </DatasetProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
