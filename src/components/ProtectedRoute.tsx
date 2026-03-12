import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PagePermissions {
  guestPages: Set<string>;
  loaded: boolean;
}

const PagePermissionsContext = createContext<PagePermissions>({ guestPages: new Set(), loaded: false });

export const usePagePermissions = () => useContext(PagePermissionsContext);

export const PagePermissionsProvider = ({ children }: { children: ReactNode }) => {
  const [guestPages, setGuestPages] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Fetch guest role and its page permissions
      const { data: guestRole } = await supabase
        .from("custom_roles")
        .select("id")
        .eq("is_guest_role", true)
        .maybeSingle();

      if (guestRole) {
        const { data: perms } = await supabase
          .from("custom_role_permissions")
          .select("permission_key")
          .eq("role_id", guestRole.id)
          .eq("permission_type", "page");

        if (perms) {
          setGuestPages(new Set(perms.map((p: any) => p.permission_key)));
        }
      }
      setLoaded(true);
    };
    load();
  }, []);

  return (
    <PagePermissionsContext.Provider value={{ guestPages, loaded }}>
      {children}
    </PagePermissionsContext.Provider>
  );
};

// Routes that should never be blocked (system routes)
const ALWAYS_ALLOWED = ["/login", "/reset-password"];

// Routes with dynamic segments that need prefix matching
const DYNAMIC_ROUTES = ["/players/"];

export const ProtectedRoute = ({ children, path }: { children: ReactNode; path: string }) => {
  const { user, loading: authLoading } = useAuth();
  const { guestPages, loaded } = usePagePermissions();

  // Always allow system routes
  if (ALWAYS_ALLOWED.includes(path)) return <>{children}</>;

  // Wait for data to load
  if (!loaded || authLoading) return null;

  // Logged-in users can access everything (their access is controlled by existing auth checks in each page)
  if (user) return <>{children}</>;

  // Guest: check permissions
  // Check exact match or dynamic route prefix
  const isAllowed =
    guestPages.has(path) ||
    DYNAMIC_ROUTES.some((prefix) => path.startsWith(prefix) && guestPages.has(prefix.slice(0, -1)));

  if (!isAllowed) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane Logowanie</h1>
        <p className="text-muted-foreground font-body mb-4">Ta strona jest dostępna tylko dla zalogowanych użytkowników.</p>
        <Link to="/login"><Button variant="hero" size="lg">Zaloguj się</Button></Link>
      </div>
    );
  }

  return <>{children}</>;
};
