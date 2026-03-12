import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase as defaultClient } from "@/integrations/supabase/client";
import { useSelfHost } from "@/contexts/SelfHostContext";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: { name: string; avatar: string } | null;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (name: string, email: string, password: string, gamingNick?: string) => Promise<{ error: string | null }>;
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
    const [adminRes, modRes, rolesRes] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const roles = (rolesRes.data || []).map((r) => r.role);
    const adminByRpc = !adminRes.error && Boolean(adminRes.data);
    const modByRpc = !modRes.error && Boolean(modRes.data);

    setIsAdmin(adminByRpc || roles.includes("admin"));
    setIsModerator(modByRpc || roles.includes("moderator"));
  }, []);

  const syncUserState = useCallback(async (currentUser: User | null) => {
    setUser(currentUser);

    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      setIsModerator(false);
      return;
    }

    await Promise.allSettled([fetchProfile(currentUser.id), checkRoles(currentUser.id)]);
  }, [checkRoles, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        await syncUserState(session?.user ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setLoading(true);
      // Signal auth state change to extension (no sensitive data)
      window.postMessage({ type: "EDART_AUTH_STATE_CHANGED" }, window.location.origin);
      void syncUserState(session?.user ?? null).finally(() => {
        if (mounted) setLoading(false);
      });
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

  const register = async (name: string, email: string, password: string, gamingNick?: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, gaming_nick: gamingNick } },
    });
    
    // If gaming nick provided, update the player record after registration
    if (!error && data?.user && gamingNick) {
      // The trigger creates the player record, so update it with gaming nick info
      setTimeout(async () => {
        await supabase.from("players").update({
          dartcounter_id: gamingNick,
          dartsmind_id: gamingNick,
        } as any).eq("user_id", data.user!.id);
      }, 1000);
    }
    
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
