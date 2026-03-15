import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, LogIn, UserPlus, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

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
  if (!loaded || authLoading) return <Skeleton className="h-screen w-full" />;

  // Logged-in users can access everything (their access is controlled by existing auth checks in each page)
  if (user) return <>{children}</>;

  // Guest: check permissions
  // Check exact match or dynamic route prefix
  const isAllowed =
    guestPages.has(path) ||
    DYNAMIC_ROUTES.some((prefix) => path.startsWith(prefix) && guestPages.has(prefix.slice(0, -1)));

  if (!isAllowed) {
    return (
      <div className="relative min-h-screen">
        {/* Render actual page content behind blur */}
        <div className="pointer-events-none select-none blur-md brightness-50" aria-hidden="true">
          {children}
        </div>

        {/* Overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-sm w-full rounded-xl border border-border bg-card p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">Wymagane logowanie</h2>
            <p className="text-sm text-muted-foreground font-body mb-6">
              Zaloguj się lub utwórz konto, aby uzyskać dostęp do tej strony.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/login">
                <Button variant="hero" size="lg" className="w-full gap-2">
                  <LogIn className="h-4 w-4" /> Zaloguj się
                </Button>
              </Link>
              <Link to="/login?mode=register">
                <Button variant="outline" size="lg" className="w-full gap-2">
                  <UserPlus className="h-4 w-4" /> Załóż konto
                </Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" size="lg" className="w-full gap-2 text-muted-foreground">
                  <Home className="h-4 w-4" /> Strona główna
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
