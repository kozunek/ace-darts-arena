import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: { name: string; avatar: string } | null;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ name: string; avatar: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("name, avatar")
      .eq("user_id", userId)
      .maybeSingle();

    setProfile(data ?? null);
  }, []);

  const checkRoles = useCallback(async (userId: string) => {
    const [adminRes, modRes] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
    ]);

    if (!adminRes.error && !modRes.error) {
      setIsAdmin(Boolean(adminRes.data));
      setIsModerator(Boolean(modRes.data));
      return;
    }

    const { data: fallbackRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (fallbackRoles || []).map((r) => r.role);
    setIsAdmin(roles.includes("admin"));
    setIsModerator(roles.includes("moderator"));
  }, []);

  const syncUserState = useCallback(async (currentUser: User | null) => {
    setUser(currentUser);

    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      setIsModerator(false);
      return;
    }

    await Promise.all([fetchProfile(currentUser.id), checkRoles(currentUser.id)]);
  }, [checkRoles, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      await syncUserState(session?.user ?? null);
      if (mounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setLoading(true);
      await syncUserState(session?.user ?? null);
      if (mounted) setLoading(false);
    });

    initSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncUserState]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const register = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    try {
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setIsModerator(false);
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, isModerator, loading, login, register, logout, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
