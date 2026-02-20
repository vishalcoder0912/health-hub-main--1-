import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { initializeMockData } from '@/lib/mockData';
import { apiRequest } from '@/lib/api';
import { bootstrapCollectionsToLocalStorage, saveAnyCollection } from '@/lib/backendSync';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const demoUserIdByEmail: Record<string, string> = {
  'admin@hospital.com': 'admin-1',
  'doctor@hospital.com': 'doctor-1',
  'doctor2@hospital.com': 'doctor-2',
  'reception@hospital.com': 'receptionist-1',
  'nurse@hospital.com': 'nurse-1',
  'pharmacy@hospital.com': 'pharmacy-1',
  'lab@hospital.com': 'lab-1',
  'billing@hospital.com': 'billing-1',
  'patient@email.com': 'patient-1',
  'bloodbank@hospital.com': 'bloodbank-1',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      initializeMockData();

      const storedUser = localStorage.getItem('currentUser');
      const accessToken = localStorage.getItem('accessToken');

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      if (storedUser && accessToken) {
        await bootstrapCollectionsToLocalStorage();
      }

      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload = await apiRequest<{
        user: {
          id: string;
          fullName: string;
          email: string;
          role: UserRole;
          phone?: string;
          createdAt: string;
        };
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email, password }),
      });

      const userData: User = {
        id: demoUserIdByEmail[payload.user.email.toLowerCase()] || payload.user.id,
        name: payload.user.fullName,
        email: payload.user.email,
        role: payload.user.role,
        phone: payload.user.phone,
        createdAt: payload.user.createdAt,
      };

      localStorage.setItem('accessToken', payload.accessToken);
      localStorage.setItem('refreshToken', payload.refreshToken);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setUser(userData);

      await bootstrapCollectionsToLocalStorage();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  };

  const logout = () => {
    void apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      // Also persist to userProfiles for future logins
      const savedProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
      savedProfiles[user.id] = { ...savedProfiles[user.id], ...updates };
      localStorage.setItem('userProfiles', JSON.stringify(savedProfiles));
      void saveAnyCollection('userProfiles', savedProfiles);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      updateUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role-based access helper
export function hasAccess(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}
