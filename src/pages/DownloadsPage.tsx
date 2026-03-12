import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ExtensionDownloadSection from "@/components/ExtensionDownloadSection";
import ApkDownloadSection from "@/components/ApkDownloadSection";
import { Download, Lock } from "lucide-react";

const DownloadsPage = () => {
  const { user } = useAuth();
  const [hasExtensionAccess, setHasExtensionAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) { setLoading(false); return; }

      // Check if user has a custom role that grants /downloads page access
      // and also check for specific role names like 'autodarts'
      const { data: userRoles } = await supabase
        .from("user_custom_roles")
        .select("role_id")
        .eq("user_id", user.id);

      if (!userRoles || userRoles.length === 0) {
        // Check if user is admin/moderator
        const { data: sysRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        if (sysRoles?.some(r => r.role === "admin" || r.role === "moderator")) {
          setHasExtensionAccess(true);
        }
        setLoading(false);
        return;
      }

      // Check if any of the user's custom roles have a name related to extensions
      const roleIds = userRoles.map(r => r.role_id);
      const { data: roles } = await supabase
        .from("custom_roles")
        .select("name")
        .in("id", roleIds);

      const extensionRoleNames = ["autodarts", "dartcounter", "dartsmind"];
      const hasRole = roles?.some(r =>
        extensionRoleNames.some(name => r.name.toLowerCase().includes(name))
      );

      // Also check admin/mod
      const { data: sysRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setHasExtensionAccess(
        !!hasRole || !!sysRoles?.some(r => r.role === "admin" || r.role === "moderator")
      );
      setLoading(false);
    };
    checkAccess();
  }, [user]);

  if (loading) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
          <Download className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Pobieranie</h1>
          <p className="text-muted-foreground font-body text-sm">Aplikacja mobilna i wtyczka przeglądarkowa</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* APK section - always visible */}
        <ApkDownloadSection />

        {/* Extension section - only for users with appropriate role */}
        {hasExtensionAccess ? (
          <ExtensionDownloadSection />
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center card-glow">
            <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-bold text-foreground mb-2">Wtyczka przeglądarkowa</h3>
            <p className="text-sm text-muted-foreground font-body">
              Pobieranie wtyczki jest dostępne tylko dla graczy z odpowiednią rolą (np. Autodarts).
              Skontaktuj się z administratorem, aby uzyskać dostęp.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadsPage;
