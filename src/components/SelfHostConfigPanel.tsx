import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, Server, Key, Brain, Globe } from "lucide-react";

interface ConfigEntry {
  key: string;
  value: string;
}

const CONFIG_FIELDS = [
  {
    key: "custom_supabase_url",
    label: "Supabase URL",
    icon: Server,
    placeholder: "https://your-project.supabase.co",
    description: "URL Twojego projektu Supabase (zostaw puste, aby używać domyślnego)",
    sensitive: false,
  },
  {
    key: "custom_supabase_anon_key",
    label: "Supabase Anon Key",
    icon: Key,
    placeholder: "eyJhbGciOi...",
    description: "Klucz publiczny (anon key) Twojego projektu Supabase",
    sensitive: true,
  },
  {
    key: "custom_ai_api_key",
    label: "AI API Key",
    icon: Brain,
    placeholder: "sk-... lub AIza...",
    description: "Klucz API do usługi AI (OpenAI, Gemini itp.) — zostaw puste dla domyślnego",
    sensitive: true,
  },
  {
    key: "custom_site_url",
    label: "Adres strony (domena)",
    icon: Globe,
    placeholder: "https://twoja-domena.pl",
    description: "Własna domena strony — po podaniu logowanie przełącza się na standardowe Supabase Auth (bez Lovable OAuth)",
    sensitive: false,
  },
];

const SelfHostConfigPanel = () => {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from("app_config")
      .select("key, value");

    if (data) {
      const map: Record<string, string> = {};
      data.forEach((row: ConfigEntry) => {
        map[row.key] = row.value;
      });
      setValues(map);
    }
    if (error) console.error("Error loading config:", error);
    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      for (const field of CONFIG_FIELDS) {
        const val = values[field.key] ?? "";
        // Try update first, then upsert if no rows matched
        const { error, count } = await supabase
          .from("app_config")
          .update({ value: val, updated_at: new Date().toISOString() })
          .eq("key", field.key);

        if (error) throw error;
      }
      toast({ title: "Zapisano", description: "Konfiguracja została zaktualizowana. Odśwież stronę, aby zastosować zmiany." });
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isSelfHosted = Boolean(values["custom_supabase_url"] && values["custom_supabase_anon_key"]);

  if (loading) {
    return <div className="text-muted-foreground text-sm py-8 text-center">Ładowanie konfiguracji...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-accent/30 border border-border rounded-lg p-4">
        <h3 className="font-display font-bold text-foreground mb-1">🔧 Self-Hosting / Własna konfiguracja</h3>
        <p className="text-sm text-muted-foreground">
          Podłącz własny projekt Supabase lub klucz AI. Puste pola oznaczają użycie domyślnych ustawień.
        </p>
      </div>

      {isSelfHosted && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <p className="text-sm text-primary font-medium">
            ✅ Tryb self-host aktywny — logowanie używa standardowego Supabase Auth zamiast Lovable OAuth.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {CONFIG_FIELDS.map((field) => {
          const Icon = field.icon;
          const isSecret = field.sensitive;
          const shown = showSecrets[field.key];

          return (
            <div key={field.key} className="space-y-1.5">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <Icon className="h-4 w-4 text-primary" />
                {field.label}
              </Label>
              <p className="text-xs text-muted-foreground">{field.description}</p>
              <div className="relative">
                <Input
                  type={isSecret && !shown ? "password" : "text"}
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="pr-10"
                />
                {isSecret && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={saveConfig} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Zapisywanie..." : "Zapisz konfigurację"}
      </Button>
    </div>
  );
};

export default SelfHostConfigPanel;
