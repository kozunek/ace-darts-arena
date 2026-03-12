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

      // Check admin/moderator
      const { data: sysRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (sysRoles?.some(r => r.role === "admin" || r.role === "moderator")) {
        setHasExtensionAccess(true);
        setLoading(false);
        return;
      }

      // Check if any custom role has "extension_download" action permission
      const { data: userRoles } = await supabase
        .from("user_custom_roles")
        .select("role_id")
        .eq("user_id", user.id);

      if (userRoles && userRoles.length > 0) {
        const roleIds = userRoles.map(r => r.role_id);
        const { data: perms } = await supabase
          .from("custom_role_permissions")
          .select("permission_key")
          .in("role_id", roleIds)
          .eq("permission_type", "action")
          .eq("permission_key", "extension_download");

        if (perms && perms.length > 0) {
          setHasExtensionAccess(true);
        }
      }

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
