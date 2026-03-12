import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ExtensionDownloadSection from "@/components/ExtensionDownloadSection";
import ApkDownloadSection from "@/components/ApkDownloadSection";
import { Lock } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const DownloadsPage = () => {
  const { user } = useAuth();
  const [hasExtensionAccess, setHasExtensionAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) { setLoading(false); return; }

      const { data: sysRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (sysRoles?.some(r => r.role === "admin" || r.role === "moderator")) {
        setHasExtensionAccess(true);
        setLoading(false);
        return;
      }

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
    <div>
      <PageHeader title="Pobieranie" subtitle="Aplikacja mobilna i wtyczka przeglądarkowa" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
