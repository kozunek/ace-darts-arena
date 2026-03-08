import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserCheck, Plus, Calendar, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const AdminPage = () => {
  const { user } = useAuth();
  const { players, matches, leagues, pendingPlayers, approvePlayer, addMatch } = useLeague();
  const { toast } = useToast();

  const [selectedLeague, setSelectedLeague] = useState(leagues[0]?.id || "");
  const [newMatchP1, setNewMatchP1] = useState("");
  const [newMatchP2, setNewMatchP2] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [newMatchRound, setNewMatchRound] = useState("");

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane Logowanie</h1>
        <Link to="/login"><Button variant="hero" size="lg">Zaloguj się</Button></Link>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Brak Dostępu</h1>
        <p className="text-muted-foreground font-body">Tylko administrator ma dostęp do tego panelu.</p>
      </div>
    );
  }

  const handleApprove = (playerId: string, name: string) => {
    approvePlayer(playerId);
    toast({ title: "Gracz zatwierdzony!", description: `${name} został dodany do ligi.` });
  };

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

  const completedCount = matches.filter((m) => m.status === "completed").length;
  const upcomingCount = matches.filter((m) => m.status === "upcoming").length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Panel Admina</h1>
          <p className="text-muted-foreground font-body text-sm">Zarządzaj ligami, graczami i meczami</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending players */}
        <section className="rounded-lg border border-border bg-card p-6 card-glow">
          <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-accent" /> Oczekujący gracze ({pendingPlayers.length})
          </h2>
          {pendingPlayers.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm">Brak oczekujących graczy.</p>
          ) : (
            <div className="space-y-3">
              {pendingPlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-display font-bold text-accent">
                      {p.avatar}
                    </div>
                    <span className="font-body font-medium text-foreground text-sm">{p.name}</span>
                  </div>
                  <Button size="sm" variant="default" onClick={() => handleApprove(p.id, p.name)}>
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Zatwierdź
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add match */}
        <section className="rounded-lg border border-border bg-card p-6 card-glow">
          <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-secondary" /> Zaplanuj Mecz
          </h2>
          <form onSubmit={handleAddMatch} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Liga</Label>
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz ligę" /></SelectTrigger>
                <SelectContent>
                  {leagues.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.season})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 1</Label>
                <Select value={newMatchP1} onValueChange={setNewMatchP1}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz" /></SelectTrigger>
                  <SelectContent>{players.filter(p => p.approved).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 2</Label>
                <Select value={newMatchP2} onValueChange={setNewMatchP2}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz" /></SelectTrigger>
                  <SelectContent>{players.filter(p => p.approved && p.id !== newMatchP1).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Data</Label>
                <Input type="date" value={newMatchDate} onChange={(e) => setNewMatchDate(e.target.value)} className="bg-muted/30 border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Kolejka (opcjonalnie)</Label>
                <Input type="number" min="1" value={newMatchRound} onChange={(e) => setNewMatchRound(e.target.value)} className="bg-muted/30 border-border" placeholder="np. 3" />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full">
              <Calendar className="h-4 w-4 mr-2" /> Dodaj Mecz
            </Button>
          </form>
        </section>

        {/* Stats */}
        <section className="rounded-lg border border-border bg-card p-6 card-glow lg:col-span-2">
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Podsumowanie</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryBox label="Ligi" value={leagues.length} />
            <SummaryBox label="Graczy" value={players.filter(p => p.approved).length} />
            <SummaryBox label="Rozegranych" value={completedCount} />
            <SummaryBox label="Zaplanowanych" value={upcomingCount} />
            <SummaryBox label="Oczekujących" value={pendingPlayers.length} />
          </div>
        </section>
      </div>
    </div>
  );
};

const SummaryBox = ({ label, value }: { label: string; value: number }) => (
  <div className="text-center bg-muted/30 rounded-lg p-4">
    <div className="text-3xl font-display font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground font-display uppercase tracking-wider mt-1">{label}</div>
  </div>
);

export default AdminPage;
