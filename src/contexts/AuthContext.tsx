import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase as defaultClient } from "@/integrations/supabase/client";
import { useSelfHost } from "@/contexts/SelfHostContext";
import type { User } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton";
import { translateError } from "@/lib/translateError";

interface AuthContextType {
  user: User | null;
  profile: { name: string; avatar: string } | null;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (name: string, email: string, password: string, nicks?: { autodarts?: string; dartcounter?: string; dartsmind?: string }) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { activeClient } = useSelfHost();
  const supabase = activeClient;
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
  }, [supabase]);

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
  }, [supabase]);

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
    let errorTimeout: NodeJS.Timeout | null = null;

    const initSession = async () => {
      setLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          setErrorMsg("Błąd pobierania sesji. Spróbuj odświeżyć stronę.");
        }
        await syncUserState(session?.user ?? null);
      } catch (e) {
        if (mounted) setErrorMsg("Błąd połączenia z serwerem. Sprawdź internet lub spróbuj później.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setLoading(true);
      window.postMessage({ type: "EDART_AUTH_STATE_CHANGED" }, window.location.origin);
      void syncUserState(session?.user ?? null).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    initSession().then(() => {
      if (errorTimeout) clearTimeout(errorTimeout);
    });

    // Fallback: wymuś zakończenie loading po 15s
    errorTimeout = setTimeout(() => {
      if (mounted) {
        setLoading((prev) => {
          if (prev) {
            setErrorMsg("Błąd ładowania. Spróbuj odświeżyć stronę.");
            return false;
          }
          return prev;
        });
      }
    }, 15000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (errorTimeout) clearTimeout(errorTimeout);
    };
  }, [syncUserState]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? translateError(error.message) : null };
  };

  const register = async (name: string, email: string, password: string, nicks?: { autodarts?: string; dartcounter?: string; dartsmind?: string }) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    
    // Update the player record with gaming nicks after registration
    if (!error && data?.user && nicks && (nicks.autodarts || nicks.dartcounter || nicks.dartsmind)) {
      // The trigger creates the player record, so update it with gaming nick info
      setTimeout(async () => {
        const updates: Record<string, string> = {};
        if (nicks.autodarts) updates.autodarts_user_id = nicks.autodarts;
        if (nicks.dartcounter) updates.dartcounter_id = nicks.dartcounter;
        if (nicks.dartsmind) updates.dartsmind_id = nicks.dartsmind;
        await supabase.from("players").update(updates as any).eq("user_id", data.user!.id);
      }, 1000);
    }
    
    return { error: error ? translateError(error.message) : null };
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
    return { error: error ? translateError(error.message) : null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? translateError(error.message) : null };
  };


  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src="/pwa-512x512.png" alt="eDART" className="h-16 w-16 rounded-full animate-pulse" />
        <div className="w-full max-w-lg space-y-4 p-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }
  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-lg space-y-4 p-4 text-center">
          <div className="text-lg text-destructive font-bold mb-2">{errorMsg}</div>
          <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded" onClick={() => window.location.reload()}>Odśwież stronę</button>
        </div>
      </div>
    );
  }

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
