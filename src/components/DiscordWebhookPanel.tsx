import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Check, TestTube, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EVENT_TYPES = [
  { value: "match_result", label: "🏆 Wyniki meczów", description: "Pełne statystyki po zatwierdzonym meczu" },
  { value: "walkover", label: "⚠️ Walkowery", description: "Powiadomienia o walkowerach" },
  { value: "match_proposal", label: "📅 Propozycje terminów", description: "Nowe propozycje terminów meczów" },
  { value: "match_proposal_accepted", label: "✅ Termin zaakceptowany", description: "Gdy gracz zaakceptuje termin" },
  { value: "match_pending", label: "⏳ Mecz do zatwierdzenia", description: "Zgłoszony wynik czeka na akceptację" },
  { value: "new_player", label: "👤 Nowi gracze", description: "Gdy nowy gracz dołączy do systemu" },
  { value: "announcement", label: "📢 Ogłoszenia", description: "Nowe ogłoszenia od adminów" },
  { value: "league_registration", label: "📋 Zapisy do lig", description: "Gdy gracz zapisze się do ligi" },
  { value: "league_unregistration", label: "📤 Wypisanie z ligi", description: "Gdy gracz wypisze się z ligi" },
  { value: "league_started", label: "🚀 Start ligi", description: "Gdy liga zostanie uruchomiona" },
  { value: "league_ended", label: "🏁 Koniec ligi", description: "Gdy liga zostanie zakończona" },
  { value: "disqualification", label: "🚫 Dyskwalifikacja", description: "Gdy gracz zostanie zdyskwalifikowany" },
  { value: "weekly_challenge", label: "🎖️ Wyzwania tygodnia", description: "Nowe wyzwania tygodniowe" },
  { value: "high_score_alert", label: "🔥 Wybitny wynik", description: "180, 9-darter, wysoki checkout" },
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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => { loadWebhooks(); }, []);

  const loadWebhooks = async () => {
    const { data } = await supabase
      .from("discord_webhooks" as any)
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setWebhooks((data as any[]).map((w: any) => ({
        id: w.id, league_id: w.league_id, webhook_url: w.webhook_url,
        enabled: w.enabled, label: w.label || "", event_types: w.event_types || ["match_result"],
      })));
    }
    setLoading(false);
  };

  const addNew = () => {
    const newIdx = webhooks.length;
    setWebhooks(prev => [...prev, {
      league_id: null, webhook_url: "", enabled: true, label: "",
      event_types: ["match_result"], isNew: true,
    }]);
    setExpandedIdx(newIdx);
  };

  const updateLocal = (index: number, changes: Partial<Webhook>) => {
    setWebhooks(prev => prev.map((w, i) => i === index ? { ...w, ...changes } : w));
  };

  const toggleEventType = (index: number, eventType: string) => {
    const wh = webhooks[index];
    const current = wh.event_types || [];
    const updated = current.includes(eventType) ? current.filter(t => t !== eventType) : [...current, eventType];
    updateLocal(index, { event_types: updated });
  };

  const selectAllEvents = (index: number) => {
    updateLocal(index, { event_types: EVENT_TYPES.map(e => e.value) });
  };

  const deselectAllEvents = (index: number) => {
    updateLocal(index, { event_types: [] });
  };

  const handleSave = async (index: number) => {
    const wh = webhooks[index];
    const key = wh.id || `new-${index}`;
    setSavingId(key);
    try {
      const { error } = await supabase.functions.invoke("discord-webhook", {
        body: {
          action: "save_webhook", id: wh.id || undefined,
          league_id: wh.league_id, webhook_url: wh.webhook_url,
          enabled: wh.enabled, label: wh.label, event_types: wh.event_types,
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
    if (wh.isNew) { setWebhooks(prev => prev.filter((_, i) => i !== index)); return; }
    try {
      const { error } = await supabase.functions.invoke("discord-webhook", { body: { action: "delete_webhook", id: wh.id } });
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
          Każda liga/turniej może mieć własny webhook Discord z wybranymi typami powiadomień ({EVENT_TYPES.length} dostępnych).
        </p>

        {webhooks.length === 0 && (
          <p className="text-center text-muted-foreground py-8 font-body">
            Brak skonfigurowanych webhooków. Kliknij „Dodaj webhook" aby dodać pierwszy.
          </p>
        )}

        <div className="space-y-3">
          {webhooks.map((wh, index) => {
            const key = wh.id || `new-${index}`;
            const leagueName = wh.league_id ? leagues.find(l => l.id === wh.league_id)?.name : null;
            const isExpanded = expandedIdx === index;

            return (
              <div key={key} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                {/* Header row - always visible */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Switch checked={wh.enabled} onCheckedChange={(v) => updateLocal(index, { enabled: v })} />
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : index)}
                      className="flex items-center gap-1.5 min-w-0 text-left"
                    >
                      <span className="text-sm font-display text-foreground truncate">
                        {wh.label || leagueName || "Globalny webhook"}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        ({wh.event_types.length} zdarzeń)
                      </span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(index)} className="text-destructive hover:text-destructive shrink-0 h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Etykieta</Label>
                        <Input value={wh.label} onChange={(e) => updateLocal(index, { label: e.target.value })} placeholder="np. Kanał wyników" className="bg-muted/30 border-border text-sm h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Liga / Turniej</Label>
                        <Select value={wh.league_id || "__global__"} onValueChange={(v) => updateLocal(index, { league_id: v === "__global__" ? null : v })}>
                          <SelectTrigger className="bg-muted/30 border-border text-sm h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__global__">🌐 Wszystkie ligi (globalny)</SelectItem>
                            {leagues.map(l => (<SelectItem key={l.id} value={l.id}>{l.name} — {l.season}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                      <Input type="url" value={wh.webhook_url} onChange={(e) => updateLocal(index, { webhook_url: e.target.value })} placeholder="https://discord.com/api/webhooks/..." className="bg-muted/30 border-border font-mono text-sm h-8" />
                    </div>

                    {/* Event types with select/deselect all */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Typy powiadomień</Label>
                        <div className="flex gap-2">
                          <button onClick={() => selectAllEvents(index)} className="text-[10px] text-primary hover:underline">Zaznacz wszystkie</button>
                          <button onClick={() => deselectAllEvents(index)} className="text-[10px] text-muted-foreground hover:underline">Odznacz</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {EVENT_TYPES.map((et) => (
                          <label key={et.value} className="flex items-center gap-2 rounded border border-border bg-muted/10 px-2.5 py-1.5 cursor-pointer hover:bg-muted/20 transition-colors">
                            <Checkbox checked={wh.event_types.includes(et.value)} onCheckedChange={() => toggleEventType(index, et.value)} />
                            <div className="min-w-0">
                              <div className="text-[11px] font-display text-foreground truncate">{et.label}</div>
                              <div className="text-[9px] text-muted-foreground truncate">{et.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button variant="hero" size="sm" onClick={() => handleSave(index)} disabled={savingId === key || !wh.webhook_url.trim() || wh.event_types.length === 0}>
                        <Check className="h-4 w-4 mr-1" /> {savingId === key ? "Zapisywanie..." : "Zapisz"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTest(index)} disabled={testingId === key || !wh.webhook_url.trim()}>
                        <TestTube className="h-4 w-4 mr-1" /> {testingId === key ? "Wysyłanie..." : "Test"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-card p-6 card-glow">
        <h4 className="font-display font-bold text-foreground mb-3 text-sm">Przykładowe wiadomości na Discord</h4>
        <div className="space-y-3">
          {/* Match result */}
          <div className="rounded-lg bg-[#36393f] p-3 text-sm">
            <div className="text-[#b9bbbe] text-[10px] mb-1.5">🎯 <span className="text-white font-semibold">eDART Polska</span></div>
            <div className="border-l-4 border-[#57F287] pl-3 space-y-1">
              <div className="text-white font-bold text-xs">🏆 Wynik meczu — Liga Sezon 1</div>
              <div className="text-[#dcddde] text-xs">
                <span className="text-[#00b0f4] font-semibold">Jan Kowalski</span> <span className="text-white font-bold">3</span> : <span className="text-white font-bold">1</span> <span className="text-[#00b0f4] font-semibold">Adam Nowak</span>
              </div>
              <div className="text-[#b9bbbe] text-[10px] space-y-0.5">
                <div>📊 Średnia: 65.20 / 58.10 · First 9: 72.30 / 61.50</div>
                <div>🎯 180s: 2 / 0 · High CO: 104 / 0</div>
                <div>🎲 60+: 5/3 · 100+: 4/2 · 140+: 1/0 · 170+: 0/0</div>
                <div>🎯 Lotki: 156 / 172 · CO%: 28.57% (2/7) / 20.00% (1/5)</div>
              </div>
            </div>
          </div>
          {/* Walkover */}
          <div className="rounded-lg bg-[#36393f] p-3 text-sm">
            <div className="text-[#b9bbbe] text-[10px] mb-1.5">🎯 <span className="text-white font-semibold">eDART Polska</span></div>
            <div className="border-l-4 border-[#ED4245] pl-3 space-y-1">
              <div className="text-white font-bold text-xs">⚠️ Walkower — Liga Sezon 1</div>
              <div className="text-[#dcddde] text-xs">Jan Kowalski 3 : 0 Adam Nowak — wygrywa Jan Kowalski</div>
            </div>
          </div>
          {/* New player */}
          <div className="rounded-lg bg-[#36393f] p-3 text-sm">
            <div className="text-[#b9bbbe] text-[10px] mb-1.5">🎯 <span className="text-white font-semibold">eDART Polska</span></div>
            <div className="border-l-4 border-[#5865F2] pl-3">
              <div className="text-white font-bold text-xs">👤 Nowy gracz dołączył!</div>
              <div className="text-[#dcddde] text-xs">Witamy <span className="text-[#00b0f4]">Piotr Wiśniewski</span> w eDART Polska! 🎯</div>
            </div>
          </div>
          {/* High score alert */}
          <div className="rounded-lg bg-[#36393f] p-3 text-sm">
            <div className="text-[#b9bbbe] text-[10px] mb-1.5">🎯 <span className="text-white font-semibold">eDART Polska</span></div>
            <div className="border-l-4 border-[#FFA500] pl-3">
              <div className="text-white font-bold text-xs">🔥 Wybitny wynik!</div>
              <div className="text-[#dcddde] text-xs">Jan Kowalski rzucił <span className="text-[#FFA500] font-bold">2x 180</span> i checkout <span className="text-[#FFA500] font-bold">170</span> w meczu vs Adam Nowak!</div>
            </div>
          </div>
          {/* League registration */}
          <div className="rounded-lg bg-[#36393f] p-3 text-sm">
            <div className="text-[#b9bbbe] text-[10px] mb-1.5">🎯 <span className="text-white font-semibold">eDART Polska</span></div>
            <div className="border-l-4 border-[#00b0f4] pl-3">
              <div className="text-white font-bold text-xs">📋 Nowy zapis do ligi</div>
              <div className="text-[#dcddde] text-xs">Piotr zapisał się do <span className="text-[#00b0f4]">Liga Sezon 2</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordWebhookPanel;
