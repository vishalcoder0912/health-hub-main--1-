import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';
import { supabase } from '@/utils/supabase';
import { bootstrapSupabaseCollectionsToLocalStorage } from '@/lib/supabaseSync';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const collectionKeys = [
  'users',
  'patients',
  'appointments',
  'medicines',
  'labTests',
  'bills',
  'beds',
  'departments',
  'vitals',
  'prescriptions',
  'medicalRecords',
  'doctorNotifications',
  'bloodDonors',
  'bloodInventory',
  'bloodCollections',
  'bloodIssues',
  'bloodRequests',
  'bloodStorage',
  'bloodTests',
  'bloodActivityLogs',
  'medicationSchedule',
  'nursingNotes',
  'purchaseOrders',
  'dispenseRecords',
  'patientConversations',
  'patientMessages',
  'userProfiles',
  'staffAttendance',
  'nurseAlerts',
];

function parseRole(user: SupabaseUser): UserRole | null {
  const metadataRole = (user.user_metadata?.role || user.app_metadata?.role) as UserRole | undefined;
  if (!metadataRole) return null;
  const allowed: UserRole[] = [
    'admin',
    'doctor',
    'receptionist',
    'nurse',
    'pharmacy',
    'laboratory',
    'billing',
    'patient',
    'bloodbank',
  ];
  return allowed.includes(metadataRole) ? metadataRole : null;
}

function mapSupabaseUser(user: SupabaseUser): User | null {
  const role = parseRole(user);
  if (!role) return null;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'User';

  return {
    id: user.id,
    name: fullName,
    email: user.email || '',
    role,
    phone: (user.user_metadata?.phone as string | undefined) || undefined,
    department: (user.user_metadata?.department as string | undefined) || undefined,
    specialization: (user.user_metadata?.specialization as string | undefined) || undefined,
    avatar: (user.user_metadata?.avatar as string | undefined) || undefined,
    createdAt: user.created_at || new Date().toISOString(),
  };
}

async function hydrateCollections(): Promise<void> {
  await bootstrapSupabaseCollectionsToLocalStorage(collectionKeys);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[Auth:getSession]', error.message);
      }

      if (!mounted) return;

      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user ? mapSupabaseUser(currentSession.user) : null);

      if (currentSession) {
        await hydrateCollections();
      }
      setIsLoading(false);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ? mapSupabaseUser(nextSession.user) : null);
      if (nextSession) {
        void hydrateCollections();
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }

    const mappedUser = data.user ? mapSupabaseUser(data.user) : null;
    if (!mappedUser) {
      await supabase.auth.signOut();
      return { success: false, error: 'Role metadata missing or invalid for this account.' };
    }

    setUser(mappedUser);
    setSession(data.session);
    await hydrateCollections();
    localStorage.setItem('currentUser', JSON.stringify(mappedUser));
    return { success: true };
  };

  const logout = () => {
    void supabase.auth.signOut();
    setUser(null);
    setSession(null);
    localStorage.removeItem('currentUser');
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!session?.user) return;

    const nextMetadata = {
      ...session.user.user_metadata,
      full_name: updates.name ?? session.user.user_metadata?.full_name,
      role: updates.role ?? session.user.user_metadata?.role,
      phone: updates.phone ?? session.user.user_metadata?.phone,
      department: updates.department ?? session.user.user_metadata?.department,
      specialization: updates.specialization ?? session.user.user_metadata?.specialization,
      avatar: updates.avatar ?? session.user.user_metadata?.avatar,
    };

    const { data, error } = await supabase.auth.updateUser({ data: nextMetadata });
    if (error) {
      console.error('[Auth:updateUser]', error.message);
      return;
    }

    const mapped = data.user ? mapSupabaseUser(data.user) : null;
    if (mapped) {
      setUser(mapped);
      localStorage.setItem('currentUser', JSON.stringify(mapped));
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      login,
      logout,
      updateUser,
      isAuthenticated: !!session && !!user,
    }),
    [isLoading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function hasAccess(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}
