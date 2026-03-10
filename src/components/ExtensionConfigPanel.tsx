import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plug, Copy, CheckCircle2, AlertTriangle, Globe, Shield, BarChart3, Link2 } from "lucide-react";
import { motion } from "framer-motion";

interface ExtensionSettings {
  id: string;
  league_id: string | null;
  auto_approve: boolean;
  auto_approve_manual: boolean;
  require_avg: boolean;
  require_180s: boolean;
  require_high_checkout: boolean;
  require_checkout_stats: boolean;
  require_darts_thrown: boolean;
  require_ton_ranges: boolean;
  require_autodarts_link: boolean;
  webhook_enabled: boolean;
}

const ExtensionConfigPanel = ({ leagues }: { leagues: any[] }) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const endpointUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-match-result`;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("extension_settings")
      .select("*")
      .is("league_id", null)
      .maybeSingle();
    if (data) setSettings(data as unknown as ExtensionSettings);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("extension_settings")
      .update({
        auto_approve: settings.auto_approve,
        require_avg: settings.require_avg,
        require_180s: settings.require_180s,
        require_high_checkout: settings.require_high_checkout,
        require_checkout_stats: settings.require_checkout_stats,
        require_darts_thrown: settings.require_darts_thrown,
        require_ton_ranges: settings.require_ton_ranges,
        require_autodarts_link: settings.require_autodarts_link,
        webhook_enabled: settings.webhook_enabled,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Zapisano!", description: "Ustawienia wtyczki zostały zaktualizowane." });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Skopiowano!", description: `${label} skopiowano do schowka.` });
  };

  const testEndpoint = async () => {
    setTestStatus("testing");
    try {
      const res = await fetch(endpointUrl, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });
      setTestStatus(res.ok ? "success" : "error");
    } catch {
      setTestStatus("error");
    }
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  const updateSetting = (key: keyof ExtensionSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (!settings) return null;

  const statFields = [
    { key: "require_avg" as const, label: "Średnia (avg)", desc: "Średnia za mecz dla obu graczy" },
    { key: "require_180s" as const, label: "180-tki", desc: "Liczba rzutów 180" },
    { key: "require_high_checkout" as const, label: "Najwyższy checkout", desc: "Najwyższe zamknięcie w meczu" },
    { key: "require_checkout_stats" as const, label: "Statystyki checkoutów", desc: "Próby i trafienia checkout" },
    { key: "require_darts_thrown" as const, label: "Rzucone lotki", desc: "Łączna liczba rzuconych lotek" },
    { key: "require_ton_ranges" as const, label: "Zakresy ton (60/100/140/170)", desc: "60+, 100+, 140+, 170+, 180" },
    
    { key: "require_autodarts_link" as const, label: "Link Autodarts", desc: "Link do meczu na Autodarts" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
          <Plug className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Konfiguracja wtyczki Chrome</h2>
          <p className="text-sm text-muted-foreground font-body">Zarządzaj integracją z Autodarts i zewnętrznymi narzędziami</p>
        </div>
      </div>

      {/* Connection Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border bg-card p-6 card-glow"
      >
        <h3 className="text-base font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> Endpoint API
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">URL Webhook</Label>
            <div className="flex gap-2">
              <Input
                value={endpointUrl}
                readOnly
                className="bg-muted/30 border-border font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(endpointUrl, "URL")}
                className="shrink-0"
              >
                {copied === "URL" ? <CheckCircle2 className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Klucz API (Anon Key)</Label>
            <div className="flex gap-2">
              <Input
                value={import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}
                readOnly
                className="bg-muted/30 border-border font-mono text-xs"
                type="password"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "API Key")}
                className="shrink-0"
              >
                {copied === "API Key" ? <CheckCircle2 className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={testEndpoint}
              disabled={testStatus === "testing"}
              className="font-display uppercase tracking-wider text-xs"
            >
              {testStatus === "testing" && "Testowanie..."}
              {testStatus === "idle" && "🔌 Test połączenia"}
              {testStatus === "success" && "✅ Połączono!"}
              {testStatus === "error" && "❌ Błąd"}
            </Button>
            <div className={`flex items-center gap-1 text-xs font-body ${settings.webhook_enabled ? "text-secondary" : "text-muted-foreground"}`}>
              <div className={`w-2 h-2 rounded-full ${settings.webhook_enabled ? "bg-secondary animate-pulse" : "bg-muted-foreground"}`} />
              {settings.webhook_enabled ? "Aktywny" : "Wyłączony"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* General Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card p-6 card-glow"
      >
        <h3 className="text-base font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Ustawienia ogólne
        </h3>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-body font-medium text-foreground">Webhook aktywny</Label>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                Zezwalaj na przesyłanie wyników przez API
              </p>
            </div>
            <Switch
              checked={settings.webhook_enabled}
              onCheckedChange={(v) => updateSetting("webhook_enabled", v)}
            />
          </div>

          <div className="border-t border-border pt-4 flex items-center justify-between">
            <div>
              <Label className="font-body font-medium text-foreground">Auto-zatwierdzanie wyników</Label>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                Wyniki z wtyczki będą automatycznie zatwierdzane bez weryfikacji admina
              </p>
            </div>
            <Switch
              checked={settings.auto_approve}
              onCheckedChange={(v) => updateSetting("auto_approve", v)}
            />
          </div>

          {settings.auto_approve && (
            <div className="rounded-md bg-accent/10 border border-accent/30 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <p className="text-xs text-accent font-body">
                <strong>Uwaga:</strong> Wyniki będą zatwierdzane automatycznie bez weryfikacji. Upewnij się, że ufasz źródłu danych.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Required Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-border bg-card p-6 card-glow"
      >
        <h3 className="text-base font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Wymagane statystyki
        </h3>
        <p className="text-xs text-muted-foreground font-body mb-5">
          Określ, które statystyki muszą być przesłane przez wtyczkę.
        </p>

        <div className="space-y-3">
          {statFields.map((field) => (
            <div key={field.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <Label className="font-body font-medium text-foreground text-sm">{field.label}</Label>
                <p className="text-xs text-muted-foreground font-body">{field.desc}</p>
              </div>
              <Switch
                checked={settings[field.key]}
                onCheckedChange={(v) => updateSetting(field.key, v)}
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* API Documentation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-lg border border-border bg-card p-6 card-glow"
      >
        <h3 className="text-base font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" /> Przykład użycia API
        </h3>

        <div className="rounded-md bg-muted/50 border border-border p-4 overflow-x-auto">
          <pre className="text-xs text-foreground font-mono whitespace-pre">
{`// POST ${endpointUrl}
// Headers: 
//   Authorization: Bearer <user_token>
//   Content-Type: application/json

{
  "match_id": "uuid-meczu",       // lub player1_name + player2_name
  "score1": 3,
  "score2": 2,
  "avg1": 85.4,
  "avg2": 78.2,
  "one_eighties1": 2,
  "one_eighties2": 0,
  "high_checkout1": 120,
  "high_checkout2": 96,
  "darts_thrown1": 180,
  "darts_thrown2": 195,
  "checkout_attempts1": 12,
  "checkout_hits1": 3,
  "checkout_attempts2": 15,
  "checkout_hits2": 2,
  "autodarts_link": "https://autodarts.io/...",
  "auto_complete": false
}`}
          </pre>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span><strong className="text-foreground">200</strong> — Wynik zapisany pomyślnie</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span><strong className="text-foreground">401</strong> — Brak autoryzacji (nieprawidłowy token)</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span><strong className="text-foreground">404</strong> — Mecz nie znaleziony</span>
          </div>
        </div>
      </motion.div>

      {/* Save */}
      <div className="flex justify-end">
        <Button variant="hero" size="lg" onClick={saveSettings} disabled={saving}>
          {saving ? "Zapisywanie..." : "💾 Zapisz ustawienia"}
        </Button>
      </div>
    </div>
  );
};

export default ExtensionConfigPanel;
