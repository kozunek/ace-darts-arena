import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Check, TestTube, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EVENT_TYPES = [
  { value: "match_result", label: "🏆 Wyniki meczów", description: "Powiadomienia o zatwierdzonych wynikach" },
  { value: "new_player", label: "👤 Nowi gracze", description: "Gdy nowy gracz dołączy do systemu" },
  { value: "announcement", label: "📢 Ogłoszenia", description: "Nowe ogłoszenia od adminów" },
  { value: "league_registration", label: "📋 Zapisy do lig", description: "Gdy gracz zapisze się do ligi" },
  { value: "walkover", label: "⚠️ Walkowery", description: "Powiadomienia o walkowerach" },
  { value: "match_proposal", label: "📅 Propozycje terminów", description: "Nowe propozycje terminów meczów" },
];

interface Webhook {
  id?: string;
  league_id: string | null;
  webhook_url: string;
  enabled: boolean;
  label: string;
  event_types: string[];
  isNew?: boolean;
}

const DiscordWebhookPanel = ({ leagues }: { leagues: any[] }) => {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    const { data } = await supabase
      .from("discord_webhooks" as any)
      .select("*")
      .order("created_at", { ascending: true });

    if (data) {
      setWebhooks((data as any[]).map((w: any) => ({
        id: w.id,
        league_id: w.league_id,
        webhook_url: w.webhook_url,
        enabled: w.enabled,
        label: w.label || "",
        event_types: w.event_types || ["match_result"],
      })));
    }
    setLoading(false);
  };

  const addNew = () => {
    setWebhooks(prev => [...prev, {
      league_id: null,
      webhook_url: "",
      enabled: true,
      label: "",
      event_types: ["match_result"],
      isNew: true,
    }]);
  };

  const updateLocal = (index: number, changes: Partial<Webhook>) => {
    setWebhooks(prev => prev.map((w, i) => i === index ? { ...w, ...changes } : w));
  };

  const toggleEventType = (index: number, eventType: string) => {
    const wh = webhooks[index];
    const current = wh.event_types || [];
    const updated = current.includes(eventType)
      ? current.filter(t => t !== eventType)
      : [...current, eventType];
    updateLocal(index, { event_types: updated });
  };

  const handleSave = async (index: number) => {
    const wh = webhooks[index];
    const key = wh.id || `new-${index}`;
    setSavingId(key);
    try {
      const { data, error } = await supabase.functions.invoke("discord-webhook", {
        body: {
          action: "save_webhook",
          id: wh.id || undefined,
          league_id: wh.league_id,
          webhook_url: wh.webhook_url,
          enabled: wh.enabled,
          label: wh.label,
          event_types: wh.event_types,
        },
      });

      if (error) throw error;
      toast({ title: "✅ Zapisano!", description: "Webhook Discord został zaktualizowany." });
      await loadWebhooks();
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message || "Nie udało się zapisać.", variant: "destructive" });
    }
    setSavingId(null);
  };

  const handleDelete = async (index: number) => {
    const wh = webhooks[index];
    if (wh.isNew) {
      setWebhooks(prev => prev.filter((_, i) => i !== index));
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("discord-webhook", {
        body: { action: "delete_webhook", id: wh.id },
      });
      if (error) throw error;
      toast({ title: "Usunięto", description: "Webhook został usunięty." });
      await loadWebhooks();
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    }
  };

  const handleTest = async (index: number) => {
    const wh = webhooks[index];
    const key = wh.id || `new-${index}`;
    setTestingId(key);
    try {
      const { data, error } = await supabase.functions.invoke("discord-webhook", {
        body: { action: "test", webhook_url: wh.webhook_url },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Wysłano!", description: "Wiadomość testowa została wysłana na Discord." });
      } else {
        toast({ title: "Błąd", description: data?.error || "Nie udało się wysłać.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    }
    setTestingId(null);
  };

  if (loading) return <p className="text-muted-foreground font-body text-sm">Ładowanie...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 card-glow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#5865F2]" /> Integracja z Discord
          </h3>
          <Button variant="outline" size="sm" onClick={addNew}>
            <Plus className="h-4 w-4 mr-1" /> Dodaj webhook
          </Button>
        </div>
        <p className="text-sm text-muted-foreground font-body mb-6">
          Każda liga/turniej może mieć własny webhook Discord. Wybierz jakie powiadomienia mają być wysyłane na dany kanał.
        </p>

        {webhooks.length === 0 && (
          <p className="text-center text-muted-foreground py-8 font-body">
            Brak skonfigurowanych webhooków. Kliknij „Dodaj webhook" aby dodać pierwszy.
          </p>
        )}

        <div className="space-y-4">
          {webhooks.map((wh, index) => {
            const key = wh.id || `new-${index}`;
            const leagueName = wh.league_id
              ? leagues.find(l => l.id === wh.league_id)?.name
              : null;

            return (
              <div key={key} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={wh.enabled}
                      onCheckedChange={(v) => updateLocal(index, { enabled: v })}
                    />
                    <span className="text-sm font-body text-foreground">
                      {wh.label || leagueName || "Globalny webhook"}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(index)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Etykieta (opcjonalna)</Label>
                    <Input
                      value={wh.label}
                      onChange={(e) => updateLocal(index, { label: e.target.value })}
                      placeholder="np. Kanał wyników"
                      className="bg-muted/30 border-border text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Liga / Turniej</Label>
                    <Select
                      value={wh.league_id || "__global__"}
                      onValueChange={(v) => updateLocal(index, { league_id: v === "__global__" ? null : v })}
                    >
                      <SelectTrigger className="bg-muted/30 border-border text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__global__">🌐 Wszystkie ligi (globalny)</SelectItem>
                        {leagues.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name} — {l.season}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                  <Input
                    type="url"
                    value={wh.webhook_url}
                    onChange={(e) => updateLocal(index, { webhook_url: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="bg-muted/30 border-border font-mono text-sm"
                  />
                </div>

                {/* Event types */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Typy powiadomień</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EVENT_TYPES.map((et) => (
                      <label
                        key={et.value}
                        className="flex items-start gap-2 rounded-lg border border-border bg-muted/10 p-2.5 cursor-pointer hover:bg-muted/20 transition-colors"
                      >
                        <Checkbox
                          checked={wh.event_types.includes(et.value)}
                          onCheckedChange={() => toggleEventType(index, et.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-xs font-display text-foreground">{et.label}</div>
                          <div className="text-[10px] text-muted-foreground">{et.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => handleSave(index)}
                    disabled={savingId === key || !wh.webhook_url.trim() || wh.event_types.length === 0}
                  >
                    <Check className="h-4 w-4 mr-1" /> {savingId === key ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(index)}
                    disabled={testingId === key || !wh.webhook_url.trim()}
                  >
                    <TestTube className="h-4 w-4 mr-1" /> {testingId === key ? "Wysyłanie..." : "Test"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-card p-6 card-glow">
        <h4 className="font-display font-bold text-foreground mb-3 text-sm">Przykładowe wiadomości na Discord</h4>
        <div className="space-y-3">
          <div className="rounded-lg bg-[#36393f] p-4 text-sm space-y-1">
            <div className="text-[#b9bbbe] text-xs mb-2">🎯 <span className="text-white font-semibold">eDART Polska</span></div>
            <div className="border-l-4 border-[#57F287] pl-3 space-y-1">
              <div className="text-white font-bold">🏆 Wynik meczu — Liga Sezon 1</div>
              <div className="text-[#dcddde]">
                <span className="text-[#00b0f4] font-semibold">Jan Kowalski</span> <span className="text-white font-bold text-lg">3</span> : <span className="text-white font-bold text-lg">1</span> <span className="text-[#00b0f4] font-semibold">Adam Nowak</span>
              </div>
              <div className="text-[#b9bbbe] text-xs">📊 Średnia: 65.2 / 58.1 · 🎯 180s: 2 / 0</div>
            </div>
          </div>
          <div className="rounded-lg bg-[#36393f] p-4 text-sm space-y-1">
            <div className="text-[#b9bbbe] text-xs mb-2">🎯 <span className="text-white font-semibold">eDART Polska</span></div>
            <div className="border-l-4 border-[#5865F2] pl-3 space-y-1">
              <div className="text-white font-bold">👤 Nowy gracz dołączył!</div>
              <div className="text-[#dcddde]">Witamy <span className="text-[#00b0f4] font-semibold">Piotr Wiśniewski</span> w eDART Polska!</div>
            </div>
          </div>
          <div className="rounded-lg bg-[#36393f] p-4 text-sm space-y-1">
            <div className="text-[#b9bbbe] text-xs mb-2">🎯 <span className="text-white font-semibold">eDART Polska</span></div>
            <div className="border-l-4 border-[#FEE75C] pl-3 space-y-1">
              <div className="text-white font-bold">📢 Nowe ogłoszenie</div>
              <div className="text-[#dcddde]">Zmiana regulaminu — nowe zasady od poniedziałku</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordWebhookPanel;
