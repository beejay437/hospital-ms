'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  doctorId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isRole: (...roles: string[]) => boolean;
  getDefaultRoute: (role?: string) => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const normalizeRole = (role?: string) => {
  return (role || '').toLowerCase().replace(/\s+/g, '_');
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getDefaultRoute = useCallback((role?: string) => {
    const cleanRole = normalizeRole(role);

    switch (cleanRole) {
      case 'admin':
        return '/dashboard';
      case 'doctor':
        return '/appointments';
      case 'receptionist':
        return '/patients';
      case 'nurse':
        return '/admissions';
      case 'pharmacist':
        return '/pharmacy';
      case 'billing_officer':
        return '/billing';
      default:
        return '/dashboard';
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('hms_token');
    const storedUser = localStorage.getItem('hms_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('hms_token');
        localStorage.removeItem('hms_user');
      }
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;

    localStorage.setItem('hms_token', newToken);
    localStorage.setItem('hms_user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);

    return newUser;
  };

  const isRole = (...roles: string[]) => {
    const currentRole = normalizeRole(user?.role);
    return roles.map(normalizeRole).includes(currentRole);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, isRole, getDefaultRoute }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
