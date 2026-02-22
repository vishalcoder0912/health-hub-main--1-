import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { User, UserRole } from "@/types";
import { supabase } from "@/utils/supabase";
import { bootstrapCollectionsToLocalStorage } from "@/lib/backendSync";
import { apiRequest, clearAuthTokens, setAuthTokens } from "@/lib/api";

type AuthResult =
  | {
      success: true;
      user?: User;
      requiresEmailVerification?: boolean;
      message?: string;
    }
  | {
      success: false;
      error: string;
    };

interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, expectedRole?: UserRole) => Promise<AuthResult>;
  register: (payload: RegisterInput) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

type BackendUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  department?: string | null;
  specialization?: string | null;
  createdAt: string;
};

type BackendLoginResponse = {
  user: BackendUser;
  accessToken: string;
  refreshToken: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const allowedRoles: UserRole[] = [
  "admin",
  "doctor",
  "receptionist",
  "nurse",
  "pharmacy",
  "laboratory",
  "billing",
  "patient",
  "bloodbank"
];

function parseRole(supabaseUser: SupabaseUser | null, fallbackRole?: UserRole): UserRole | null {
  const rawRole =
    (supabaseUser?.user_metadata?.role as string | undefined) ||
    (supabaseUser?.app_metadata?.role as string | undefined) ||
    fallbackRole ||
    null;

  if (!rawRole) return null;
  return allowedRoles.includes(rawRole as UserRole) ? (rawRole as UserRole) : null;
}

function mapCombinedUser(backendUser: BackendUser, supabaseUser: SupabaseUser | null): User {
  const parsedRole = parseRole(supabaseUser, backendUser.role);

  return {
    id: backendUser.id,
    email: backendUser.email,
    name:
      backendUser.fullName ||
      (supabaseUser?.user_metadata?.full_name as string | undefined) ||
      (supabaseUser?.user_metadata?.name as string | undefined) ||
      backendUser.email.split("@")[0] ||
      "User",
    role: parsedRole ?? backendUser.role,
    phone: backendUser.phone ?? undefined,
    department: backendUser.department ?? undefined,
    specialization: backendUser.specialization ?? undefined,
    avatar: (supabaseUser?.user_metadata?.avatar as string | undefined) ?? undefined,
    createdAt: backendUser.createdAt
  };
}

function mapSupabaseUserOnly(supabaseUser: SupabaseUser, fallbackRole?: UserRole): User | null {
  const role = parseRole(supabaseUser, fallbackRole);
  if (!role) return null;

  const name =
    (supabaseUser.user_metadata?.full_name as string | undefined) ||
    (supabaseUser.user_metadata?.name as string | undefined) ||
    supabaseUser.email?.split("@")[0] ||
    "User";

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name,
    role,
    phone: (supabaseUser.user_metadata?.phone as string | undefined) ?? undefined,
    department: (supabaseUser.user_metadata?.department as string | undefined) ?? undefined,
    specialization: (supabaseUser.user_metadata?.specialization as string | undefined) ?? undefined,
    avatar: (supabaseUser.user_metadata?.avatar as string | undefined) ?? undefined,
    createdAt: supabaseUser.created_at ?? new Date().toISOString()
  };
}

async function hydrateCollections(): Promise<void> {
  await bootstrapCollectionsToLocalStorage();
}

async function fetchBackendProfile(supabaseUser: SupabaseUser | null): Promise<User> {
  const profile = await apiRequest<BackendUser>("/users/me");
  const mapped = mapCombinedUser(profile, supabaseUser);
  localStorage.setItem("currentUser", JSON.stringify(mapped));
  localStorage.setItem("backendUser", JSON.stringify(profile));
  return mapped;
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
          console.error("[AuthContext:getSession]", error.message);
        }

        if (!active) return;

        setSession(data.session);

        if (!data.session?.user) {
          clearAuthTokens();
          localStorage.removeItem("currentUser");
          localStorage.removeItem("backendUser");
          setUser(null);
          return;
        }

        try {
          const mapped = await fetchBackendProfile(data.session.user);
          if (!active) return;
          setUser(mapped);
          await hydrateCollections();
        } catch (profileError) {
          const fallback = mapSupabaseUserOnly(data.session.user);
          setUser(fallback);
          if (fallback) {
            localStorage.setItem("currentUser", JSON.stringify(fallback));
            await hydrateCollections();
          }
          console.error(
            "[AuthContext:profileFallback]",
            profileError instanceof Error ? profileError.message : String(profileError)
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        setUser(null);
        clearAuthTokens();
        localStorage.removeItem("currentUser");
        localStorage.removeItem("backendUser");
        setIsLoading(false);
        return;
      }

      try {
        const mapped = await fetchBackendProfile(nextSession.user);
        setUser(mapped);
        await hydrateCollections();
      } catch (profileError) {
        const fallback = mapSupabaseUserOnly(nextSession.user);
        setUser(fallback);
        if (fallback) {
          localStorage.setItem("currentUser", JSON.stringify(fallback));
          await hydrateCollections();
        }
        console.error(
          "[AuthContext:onAuthStateChange]",
          profileError instanceof Error ? profileError.message : String(profileError)
        );
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, expectedRole?: UserRole): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }

      const metadataRole = data.user ? parseRole(data.user) : null;
      if (expectedRole && metadataRole && metadataRole !== expectedRole) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: `This account is registered for ${metadataRole} portal, not ${expectedRole}.`
        };
      }

      let backendLogin: BackendLoginResponse | null = null;
      try {
        backendLogin = await apiRequest<BackendLoginResponse>("/auth/login", {
          method: "POST",
          auth: false,
          body: JSON.stringify({ email, password })
        });
      } catch (backendLoginError) {
        clearAuthTokens();
        console.error(
          "[AuthContext:login:backend]",
          backendLoginError instanceof Error ? backendLoginError.message : String(backendLoginError)
        );
      }

      if (backendLogin && expectedRole && backendLogin.user.role !== expectedRole) {
        await supabase.auth.signOut();
        clearAuthTokens();
        return {
          success: false,
          error: `This account is registered for ${backendLogin.user.role} portal, not ${expectedRole}.`
        };
      }

      if (backendLogin) {
        setAuthTokens({
          accessToken: backendLogin.accessToken,
          refreshToken: backendLogin.refreshToken
        });
      } else {
        clearAuthTokens();
      }

      let effectiveSupabaseUser = data.user ?? null;

      if (effectiveSupabaseUser && !metadataRole && expectedRole) {
        const { data: updated, error: updateError } = await supabase.auth.updateUser({
          data: {
            ...effectiveSupabaseUser.user_metadata,
            role: expectedRole,
            full_name:
              (effectiveSupabaseUser.user_metadata?.full_name as string | undefined) ||
              (effectiveSupabaseUser.user_metadata?.name as string | undefined) ||
              (backendLogin?.user.fullName ?? email.split("@")[0])
          }
        });

        if (updateError) {
          console.error("[AuthContext:login:updateRoleMetadata]", updateError.message);
        } else if (updated.user) {
          effectiveSupabaseUser = updated.user;
        }
      }

      const resolvedSupabaseUser = effectiveSupabaseUser ?? data.session?.user ?? null;
      const mapped = backendLogin
        ? mapCombinedUser(backendLogin.user, resolvedSupabaseUser)
        : resolvedSupabaseUser
          ? mapSupabaseUserOnly(resolvedSupabaseUser, expectedRole ?? metadataRole ?? undefined)
          : null;

      if (!mapped) {
        await supabase.auth.signOut();
        return { success: false, error: "Unable to resolve user role. Please contact admin." };
      }

      setSession(data.session);
      setUser(mapped);
      localStorage.setItem("currentUser", JSON.stringify(mapped));
      if (backendLogin) {
        localStorage.setItem("backendUser", JSON.stringify(backendLogin.user));
      } else {
        localStorage.removeItem("backendUser");
      }
      await hydrateCollections();

      return { success: true, user: mapped };
    } catch (loginError) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore sign-out cleanup failures.
      }
      clearAuthTokens();
      return {
        success: false,
        error: loginError instanceof Error ? loginError.message : "Login failed"
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterInput): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            role: payload.role,
            full_name: payload.name,
            name: payload.name
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (payload.role === "patient") {
        try {
          await apiRequest<{ id: string }>("/auth/register", {
            method: "POST",
            auth: false,
            body: JSON.stringify({
              fullName: payload.name,
              email: payload.email,
              password: payload.password
            })
          });
        } catch (backendRegisterError) {
          console.error(
            "[AuthContext:register:backend]",
            backendRegisterError instanceof Error ? backendRegisterError.message : String(backendRegisterError)
          );
        }
      }

      const mapped = data.user ? mapSupabaseUserOnly(data.user, payload.role) : null;

      if (data.session && mapped) {
        setSession(data.session);
        setUser(mapped);
        localStorage.setItem("currentUser", JSON.stringify(mapped));
        await hydrateCollections();
        return { success: true, user: mapped };
      }

      return {
        success: true,
        user: mapped ?? undefined,
        requiresEmailVerification: true,
        message: "Registration successful. Please verify your email before logging in."
      };
    } catch (registerError) {
      return {
        success: false,
        error: registerError instanceof Error ? registerError.message : "Registration failed"
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      try {
        await apiRequest("/auth/logout", { method: "POST" });
      } catch (logoutError) {
        console.error(
          "[AuthContext:backendLogout]",
          logoutError instanceof Error ? logoutError.message : String(logoutError)
        );
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthContext:logout]", error.message);
      }
    } finally {
      clearAuthTokens();
      setUser(null);
      setSession(null);
      localStorage.removeItem("currentUser");
      localStorage.removeItem("backendUser");
      setIsLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>): Promise<void> => {
    if (!session?.user || !user) return;

    const nextMetadata = {
      ...session.user.user_metadata,
      full_name: updates.name ?? session.user.user_metadata?.full_name,
      role: updates.role ?? session.user.user_metadata?.role,
      phone: updates.phone ?? session.user.user_metadata?.phone,
      department: updates.department ?? session.user.user_metadata?.department,
      specialization: updates.specialization ?? session.user.user_metadata?.specialization,
      avatar: updates.avatar ?? session.user.user_metadata?.avatar
    };

    const { data, error } = await supabase.auth.updateUser({ data: nextMetadata });
    if (error) {
      console.error("[AuthContext:updateUser]", error.message);
      return;
    }

    const nextUser: User = {
      ...user,
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.role ? { role: updates.role } : {}),
      ...(updates.phone ? { phone: updates.phone } : {}),
      ...(updates.department ? { department: updates.department } : {}),
      ...(updates.specialization ? { specialization: updates.specialization } : {}),
      ...(updates.avatar ? { avatar: updates.avatar } : {})
    };

    if (data.user) {
      const metadataRole = parseRole(data.user, nextUser.role);
      if (metadataRole) {
        nextUser.role = metadataRole;
      }
    }

    setUser(nextUser);
    localStorage.setItem("currentUser", JSON.stringify(nextUser));
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      updateUser,
      isAuthenticated: Boolean(session && user)
    }),
    [user, isLoading, login, register, logout, updateUser, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function hasAccess(userRole: UserRole | undefined, allowed: UserRole[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}
