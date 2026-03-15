import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Lock, Eye, EyeOff, Trash2, Shield, Activity, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  timestamp: string;
  user_name?: string;
}

interface SessionInfo {
  id: string;
  user_id: string;
  user_agent: string;
  ip_address: string;
  last_activity: string;
  created_at: string;
}

const SecurityAuditPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [suspiciousActivity, setSuspiciousActivity] = useState<any[]>([]);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = supabase
        .from("audit_log")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        // Enrich with user names
        const userIds = [...new Set(data.map(l => l.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", userIds);

        const enriched = (data as any[]).map(log => ({
          ...log,
          user_name: profiles?.find(p => p.user_id === log.user_id)?.name || "Nieznany",
        }));
        setAuditLogs(enriched);

        // Detect suspicious activity
        detectSuspiciousActivity(enriched);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      toast({ title: "Błąd", description: "Nie można załadować logów auditu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const detectSuspiciousActivity = (logs: AuditLog[]) => {
    const suspicious: any[] = [];
    const now = new Date().getTime();
    const ONE_HOUR = 60 * 60 * 1000;

    // Group logs by user
    const userLogs = logs.reduce((acc: any, log) => {
      if (!acc[log.user_id]) acc[log.user_id] = [];
      acc[log.user_id].push(log);
      return acc;
    }, {});

    // Check for brute force attempts
    Object.entries(userLogs).forEach(([userId, userLogList]: [string, any]) => {
      const recentLogs = (userLogList as AuditLog[]).filter(
        l => now - new Date(l.timestamp).getTime() < ONE_HOUR
      );

      // Multiple failed login attempts
      const failedLogins = recentLogs.filter(l => l.action === "login_failed").length;
      if (failedLogins > 5) {
        suspicious.push({
          type: "brute_force",
          severity: "high",
          user: (recentLogs[0] as AuditLog).user_name,
          message: `${failedLogins} nieudanych prób logowania w ostatniej godzinie`,
          timestamp: new Date().toLocaleString("pl-PL"),
        });
      }

      // Multiple IP addresses in short time
      const uniqueIPs = new Set(recentLogs.map(l => l.ip_address).filter(Boolean));
      if (uniqueIPs.size > 3) {
        suspicious.push({
          type: "multiple_ips",
          severity: "medium",
          user: (recentLogs[0] as AuditLog).user_name,
          message: `Dostęp z ${uniqueIPs.size} adresów IP w ostatniej godzinie`,
          timestamp: new Date().toLocaleString("pl-PL"),
        });
      }
    });

    setSuspiciousActivity(suspicious);
  };

  const handleClearOldLogs = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabase
        .from("audit_log")
        .delete()
        .lt("timestamp", thirtyDaysAgo.toISOString());

      if (error) throw error;
      toast({ title: "Sukces", description: "Stare logi (>30 dni) zostały usunięte" });
      loadAuditLogs();
    } catch (err) {
      console.error("Failed to clear logs:", err);
      toast({ title: "Błąd", description: "Nie można usunąć logów", variant: "destructive" });
    }
  };

  const handleExportLogs = async () => {
    try {
      const csv = [
        ["Data", "Użytkownik", "Akcja", "IP", "Szczegóły"].join(","),
        ...auditLogs.map(log =>
          [
            new Date(log.timestamp).toLocaleString("pl-PL"),
            log.user_name || "?",
            log.action,
            log.ip_address || "?",
            JSON.stringify(log.details),
          ].map(v => `"${v}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: "Sukces", description: "Logi zostały wyeksportowane" });
    } catch (err) {
      console.error("Failed to export logs:", err);
      toast({ title: "Błąd", description: "Nie można wyeksportować logów", variant: "destructive" });
    }
  };

  useEffect(() => {
    loadAuditLogs();
    const interval = setInterval(loadAuditLogs, 30000); // Refresh co 30s
    return () => clearInterval(interval);
  }, [loadAuditLogs]);

  return (
    <div className="space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto overscroll-contain">
      <h2 className="text-xl font-display font-bold text-foreground">🔒 Bezpieczeństwo & Audyt</h2>

      {/* Suspicious Activity Alert */}
      {suspiciousActivity.length > 0 && (
        <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
          <h3 className="font-display font-bold text-destructive mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Podejrzana aktywność
          </h3>
          <div className="space-y-2">
            {suspiciousActivity.map((activity, idx) => (
              <div key={idx} className="text-sm bg-destructive/5 rounded-md p-2 border border-destructive/20">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-destructive">{activity.user}</p>
                    <p className="text-destructive/80">{activity.message}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    activity.severity === "high"
                      ? "bg-destructive/20 border-destructive/30 text-destructive"
                      : "bg-yellow-500/20 border-yellow-500/30 text-yellow-600"
                  }`}>
                    {activity.severity === "high" ? "WYSOKIE" : "ŚREDNIE"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="rounded-lg border border-border bg-card p-5 card-glow">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Zarządzanie logami
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={loadAuditLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Odśwież
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Activity className="h-4 w-4 mr-1" /> Eksportuj CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-yellow-600 hover:text-yellow-600"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Usuń logi {'>'}30 dni
          </Button>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-sm">
            <p className="text-yellow-700 font-semibold mb-2">⚠️ Potwierdzenie: Czy na pewno usunąć?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  await handleClearOldLogs();
                  setShowDeleteConfirm(false);
                }}
              >
                Tak, usuń
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs */}
      <div className="rounded-lg border border-border bg-card p-5 card-glow">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" /> Ostatnie zdarzenia ({auditLogs.length})
        </h3>

        {auditLogs.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Brak zdarzeń do wyświetlenia</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.slice(0, 50).map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{log.user_name}</span>
                    <span className="text-[11px] uppercase px-1.5 py-0.5 rounded-full border bg-accent/20 border-accent/30 text-accent font-display">
                      {log.action}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString("pl-PL")}
                    </span>
                  </div>
                  {log.ip_address && (
                    <p className="text-xs text-muted-foreground mt-1">IP: {log.ip_address}</p>
                  )}
                  {Object.keys(log.details || {}).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {JSON.stringify(log.details).substring(0, 100)}...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Tips */}
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-5">
        <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
          💡 Zalecenia bezpieczeństwa
        </h3>
        <ul className="space-y-2 text-sm font-body text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">✓</span>
            <span>Regularnie przegląd logów audytu w poszukiwaniu nieautoryzowanych dostępów</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">✓</span>
            <span>Usuwaj stare logi aby zmniejszyć ilość danych wrażliwych</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">✓</span>
            <span>Ustawiaj silne hasła (min. 12 znaków, wielkie litery, cyfry, znaki specjalne)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">✓</span>
            <span>Monituj login z wtyczek — upewnij się że pochodzą z zaufanych IP</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">✓</span>
            <span>Wyloguj nieaktywne sesje co 30 dni</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityAuditPanel;
