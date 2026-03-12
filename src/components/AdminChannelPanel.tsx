import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Hash, Lock, Trophy, Monitor, Save, MessageCircle } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description: string;
  channel_type: string;
  league_id: string | null;
  platform: string | null;
}

interface CustomRole {
  id: string;
  name: string;
}

const SYSTEM_ROLES = [
  { key: "admin", label: "🛡️ Admin" },
  { key: "moderator", label: "⚡ Moderator" },
  { key: "user", label: "👤 Gracz" },
];

const AdminChannelPanel = () => {
  const { toast } = useToast();
  const { leagues } = useLeague();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [channelRoles, setChannelRoles] = useState<{ id: string; channel_id: string; role_id: string }[]>([]);
  const [channelSystemRoles, setChannelSystemRoles] = useState<{ id: string; channel_id: string; system_role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Channel }>({ open: false });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channelType, setChannelType] = useState("custom");
  const [leagueId, setLeagueId] = useState("");
  const [platform, setPlatform] = useState("");
  const [selectedCustomRoles, setSelectedCustomRoles] = useState<Set<string>>(new Set());
  const [selectedSystemRoles, setSelectedSystemRoles] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [chRes, rolesRes, crRes, csrRes] = await Promise.all([
      supabase.from("group_channels").select("*").order("created_at"),
      supabase.from("custom_roles").select("id, name").order("name"),
      supabase.from("group_channel_roles").select("*"),
      supabase.from("group_channel_system_roles").select("*"),
    ]);
    setChannels((chRes.data || []) as Channel[]);
    setCustomRoles((rolesRes.data || []) as CustomRole[]);
    setChannelRoles((crRes.data || []) as any[]);
    setChannelSystemRoles((csrRes.data || []) as any[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCreate = () => {
    setName(""); setDescription(""); setChannelType("custom");
    setLeagueId(""); setPlatform("");
    setSelectedCustomRoles(new Set()); setSelectedSystemRoles(new Set());
    setDialog({ open: true });
  };

  const openEdit = (ch: Channel) => {
    setName(ch.name); setDescription(ch.description); setChannelType(ch.channel_type);
    setLeagueId(ch.league_id || ""); setPlatform(ch.platform || "");
    const cr = channelRoles.filter((r) => r.channel_id === ch.id).map((r) => r.role_id);
    const csr = channelSystemRoles.filter((r) => r.channel_id === ch.id).map((r) => r.system_role);
    setSelectedCustomRoles(new Set(cr)); setSelectedSystemRoles(new Set(csr));
    setDialog({ open: true, editing: ch });
  };

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Błąd", description: "Nazwa jest wymagana.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      let channelId: string;
      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        channel_type: channelType,
        league_id: channelType === "league" && leagueId ? leagueId : null,
        platform: channelType === "platform" && platform ? platform : null,
      };

      if (dialog.editing) {
        await supabase.from("group_channels").update(payload).eq("id", dialog.editing.id);
        channelId = dialog.editing.id;
        await supabase.from("group_channel_roles").delete().eq("channel_id", channelId);
        await supabase.from("group_channel_system_roles").delete().eq("channel_id", channelId);
      } else {
        const { data, error } = await supabase.from("group_channels").insert(payload).select().single();
        if (error) throw error;
        channelId = (data as any).id;
      }

      // Insert role access
      const crRows = [...selectedCustomRoles].map((rid) => ({ channel_id: channelId, role_id: rid }));
      const csrRows = [...selectedSystemRoles].map((sr) => ({ channel_id: channelId, system_role: sr }));
      if (crRows.length > 0) await supabase.from("group_channel_roles").insert(crRows as any);
      if (csrRows.length > 0) await supabase.from("group_channel_system_roles").insert(csrRows as any);

      toast({ title: dialog.editing ? "✅ Kanał zaktualizowany!" : "✅ Kanał utworzony!" });
      setDialog({ open: false });
      await loadAll();
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Usunąć kanał i wszystkie wiadomości?")) return;
    await supabase.from("group_channels").delete().eq("id", id);
    toast({ title: "Kanał usunięty" });
    await loadAll();
  };

  const getIcon = (type: string) => {
    if (type === "admin") return <Lock className="h-4 w-4 text-primary" />;
    if (type === "league") return <Trophy className="h-4 w-4 text-accent" />;
    if (type === "platform") return <Monitor className="h-4 w-4 text-secondary" />;
    return <Hash className="h-4 w-4 text-muted-foreground" />;
  };

  const getTypeLabel = (type: string) => {
    if (type === "admin") return "Administracyjny";
    if (type === "league") return "Ligowy";
    if (type === "platform") return "Platformowy";
    return "Ogólny";
  };

  if (loading) return <p className="text-muted-foreground text-sm py-8 text-center">Ładowanie kanałów...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" /> Kanały czatu grupowego
        </h2>
        <Button variant="hero" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nowy kanał
        </Button>
      </div>
      <p className="text-sm text-muted-foreground font-body">
        Zarządzaj kanałami czatu grupowego. Przypisz role, aby kontrolować dostęp. Kanał bez przypisanych ról jest dostępny dla wszystkich zalogowanych.
      </p>

      {channels.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Brak kanałów. Utwórz pierwszy!</p>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => {
            const cr = channelRoles.filter((r) => r.channel_id === ch.id);
            const csr = channelSystemRoles.filter((r) => r.channel_id === ch.id);
            return (
              <div key={ch.id} className="rounded-lg border border-border bg-card p-4 card-glow space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getIcon(ch.channel_type)}
                    <h3 className="font-display font-bold text-foreground">{ch.name}</h3>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full border bg-muted border-border text-muted-foreground font-display">
                      {getTypeLabel(ch.channel_type)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(ch)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(ch.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {ch.description && <p className="text-xs text-muted-foreground font-body">{ch.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {csr.map((r) => (
                    <span key={r.id} className="text-[10px] bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5 font-display">
                      {SYSTEM_ROLES.find((sr) => sr.key === r.system_role)?.label || r.system_role}
                    </span>
                  ))}
                  {cr.map((r) => (
                    <span key={r.id} className="text-[10px] bg-accent/20 text-accent border border-accent/30 rounded-full px-2 py-0.5 font-display">
                      🎭 {customRoles.find((cr) => cr.id === r.role_id)?.name || "Rola"}
                    </span>
                  ))}
                  {csr.length === 0 && cr.length === 0 && (
                    <span className="text-[10px] text-muted-foreground font-body">🌐 Dostępny dla wszystkich zalogowanych</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(open) => { if (!open) setDialog({ open: false }); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="font-display">{dialog.editing ? "Edytuj kanał" : "Nowy kanał"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Nazwa kanału</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Ogólny" />
              </div>
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Opis</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Krótki opis..." />
              </div>
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Typ kanału</Label>
                <Select value={channelType} onValueChange={setChannelType}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">💬 Ogólny</SelectItem>
                    <SelectItem value="admin">🔒 Administracyjny</SelectItem>
                    <SelectItem value="league">🏆 Ligowy</SelectItem>
                    <SelectItem value="platform">🖥️ Platformowy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {channelType === "league" && (
                <div className="space-y-2">
                  <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Liga</Label>
                  <Select value={leagueId} onValueChange={setLeagueId}>
                    <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz ligę..." /></SelectTrigger>
                    <SelectContent>
                      {leagues.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name} ({l.season})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {channelType === "platform" && (
                <div className="space-y-2">
                  <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Platforma</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="autodarts">🎯 Autodarts</SelectItem>
                      <SelectItem value="dartcounter">📱 DartCounter</SelectItem>
                      <SelectItem value="dartsmind">🧠 DartsMind</SelectItem>
                      <SelectItem value="manual">✍️ Ręczne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* System roles access */}
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Dostęp — Role systemowe</Label>
                <div className="grid grid-cols-1 gap-1.5 rounded-md border border-border p-2">
                  {SYSTEM_ROLES.map((sr) => (
                    <label key={sr.key} className="flex items-center gap-2 text-sm font-body cursor-pointer hover:bg-muted/30 rounded-md px-2 py-1.5">
                      <Checkbox
                        checked={selectedSystemRoles.has(sr.key)}
                        onCheckedChange={() => toggle(selectedSystemRoles, sr.key, setSelectedSystemRoles)}
                      />
                      {sr.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom roles access */}
              {customRoles.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Dostęp — Role niestandardowe</Label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                    {customRoles.map((role) => (
                      <label key={role.id} className="flex items-center gap-2 text-sm font-body cursor-pointer hover:bg-muted/30 rounded-md px-2 py-1.5">
                        <Checkbox
                          checked={selectedCustomRoles.has(role.id)}
                          onCheckedChange={() => toggle(selectedCustomRoles, role.id, setSelectedCustomRoles)}
                        />
                        🎭 {role.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground font-body">
                💡 Jeśli nie wybierzesz żadnej roli, kanał będzie dostępny dla wszystkich zalogowanych użytkowników.
              </p>
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setDialog({ open: false })}>Anuluj</Button>
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChannelPanel;
