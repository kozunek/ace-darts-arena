import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Database, Brain, Mail, Webhook, Save, TestTube, Plus, Trash2,
  Eye, EyeOff, CheckCircle2, XCircle, MinusCircle, Loader2, Server, Key
} from "lucide-react";

// ─── Types ───
interface ConfigMap { [key: string]: string }

type ConnectionStatus = "idle" | "testing" | "ok" | "error";

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  idle: "text-muted-foreground",
  testing: "text-yellow-500",
  ok: "text-green-500",
  error: "text-destructive",
};

const STATUS_ICONS: Record<ConnectionStatus, React.ReactNode> = {
  idle: <MinusCircle className="h-4 w-4" />,
  testing: <Loader2 className="h-4 w-4 animate-spin" />,
  ok: <CheckCircle2 className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: "Nieaktywne",
  testing: "Testowanie…",
  ok: "Połączono",
  error: "Błąd połączenia",
};

// ─── Helpers ───
const loadAllConfig = async (): Promise<ConfigMap> => {
  const { data } = await supabase.from("app_config").select("key, value");
  const map: ConfigMap = {};
  data?.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
  return map;
};

const saveConfigKeys = async (entries: { key: string; value: string }[]) => {
  for (const e of entries) {
    await supabase.from("app_config").upsert(
      { key: e.key, value: e.value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  }
};

// ─── Main Component ───
const IntegrationsPanel = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAllConfig().then(c => { setConfig(c); setLoading(false); });
  }, []);

  const updateField = (key: string, value: string) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const toggleSecret = (key: string) =>
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Ładowanie konfiguracji…</div>;

  return (
    <div className="space-y-8">
      <SupabaseSection config={config} updateField={updateField} showSecrets={showSecrets} toggleSecret={toggleSecret} toast={toast} />
      <AiSection config={config} updateField={updateField} showSecrets={showSecrets} toggleSecret={toggleSecret} toast={toast} />
      <SmtpSection config={config} updateField={updateField} showSecrets={showSecrets} toggleSecret={toggleSecret} toast={toast} />
      <WebhooksSection toast={toast} />
    </div>
  );
};

// ─── Status Badge ───
const StatusBadge = ({ status }: { status: ConnectionStatus }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
    {STATUS_ICONS[status]}
    {STATUS_LABELS[status]}
  </span>
);

// ─── Secret Input ───
const SecretInput = ({
  value, onChange, placeholder, show, onToggle
}: {
  value: string; onChange: (v: string) => void; placeholder: string; show: boolean; onToggle: () => void;
}) => (
  <div className="relative">
    <Input
      type={show ? "text" : "password"}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="pr-10"
    />
    <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </div>
);

// ─── Section Wrapper ───
const SectionCard = ({
  icon, title, description, status, children, onSave, onTest, saving, testing
}: {
  icon: React.ReactNode; title: string; description: string; status: ConnectionStatus;
  children: React.ReactNode; onSave: () => void; onTest: () => void; saving: boolean; testing: boolean;
}) => (
  <section className="rounded-lg border border-border bg-card p-6 card-glow">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          {icon} {title}
        </h2>
        <p className="text-xs text-muted-foreground font-body mt-1">{description}</p>
      </div>
      <StatusBadge status={status} />
    </div>
    <div className="space-y-4">{children}</div>
    <div className="mt-6 flex gap-2 justify-end flex-wrap">
      <Button variant="outline" size="sm" onClick={onTest} disabled={testing}>
        {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
        Testuj połączenie
      </Button>
      <Button size="sm" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
        Zapisz konfigurację
      </Button>
    </div>
  </section>
);

// ─── 1. Supabase Section ───
const SupabaseSection = ({ config, updateField, showSecrets, toggleSecret, toast }: any) => {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const url = config["custom_supabase_url"] || "";
  const key = config["custom_supabase_anon_key"] || "";

  useEffect(() => {
    if (url && key) setStatus("ok");
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setStatus("testing");
    try {
      if (!url || !key) {
        // Test default connection
        const { error } = await supabase.from("app_config").select("key").limit(1);
        setStatus(error ? "error" : "ok");
        toast({ title: error ? "Błąd połączenia" : "Połączono ✅", description: error ? error.message : "Domyślne połączenie działa poprawnie." });
      } else {
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(url, key);
        const { error } = await client.from("app_config").select("key").limit(1);
        setStatus(error ? "error" : "ok");
        toast({ title: error ? "Błąd połączenia" : "Połączono ✅", description: error ? error.message : "Własne połączenie Supabase działa poprawnie." });
      }
    } catch (e: any) {
      setStatus("error");
      toast({ title: "Błąd", description: e.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveConfigKeys([
      { key: "custom_supabase_url", value: url },
      { key: "custom_supabase_anon_key", value: key },
    ]);
    setSaving(false);
    toast({ title: "Zapisano ✅", description: "Konfiguracja Supabase zaktualizowana." });
  };

  return (
    <SectionCard
      icon={<Database className="h-5 w-5 text-primary" />}
      title="Supabase / Baza danych"
      description="Połączenie z bazą danych. Zostaw puste, aby korzystać z domyślnej instancji."
      status={status}
      onSave={handleSave} onTest={handleTest} saving={saving} testing={testing}
    >
      <div className="bg-muted/30 border border-border rounded-md p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Instrukcja:</strong> Dane dostępowe znajdziesz w Supabase → <em>Project Settings → API</em>.
          Skopiuj „Project URL" i „anon/public key".
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm"><Server className="h-3.5 w-3.5 text-primary" /> Supabase URL</Label>
          <Input value={url} onChange={e => updateField("custom_supabase_url", e.target.value)} placeholder="https://your-project.supabase.co" />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm"><Key className="h-3.5 w-3.5 text-primary" /> Supabase Key</Label>
          <SecretInput value={key} onChange={v => updateField("custom_supabase_anon_key", v)} placeholder="eyJhbGciOi..." show={showSecrets["custom_supabase_anon_key"] || false} onToggle={() => toggleSecret("custom_supabase_anon_key")} />
        </div>
      </div>
    </SectionCard>
  );
};

// ─── 2. AI Section ───
const AiSection = ({ config, updateField, showSecrets, toggleSecret, toast }: any) => {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const enabled = config["ai_enabled"] !== "false";
  const apiKey = config["custom_ai_api_key"] || "";
  const model = config["custom_ai_model"] || "";
  const endpoint = config["custom_ai_endpoint"] || "";

  const isCustomKey = !!apiKey.trim();
  const displayModel = model || (isCustomKey ? "gemini-2.5-flash" : "Lovable AI (domyślny)");

  useEffect(() => {
    if (enabled) setStatus("ok");
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setStatus("testing");
    try {
      if (!isCustomKey) {
        // Test Lovable AI gateway
        const resp = await supabase.functions.invoke("analyze-match-screenshot", {
          body: { test: true },
        });
        setStatus(resp.error ? "error" : "ok");
        toast({
          title: resp.error ? "Błąd AI" : "AI działa ✅",
          description: resp.error ? resp.error.message : "Lovable AI odpowiada poprawnie.",
        });
      } else {
        // Determine endpoint based on key prefix
        let testEndpoint = endpoint;
        if (!testEndpoint) {
          if (apiKey.startsWith("sk-")) testEndpoint = "https://api.openai.com/v1/chat/completions";
          else testEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
        }

        if (testEndpoint.includes("generativelanguage.googleapis.com")) {
          const url = `${testEndpoint}?key=${apiKey}`;
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Odpowiedz jednym słowem: OK" }] }] }),
          });
          setStatus(resp.ok ? "ok" : "error");
          toast({ title: resp.ok ? "Gemini działa ✅" : "Błąd Gemini", description: resp.ok ? "Model odpowiada poprawnie." : `HTTP ${resp.status}` });
        } else {
          const resp = await fetch(testEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: model || "gpt-4o", messages: [{ role: "user", content: "Odpowiedz jednym słowem: OK" }], max_tokens: 5 }),
          });
          setStatus(resp.ok ? "ok" : "error");
          toast({ title: resp.ok ? "AI działa ✅" : "Błąd AI", description: resp.ok ? "Model odpowiada poprawnie." : `HTTP ${resp.status}` });
        }
      }
    } catch (e: any) {
      setStatus("error");
      toast({ title: "Błąd", description: e.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveConfigKeys([
      { key: "ai_enabled", value: enabled ? "true" : "false" },
      { key: "custom_ai_api_key", value: apiKey },
      { key: "custom_ai_model", value: model },
      { key: "custom_ai_endpoint", value: endpoint },
    ]);
    setSaving(false);
    toast({ title: "Zapisano ✅", description: "Konfiguracja AI zaktualizowana." });
  };

  return (
    <SectionCard
      icon={<Brain className="h-5 w-5 text-primary" />}
      title="AI / Model"
      description="Konfiguracja integracji AI do analizy screenshotów i innych funkcji."
      status={enabled ? status : "idle"}
      onSave={handleSave} onTest={handleTest} saving={saving} testing={testing}
    >
      <div className="bg-muted/30 border border-border rounded-md p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Instrukcja:</strong> Domyślnie używany jest Lovable AI. Aby użyć własnego modelu,
          wpisz klucz API (OpenAI <code>sk-...</code> lub Gemini <code>AIza...</code>).
          Model <strong>Gemini 2.5 Flash</strong> oferuje darmowy tier z limitem zapytań.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Label className="font-medium text-foreground">Włącz integrację AI</Label>
        <Switch checked={enabled} onCheckedChange={v => updateField("ai_enabled", v ? "true" : "false")} />
      </div>

      {enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">API Key (opcjonalnie)</Label>
            <SecretInput value={apiKey} onChange={v => updateField("custom_ai_api_key", v)} placeholder="sk-... lub AIza..." show={showSecrets["custom_ai_api_key"] || false} onToggle={() => toggleSecret("custom_ai_api_key")} />
            <p className="text-xs text-muted-foreground">Zostaw puste, aby korzystać z Lovable AI</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Model</Label>
            <Input value={model} onChange={e => updateField("custom_ai_model", e.target.value)} placeholder={isCustomKey ? "gemini-2.0-flash" : "Lovable AI (automatycznie)"} />
            <p className="text-xs text-muted-foreground">Aktualnie: <strong>{displayModel}</strong></p>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm">Endpoint (opcjonalnie)</Label>
            <Input value={endpoint} onChange={e => updateField("custom_ai_endpoint", e.target.value)} placeholder="https://api.openai.com/v1/chat/completions" />
            <p className="text-xs text-muted-foreground">Zostaw puste dla auto-wykrywania na podstawie klucza</p>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

// ─── 3. SMTP Section ───
const SmtpSection = ({ config, updateField, showSecrets, toggleSecret, toast }: any) => {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const enabled = config["smtp_enabled"] !== "false";
  const host = config["smtp_host"] || "";
  const port = config["smtp_port"] || "587";
  const email = config["smtp_email"] || "";
  const password = config["smtp_password"] || "";

  useEffect(() => {
    if (enabled && host && email) setStatus("ok");
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setStatus("testing");
    try {
      // We can't directly test SMTP from browser, so we invoke an edge function
      const { error } = await supabase.functions.invoke("process-email-queue", {
        body: { test: true },
      });
      setStatus(error ? "error" : "ok");
      toast({
        title: error ? "Błąd SMTP" : "E-mail wysłany ✅",
        description: error ? error.message : "Testowy e-mail został wysłany.",
      });
    } catch (e: any) {
      setStatus("error");
      toast({ title: "Błąd", description: e.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveConfigKeys([
      { key: "smtp_enabled", value: enabled ? "true" : "false" },
      { key: "smtp_host", value: host },
      { key: "smtp_port", value: port },
      { key: "smtp_email", value: email },
      { key: "smtp_password", value: password },
    ]);
    setSaving(false);
    toast({ title: "Zapisano ✅", description: "Konfiguracja SMTP zaktualizowana." });
  };

  return (
    <SectionCard
      icon={<Mail className="h-5 w-5 text-primary" />}
      title="Mail / SMTP"
      description="Konfiguracja wysyłki e-maili systemowych (rejestracja, reset hasła, powiadomienia)."
      status={enabled ? status : "idle"}
      onSave={handleSave} onTest={handleTest} saving={saving} testing={testing}
    >
      <div className="bg-muted/30 border border-border rounded-md p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Instrukcja:</strong> Dane SMTP uzyskasz od dostawcy poczty dla domeny <em>edartpolska.pl</em>.
          Typowe ustawienia: Host: <code>smtp.dostawca.pl</code>, Port: <code>587</code> (TLS).
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Label className="font-medium text-foreground">Włącz wysyłkę e-maili</Label>
        <Switch checked={enabled} onCheckedChange={v => updateField("smtp_enabled", v ? "true" : "false")} />
      </div>

      {enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">SMTP Host</Label>
            <Input value={host} onChange={e => updateField("smtp_host", e.target.value)} placeholder="smtp.dostawca.pl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Port</Label>
            <Input value={port} onChange={e => updateField("smtp_port", e.target.value)} placeholder="587" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">E-mail nadawcy</Label>
            <Input value={email} onChange={e => updateField("smtp_email", e.target.value)} placeholder="noreply@edartpolska.pl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Hasło</Label>
            <SecretInput value={password} onChange={v => updateField("smtp_password", v)} placeholder="••••••••" show={showSecrets["smtp_password"] || false} onToggle={() => toggleSecret("smtp_password")} />
          </div>
        </div>
      )}
    </SectionCard>
  );
};

// ─── 4. Webhooks Section ───
interface WebhookEntry {
  id: string;
  webhook_url: string;
  label: string;
  enabled: boolean;
  league_id: string | null;
}

const WebhooksSection = ({ toast }: { toast: any }) => {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("match_result");
  const [saving, setSaving] = useState(false);

  const loadWebhooks = useCallback(async () => {
    const { data } = await supabase.from("discord_webhooks").select("id, webhook_url, label, enabled, league_id");
    setWebhooks((data as WebhookEntry[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const addWebhook = async () => {
    if (!newUrl.trim()) { toast({ title: "Wpisz URL webhooka", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("discord_webhooks").insert({
      webhook_url: newUrl.trim(),
      label: newLabel.trim() || newType,
      enabled: true,
    });
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Webhook dodany ✅" });
      setNewUrl(""); setNewLabel("");
      await loadWebhooks();
    }
    setSaving(false);
  };

  const toggleWebhook = async (id: string, enabled: boolean) => {
    await supabase.from("discord_webhooks").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id);
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, enabled } : w));
  };

  const deleteWebhook = async (id: string) => {
    await supabase.from("discord_webhooks").delete().eq("id", id);
    setWebhooks(prev => prev.filter(w => w.id !== id));
    toast({ title: "Webhook usunięty" });
  };

  const testWebhook = async (url: string) => {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "🏓 Test webhooka z eDART Polska — połączenie działa!" }),
      });
      toast({ title: resp.ok ? "Test OK ✅" : `Błąd HTTP ${resp.status}`, variant: resp.ok ? "default" : "destructive" });
    } catch (e: any) {
      toast({ title: "Błąd połączenia", description: e.message, variant: "destructive" });
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-6 card-glow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> Webhooki / Integracje zewnętrzne
          </h2>
          <p className="text-xs text-muted-foreground font-body mt-1">
            Zarządzaj webhookami do zewnętrznych systemów (Discord, Slack, itp.)
          </p>
        </div>
        <StatusBadge status={webhooks.some(w => w.enabled) ? "ok" : "idle"} />
      </div>

      <div className="bg-muted/30 border border-border rounded-md p-3 mb-4">
        <p className="text-xs text-muted-foreground">
          <strong>Instrukcja:</strong> URL webhooka wygenerujesz w ustawieniach zewnętrznej aplikacji
          (np. Discord → Ustawienia serwera → Integracje → Webhooki → Nowy webhook).
        </p>
      </div>

      {/* Existing webhooks */}
      {!loading && webhooks.length > 0 && (
        <div className="space-y-3 mb-4">
          {webhooks.map(w => (
            <div key={w.id} className="flex items-center gap-3 rounded-md bg-muted/20 border border-border p-3">
              <Switch checked={w.enabled} onCheckedChange={v => toggleWebhook(w.id, v)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{w.label || "Webhook"}</p>
                <p className="text-xs text-muted-foreground truncate">{w.webhook_url}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => testWebhook(w.webhook_url)}>
                <TestTube className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteWebhook(w.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Dodaj nowy webhook</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Etykieta (np. Discord #wyniki)" />
          <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="md:col-span-2" />
        </div>
        <div className="flex gap-2">
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match_result">Wynik meczu</SelectItem>
              <SelectItem value="player_join">Dołączenie gracza</SelectItem>
              <SelectItem value="announcement">Ogłoszenie</SelectItem>
              <SelectItem value="custom">Własny</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addWebhook} disabled={saving}>
            <Plus className="h-4 w-4 mr-1" /> Dodaj
          </Button>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsPanel;
