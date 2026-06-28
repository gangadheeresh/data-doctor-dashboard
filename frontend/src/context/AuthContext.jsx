import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({ theme: 'dark', gemini_api_key: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await apiFetch('/auth/profile');
          setUser(data.user);
          setSettings(data.settings || { theme: 'dark', gemini_api_key: '' });
        } catch (error) {
          console.error('Session validation failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const login = async (username, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    // Reload profile to get user settings
    const profile = await apiFetch('/auth/profile');
    setSettings(profile.settings || { theme: 'dark', gemini_api_key: '' });
    return data;
  };

  const register = async (username, email, password, phoneNumber) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, phone_number: phoneNumber }),
    });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    // Default settings
    setSettings({ theme: 'dark', gemini_api_key: '' });
    return data;
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed:', e);
    }
    localStorage.removeItem('token');
    setUser(null);
    setSettings({ theme: 'dark', gemini_api_key: '' });
  };

  const updateProfile = async (profileData) => {
    const data = await apiFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    setUser(data.user);
    setSettings(data.settings);
    return data;
  };

  const value = {
    user,
    settings,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    setSettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
