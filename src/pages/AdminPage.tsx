import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserCheck, Plus, Calendar, Lock, Trash2, Edit2, Users, Trophy, Settings, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type AdminTab = "overview" | "leagues" | "players" | "matches";

const AdminPage = () => {
  const { user, isAdmin, loading } = useAuth();
  const {
    players, matches, leagues, pendingPlayers,
    approvePlayer, addMatch, deleteMatch,
    addLeague, updateLeague, deleteLeague,
    updatePlayer, deletePlayer, assignPlayerToLeague, removePlayerFromLeague,
  } = useLeague();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  if (loading) return null;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane Logowanie</h1>
        <Link to="/login"><Button variant="hero" size="lg">Zaloguj się</Button></Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Brak Dostępu</h1>
        <p className="text-muted-foreground font-body">Tylko administrator ma dostęp do tego panelu.</p>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Podsumowanie", icon: <Settings className="h-4 w-4" /> },
    { id: "leagues", label: "Ligi", icon: <Trophy className="h-4 w-4" /> },
    { id: "players", label: "Gracze", icon: <Users className="h-4 w-4" /> },
    { id: "matches", label: "Mecze", icon: <Calendar className="h-4 w-4" /> },
  ];

  const completedCount = matches.filter((m) => m.status === "completed").length;
  const upcomingCount = matches.filter((m) => m.status === "upcoming").length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Panel Admina</h1>
          <p className="text-muted-foreground font-body text-sm">Pełne zarządzanie ligami, graczami i meczami</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
        {tabs.map((tab) => (
          <Button key={tab.id} variant={activeTab === tab.id ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(tab.id)} className="font-display uppercase tracking-wider text-xs">
            {tab.icon}
            <span className="ml-1">{tab.label}</span>
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === "overview" && <OverviewTab leagues={leagues} players={players} completedCount={completedCount} upcomingCount={upcomingCount} pendingPlayers={pendingPlayers} approvePlayer={approvePlayer} toast={toast} />}
          {activeTab === "leagues" && <LeaguesTab leagues={leagues} addLeague={addLeague} updateLeague={updateLeague} deleteLeague={deleteLeague} toast={toast} />}
          {activeTab === "players" && <PlayersTab players={players} leagues={leagues} pendingPlayers={pendingPlayers} approvePlayer={approvePlayer} updatePlayer={updatePlayer} deletePlayer={deletePlayer} assignPlayerToLeague={assignPlayerToLeague} removePlayerFromLeague={removePlayerFromLeague} toast={toast} />}
          {activeTab === "matches" && <MatchesTab matches={matches} players={players} leagues={leagues} addMatch={addMatch} deleteMatch={deleteMatch} toast={toast} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─── OVERVIEW TAB ───
const OverviewTab = ({ leagues, players, completedCount, upcomingCount, pendingPlayers, approvePlayer, toast }: any) => (
  <div className="space-y-8">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <SummaryBox label="Ligi" value={leagues.length} icon="🏆" />
      <SummaryBox label="Graczy" value={players.filter((p: any) => p.approved).length} icon="👥" />
      <SummaryBox label="Rozegranych" value={completedCount} icon="✅" />
      <SummaryBox label="Zaplanowanych" value={upcomingCount} icon="📅" />
      <SummaryBox label="Oczekujących" value={pendingPlayers.length} icon="⏳" />
    </div>
    {pendingPlayers.length > 0 && (
      <section className="rounded-lg border border-border bg-card p-6 card-glow">
        <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-accent" /> Oczekujący gracze ({pendingPlayers.length})
        </h2>
        <div className="space-y-3">
          {pendingPlayers.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-display font-bold text-accent">{p.avatar}</div>
                <span className="font-body font-medium text-foreground text-sm">{p.name}</span>
              </div>
              <Button size="sm" variant="default" onClick={() => { approvePlayer(p.id); toast({ title: "Gracz zatwierdzony!", description: `${p.name} został dodany.` }); }}>
                <UserCheck className="h-3.5 w-3.5 mr-1" /> Zatwierdź
              </Button>
            </div>
          ))}
        </div>
      </section>
    )}
  </div>
);

// ─── LEAGUES TAB ───
const LeaguesTab = ({ leagues, addLeague, updateLeague, deleteLeague, toast }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("Best of 5");
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => { setName(""); setSeason(""); setDescription(""); setFormat("Best of 5"); setIsActive(true); setShowForm(false); setEditId(null); };

  const startEdit = (l: any) => {
    setEditId(l.id); setName(l.name); setSeason(l.season); setDescription(l.description);
    setFormat(l.format || "Best of 5"); setIsActive(l.is_active); setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !season) { toast({ title: "Błąd", description: "Wypełnij wymagane pola.", variant: "destructive" }); return; }
    if (editId) {
      updateLeague(editId, { name, season, description, format, is_active: isActive });
      toast({ title: "Liga zaktualizowana!", description: `${name} została zmieniona.` });
    } else {
      addLeague({ name, season, description, format, is_active: isActive, max_legs: format === "Best of 3" ? 3 : format === "Best of 7" ? 7 : 5 });
      toast({ title: "Liga dodana!", description: `${name} została utworzona.` });
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-foreground">Zarządzanie Ligami ({leagues.length})</h2>
        <Button size="sm" variant="hero" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4 mr-1" /> Nowa Liga
        </Button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6 card-glow space-y-4">
            <h3 className="font-display font-bold text-foreground">{editId ? "Edytuj Ligę" : "Nowa Liga"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Nazwa *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Liga Główna" className="bg-muted/30 border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Sezon *</Label>
                <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Wiosna 2026" className="bg-muted/30 border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Best of 3">Best of 3</SelectItem>
                    <SelectItem value="Best of 5">Best of 5</SelectItem>
                    <SelectItem value="Best of 7">Best of 7</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Status</Label>
                <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktywna</SelectItem>
                    <SelectItem value="inactive">Archiwalna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Opis</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opis ligi..." className="bg-muted/30 border-border" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" variant="hero">{editId ? "Zapisz" : "Utwórz"}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>Anuluj</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="space-y-3">
        {leagues.map((l: any) => (
          <div key={l.id} className="rounded-lg border border-border bg-card p-5 card-glow flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${l.is_active ? "bg-secondary" : "bg-muted-foreground"}`} />
              <div>
                <div className="font-display font-bold text-foreground">{l.name}</div>
                <div className="text-xs text-muted-foreground font-body">{l.season} · {l.format || "Best of 5"} · {l.description}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => startEdit(l)}><Edit2 className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { deleteLeague(l.id); toast({ title: "Liga usunięta", description: `${l.name} została usunięta.` }); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PLAYERS TAB ───
const PlayersTab = ({ players, leagues, pendingPlayers, approvePlayer, updatePlayer, deletePlayer, assignPlayerToLeague, removePlayerFromLeague, toast }: any) => {
  const approved = players.filter((p: any) => p.approved);
  return (
    <div className="space-y-6">
      {pendingPlayers.length > 0 && (
        <section className="rounded-lg border border-accent/30 bg-accent/5 p-5">
          <h3 className="font-display font-bold text-foreground mb-3">Oczekujący ({pendingPlayers.length})</h3>
          <div className="space-y-2">
            {pendingPlayers.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-card rounded-lg border border-border p-3">
                <span className="font-body text-sm text-foreground">{p.name}</span>
                <Button size="sm" onClick={() => { approvePlayer(p.id); toast({ title: "Zatwierdzono!", description: p.name }); }}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Zatwierdź
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
      <h2 className="text-xl font-display font-bold text-foreground">Zatwierdzeni gracze ({approved.length})</h2>
      <div className="space-y-3">
        {approved.map((p: any) => (
          <div key={p.id} className="rounded-lg border border-border bg-card p-5 card-glow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary">{p.avatar}</div>
                <span className="font-body font-medium text-foreground">{p.name}</span>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { deletePlayer(p.id); toast({ title: "Gracz usunięty", description: p.name }); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {leagues.map((l: any) => {
                const isIn = (p.leagueIds || []).includes(l.id);
                return (
                  <button key={l.id} onClick={() => {
                    if (isIn) { removePlayerFromLeague(p.id, l.id); toast({ title: `${p.name} usunięty z ${l.name}` }); }
                    else { assignPlayerToLeague(p.id, l.id); toast({ title: `${p.name} dodany do ${l.name}` }); }
                  }} className={`text-xs font-display uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${isIn ? "bg-secondary/20 border-secondary/30 text-secondary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30"}`}>
                    {isIn ? <Check className="h-3 w-3 inline mr-1" /> : <Plus className="h-3 w-3 inline mr-1" />}
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MATCHES TAB ───
const MatchesTab = ({ matches, players, leagues, addMatch, deleteMatch, toast }: any) => {
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]?.id || "");
  const [newMatchP1, setNewMatchP1] = useState("");
  const [newMatchP2, setNewMatchP2] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [newMatchRound, setNewMatchRound] = useState("");

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchP1 || !newMatchP2 || !newMatchDate || !selectedLeague) {
      toast({ title: "Błąd", description: "Wypełnij wszystkie pola.", variant: "destructive" }); return;
    }
    if (newMatchP1 === newMatchP2) {
      toast({ title: "Błąd", description: "Gracz nie może grać sam ze sobą.", variant: "destructive" }); return;
    }
    addMatch(selectedLeague, newMatchP1, newMatchP2, newMatchDate, newMatchRound ? parseInt(newMatchRound) : undefined);
    toast({ title: "Mecz dodany!", description: "Nowy mecz został zaplanowany." });
    setNewMatchP1(""); setNewMatchP2(""); setNewMatchDate(""); setNewMatchRound("");
  };

  const approvedPlayers = players.filter((p: any) => p.approved);
  const leagueMatches = selectedLeague ? matches.filter((m: any) => m.leagueId === selectedLeague) : matches;

  return (
    <div className="space-y-6">
      {/* Add match form */}
      <div className="rounded-lg border border-border bg-card p-6 card-glow space-y-4">
        <h3 className="font-display font-bold text-foreground">Dodaj mecz</h3>
        <form onSubmit={handleAddMatch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Liga</Label>
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {leagues.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={newMatchDate} onChange={(e) => setNewMatchDate(e.target.value)} className="bg-muted/30 border-border" required />
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 1</Label>
              <Select value={newMatchP1} onValueChange={setNewMatchP1}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz" /></SelectTrigger>
                <SelectContent>
                  {approvedPlayers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 2</Label>
              <Select value={newMatchP2} onValueChange={setNewMatchP2}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz" /></SelectTrigger>
                <SelectContent>
                  {approvedPlayers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Kolejka (opcjonalne)</Label>
            <Input type="number" min="1" value={newMatchRound} onChange={(e) => setNewMatchRound(e.target.value)} className="bg-muted/30 border-border w-32" />
          </div>
          <Button type="submit" variant="hero"><Plus className="h-4 w-4 mr-1" /> Dodaj mecz</Button>
        </form>
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {leagueMatches.map((m: any) => (
          <div key={m.id} className="rounded-lg border border-border bg-card p-4 card-glow flex items-center justify-between">
            <div>
              <div className="font-body text-sm text-foreground">{m.player1Name} vs {m.player2Name}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(m.date).toLocaleDateString("pl-PL")} · {m.status === "completed" ? `${m.score1}:${m.score2}` : "Zaplanowany"}
                {m.round && ` · Kolejka ${m.round}`}
              </div>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { deleteMatch(m.id); toast({ title: "Mecz usunięty" }); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SummaryBox = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
  <div className="rounded-lg border border-border bg-card p-4 card-glow text-center">
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-2xl font-display font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground uppercase tracking-wider font-display">{label}</div>
  </div>
);

export default AdminPage;
