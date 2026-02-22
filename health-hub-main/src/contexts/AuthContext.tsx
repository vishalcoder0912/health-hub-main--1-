import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';
import { supabase } from '@/utils/supabase';
import { bootstrapSupabaseCollectionsToLocalStorage } from '@/lib/supabaseSync';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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

const allowedRoles: UserRole[] = [
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

function parseRole(supabaseUser: SupabaseUser): UserRole | null {
  const rawRole =
    (supabaseUser.user_metadata?.role as string | undefined) ||
    (supabaseUser.app_metadata?.role as string | undefined) ||
    null;

  if (!rawRole) return null;
  return allowedRoles.includes(rawRole as UserRole) ? (rawRole as UserRole) : null;
}

function mapUser(supabaseUser: SupabaseUser): User | null {
  const role = parseRole(supabaseUser);
  if (!role) return null;

  const name =
    (supabaseUser.user_metadata?.full_name as string | undefined) ||
    (supabaseUser.user_metadata?.name as string | undefined) ||
    supabaseUser.email?.split('@')[0] ||
    'User';

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name,
    role,
    phone: (supabaseUser.user_metadata?.phone as string | undefined) ?? undefined,
    department: (supabaseUser.user_metadata?.department as string | undefined) ?? undefined,
    specialization: (supabaseUser.user_metadata?.specialization as string | undefined) ?? undefined,
    avatar: (supabaseUser.user_metadata?.avatar as string | undefined) ?? undefined,
    createdAt: supabaseUser.created_at ?? new Date().toISOString(),
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
    let active = true;

    void (async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthContext:getSession]', error.message);
        }

        if (!active) return;

        setSession(data.session);

        const mapped = data.session?.user ? mapUser(data.session.user) : null;
        setUser(mapped);

        if (data.session && mapped) {
          await hydrateCollections();
          localStorage.setItem('currentUser', JSON.stringify(mapped));
        } else {
          localStorage.removeItem('currentUser');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);

      const mapped = nextSession?.user ? mapUser(nextSession.user) : null;
      setUser(mapped);

      if (nextSession && mapped) {
        await hydrateCollections();
        localStorage.setItem('currentUser', JSON.stringify(mapped));
      } else {
        localStorage.removeItem('currentUser');
      }

      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }

      const mapped = data.user ? mapUser(data.user) : null;
      if (!mapped) {
        await supabase.auth.signOut();
        return { success: false, error: 'Role metadata missing or invalid for this account.' };
      }

      setSession(data.session);
      setUser(mapped);
      localStorage.setItem('currentUser', JSON.stringify(mapped));
      await hydrateCollections();

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext:logout]', error.message);
      }
      setUser(null);
      setSession(null);
      localStorage.removeItem('currentUser');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>): Promise<void> => {
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
      console.error('[AuthContext:updateUser]', error.message);
      return;
    }

    const mapped = data.user ? mapUser(data.user) : null;
    if (!mapped) return;

    setUser(mapped);
    localStorage.setItem('currentUser', JSON.stringify(mapped));
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      login,
      logout,
      updateUser,
      isAuthenticated: Boolean(session && user),
    }),
    [user, isLoading, session]
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

export function hasAccess(userRole: UserRole | undefined, allowed: UserRole[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}
