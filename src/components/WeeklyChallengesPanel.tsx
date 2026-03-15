import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit2, Plus, RotateCcw, Trophy, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { translateError } from "@/lib/translateError";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Challenge {
  id: string;
  challenge_type: string;
  title: string;
  description: string;
  icon: string;
  week_start: string;
  week_end: string;
  is_active: boolean;
  created_at: string;
}

const CHALLENGE_TYPES = [
  { type: "highest_avg", label: "Najwyższa średnia", icon: "📊" },
  { type: "most_180s", label: "Król 180-tek", icon: "💯" },
  { type: "most_tons", label: "Najwięcej wysokich podejść", icon: "🎪" },
  { type: "best_checkout", label: "Najwyższy checkout", icon: "🎯" },
  { type: "most_wins", label: "Seria zwycięstw", icon: "🔥" },
];

const WeeklyChallengesPanel = () => {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editChallenge, setEditChallenge] = useState<Challenge | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState("highest_avg");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIcon, setNewIcon] = useState("📊");
  const [newWeekStart, setNewWeekStart] = useState("");
  const [newWeekEnd, setNewWeekEnd] = useState("");

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{ type: "reset" | "delete"; challenge: Challenge } | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("weekly_challenges")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(20);
    setChallenges((data as Challenge[]) || []);
    setLoading(false);
  };

  // ─── EDIT ───
  const openEdit = (ch: Challenge) => {
    setEditChallenge(ch);
    setEditTitle(ch.title);
    setEditDescription(ch.description);
    setEditIcon(ch.icon);
  };

  const saveEdit = async () => {
    if (!editChallenge) return;
    setSaving(true);
    const { error } = await supabase
      .from("weekly_challenges")
      .update({ title: editTitle.trim(), description: editDescription.trim(), icon: editIcon.trim() })
      .eq("id", editChallenge.id);
    setSaving(false);
    if (error) {
      toast({ title: "Błąd", description: translateError(error.message), variant: "destructive" });
    } else {
      toast({ title: "Zapisano ✅" });
      setEditChallenge(null);
      fetchChallenges();
    }
  };

  // ─── CREATE ───
  const openCreate = () => {
    const now = new Date();
    const day = now.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    setNewWeekStart(monday.toISOString().split("T")[0]);
    setNewWeekEnd(sunday.toISOString().split("T")[0]);
    setNewType("highest_avg");
    setNewTitle("");
    setNewDescription("");
    setNewIcon("📊");
    setShowCreate(true);
  };

  const handleTypeChange = (type: string) => {
    setNewType(type);
    const preset = CHALLENGE_TYPES.find(t => t.type === type);
    if (preset) {
      if (!newTitle) setNewTitle(preset.label);
      setNewIcon(preset.icon);
    }
  };

  const saveCreate = async () => {
    if (!newTitle.trim() || !newWeekStart || !newWeekEnd) {
      toast({ title: "Wypełnij wymagane pola", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("weekly_challenges").insert({
      challenge_type: newType,
      title: newTitle.trim(),
      description: newDescription.trim(),
      icon: newIcon.trim() || "🏆",
      week_start: newWeekStart,
      week_end: newWeekEnd,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Błąd", description: translateError(error.message), variant: "destructive" });
    } else {
      toast({ title: "Wyzwanie utworzone ✅" });
      setShowCreate(false);
      fetchChallenges();
    }
  };

  // ─── RESET (clear entries for a challenge) ───
  const resetChallenge = async (ch: Challenge) => {
    setSaving(true);
    const { error } = await supabase
      .from("weekly_challenge_entries")
      .delete()
      .eq("challenge_id", ch.id);
    setSaving(false);
    setConfirmAction(null);
    if (error) {
      toast({ title: "Błąd resetu", description: translateError(error.message), variant: "destructive" });
    } else {
      toast({ title: "Wyniki wyzwania zresetowane ✅" });
    }
  };

  // ─── DELETE ───
  const deleteChallenge = async (ch: Challenge) => {
    setSaving(true);
    const { error } = await supabase
      .from("weekly_challenges")
      .delete()
      .eq("id", ch.id);
    setSaving(false);
    setConfirmAction(null);
    if (error) {
      toast({ title: "Błąd usuwania", description: translateError(error.message), variant: "destructive" });
    } else {
      toast({ title: "Wyzwanie usunięte ✅" });
      fetchChallenges();
    }
  };

  // ─── TOGGLE ACTIVE ───
  const toggleActive = async (ch: Challenge) => {
    const { error } = await supabase
      .from("weekly_challenges")
      .update({ is_active: !ch.is_active })
      .eq("id", ch.id);
    if (error) {
      toast({ title: "Błąd", description: translateError(error.message), variant: "destructive" });
    } else {
      toast({ title: ch.is_active ? "Wyzwanie dezaktywowane" : "Wyzwanie aktywowane" });
      fetchChallenges();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-10 bg-muted rounded" />
        <div className="animate-pulse h-32 bg-muted rounded" />
      </div>
    );
  }

  const activeChallenges = challenges.filter(c => c.is_active);
  const pastChallenges = challenges.filter(c => !c.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Zarządzanie wyzwaniami tygodniowymi
        </h2>
        <Button variant="hero" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nowe wyzwanie
        </Button>
      </div>

      {/* Active challenges */}
      <section>
        <h3 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Aktywne wyzwania ({activeChallenges.length})
        </h3>
        {activeChallenges.length === 0 && (
          <p className="text-sm text-muted-foreground font-body">Brak aktywnych wyzwań.</p>
        )}
        <div className="space-y-3">
          {activeChallenges.map(ch => (
            <ChallengeCard
              key={ch.id}
              challenge={ch}
              onEdit={() => openEdit(ch)}
              onToggleActive={() => toggleActive(ch)}
              onReset={() => setConfirmAction({ type: "reset", challenge: ch })}
              onDelete={() => setConfirmAction({ type: "delete", challenge: ch })}
            />
          ))}
        </div>
      </section>

      {/* Past challenges */}
      {pastChallenges.length > 0 && (
        <section>
          <h3 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Zakończone wyzwania ({pastChallenges.length})
          </h3>
          <div className="space-y-3">
            {pastChallenges.map(ch => (
              <ChallengeCard
                key={ch.id}
                challenge={ch}
                onEdit={() => openEdit(ch)}
                onToggleActive={() => toggleActive(ch)}
                onReset={() => setConfirmAction({ type: "reset", challenge: ch })}
                onDelete={() => setConfirmAction({ type: "delete", challenge: ch })}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editChallenge} onOpenChange={(open) => { if (!open) setEditChallenge(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edytuj wyzwanie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-body">Tytuł</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label className="font-body">Opis</Label>
              <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div>
              <Label className="font-body">Ikona (emoji)</Label>
              <Input value={editIcon} onChange={e => setEditIcon(e.target.value)} className="w-20" />
            </div>
            <Button onClick={saveEdit} disabled={saving} variant="hero" className="w-full">
              {saving ? "Zapisywanie…" : "Zapisz zmiany"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nowe wyzwanie tygodniowe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-body">Typ wyzwania</Label>
              <Select value={newType} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHALLENGE_TYPES.map(t => (
                    <SelectItem key={t.type} value={t.type}>{t.icon} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-body">Tytuł</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="np. Najwyższa średnia" />
            </div>
            <div>
              <Label className="font-body">Opis</Label>
              <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Opis wyzwania" />
            </div>
            <div>
              <Label className="font-body">Ikona (emoji)</Label>
              <Input value={newIcon} onChange={e => setNewIcon(e.target.value)} className="w-20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-body">Początek tygodnia</Label>
                <Input type="date" value={newWeekStart} onChange={e => setNewWeekStart(e.target.value)} />
              </div>
              <div>
                <Label className="font-body">Koniec tygodnia</Label>
                <Input type="date" value={newWeekEnd} onChange={e => setNewWeekEnd(e.target.value)} />
              </div>
            </div>
            <Button onClick={saveCreate} disabled={saving} variant="hero" className="w-full">
              {saving ? "Tworzenie…" : "Utwórz wyzwanie"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Dialog ── */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmAction?.type === "reset" ? "Resetuj wyniki" : "Usuń wyzwanie"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground font-body">
            {confirmAction?.type === "reset"
              ? `Czy na pewno chcesz zresetować wszystkie wyniki wyzwania "${confirmAction.challenge.title}"? Tej operacji nie można cofnąć.`
              : `Czy na pewno chcesz usunąć wyzwanie "${confirmAction?.challenge.title}"? Wszystkie wyniki i nagrody zostaną usunięte.`
            }
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Anuluj</Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === "reset") resetChallenge(confirmAction.challenge);
                else deleteChallenge(confirmAction.challenge);
              }}
            >
              {saving ? "..." : confirmAction?.type === "reset" ? "Resetuj" : "Usuń"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Challenge Card ───
const ChallengeCard = ({ challenge, onEdit, onToggleActive, onReset, onDelete }: {
  challenge: Challenge;
  onEdit: () => void;
  onToggleActive: () => void;
  onReset: () => void;
  onDelete: () => void;
}) => {
  return (
    <div className={`rounded-lg border bg-card p-4 flex items-start gap-4 ${challenge.is_active ? "border-primary/30" : "border-border opacity-70"}`}>
      <span className="text-2xl">{challenge.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-display font-bold text-foreground text-sm">{challenge.title}</h4>
          {challenge.is_active && (
            <span className="text-[10px] font-body bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">aktywne</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-body mt-0.5">{challenge.description}</p>
        <p className="text-[10px] text-muted-foreground font-body mt-1">
          {new Date(challenge.week_start).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })} – {new Date(challenge.week_end).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
          <span className="ml-2 text-muted-foreground/60">Typ: {challenge.challenge_type}</span>
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edytuj" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title={challenge.is_active ? "Dezaktywuj" : "Aktywuj"} onClick={onToggleActive}>
          {challenge.is_active ? <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" /> : <Trophy className="h-3.5 w-3.5 text-green-500" />}
        </Button>
        {challenge.is_active && (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Resetuj wyniki" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Usuń" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default WeeklyChallengesPanel;
