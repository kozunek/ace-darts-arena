import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Save, CheckCircle2 } from "lucide-react";

const CONFIG_KEYS = {
  siteName: "email_site_name",
  senderDomain: "email_sender_domain",
  fromDomain: "email_from_domain",
  rootDomain: "email_root_domain",
};

const EmailConfigPanel = () => {
  const { toast } = useToast();
  const [siteName, setSiteName] = useState("eDART Polska");
  const [senderDomain, setSenderDomain] = useState("notify.edartpolska.pl");
  const [fromDomain, setFromDomain] = useState("edartpolska.pl");
  const [rootDomain, setRootDomain] = useState("edartpolska.pl");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", Object.values(CONFIG_KEYS));

    if (data) {
      for (const row of data) {
        if (row.key === CONFIG_KEYS.siteName) setSiteName(row.value);
        if (row.key === CONFIG_KEYS.senderDomain) setSenderDomain(row.value);
        if (row.key === CONFIG_KEYS.fromDomain) setFromDomain(row.value);
        if (row.key === CONFIG_KEYS.rootDomain) setRootDomain(row.value);
      }
    }
    setLoaded(true);
  };

  const saveConfig = async () => {
    setSaving(true);
    const entries = [
      { key: CONFIG_KEYS.siteName, value: siteName },
      { key: CONFIG_KEYS.senderDomain, value: senderDomain },
      { key: CONFIG_KEYS.fromDomain, value: fromDomain },
      { key: CONFIG_KEYS.rootDomain, value: rootDomain },
    ];

    for (const entry of entries) {
      await supabase
        .from("app_config")
        .upsert(
          { key: entry.key, value: entry.value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
    }

    setSaving(false);
    toast({ title: "Zapisano ✅", description: "Konfiguracja e-mail została zaktualizowana." });
  };

  if (!loaded) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-6 card-glow">
      <h2 className="text-lg font-display font-bold text-foreground mb-2 flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" /> Konfiguracja E-mail
      </h2>
      <p className="text-xs text-muted-foreground font-body mb-6">
        Ustawienia nadawcy wiadomości e-mail (rejestracja, reset hasła, weryfikacja itp.)
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-body text-sm">Nazwa nadawcy</Label>
          <Input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="eDART Polska"
          />
          <p className="text-xs text-muted-foreground">Nazwa wyświetlana w polu „Od" w e-mailu</p>
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm">Domena wysyłki (sender domain)</Label>
          <Input
            value={senderDomain}
            onChange={(e) => setSenderDomain(e.target.value)}
            placeholder="notify.edartpolska.pl"
          />
          <p className="text-xs text-muted-foreground">Subdomena z której wysyłane są e-maile</p>
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm">Domena nadawcy (from)</Label>
          <Input
            value={fromDomain}
            onChange={(e) => setFromDomain(e.target.value)}
            placeholder="edartpolska.pl"
          />
          <p className="text-xs text-muted-foreground">Domena w adresie noreply@…</p>
        </div>

        <div className="space-y-2">
          <Label className="font-body text-sm">Domena główna (root)</Label>
          <Input
            value={rootDomain}
            onChange={(e) => setRootDomain(e.target.value)}
            placeholder="edartpolska.pl"
          />
          <p className="text-xs text-muted-foreground">Domena używana w linkach w treści e-maili</p>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-md bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground font-body">
          <strong>Podgląd:</strong> E-maile będą wysyłane jako{" "}
          <span className="text-foreground font-medium">{siteName} &lt;noreply@{fromDomain}&gt;</span>{" "}
          z linkami kierującymi na{" "}
          <span className="text-foreground font-medium">https://{rootDomain}</span>
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? (
            <>Zapisywanie...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" /> Zapisz konfigurację
            </>
          )}
        </Button>
      </div>
    </section>
  );
};

export default EmailConfigPanel;
