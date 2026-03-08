import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserCheck, UserX, Plus, Calendar, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const AdminPage = () => {
  const { user } = useAuth();
  const { players, matches, pendingPlayers, approvePlayer, addMatch } = useLeague();
  const { toast } = useToast();

  const [newMatchP1, setNewMatchP1] = useState("");
  const [newMatchP2, setNewMatchP2] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");

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
    if (!newMatchP1 || !newMatchP2 || !newMatchDate) {
      toast({ title: "Błąd", description: "Wypełnij wszystkie pola.", variant: "destructive" });
      return;
    }
    if (newMatchP1 === newMatchP2) {
      toast({ title: "Błąd", description: "Gracz nie może grać sam ze sobą.", variant: "destructive" });
      return;
    }
    addMatch(newMatchP1, newMatchP2, newMatchDate);
    toast({ title: "Mecz dodany!", description: "Nowy mecz został zaplanowany." });
    setNewMatchP1("");
    setNewMatchP2("");
    setNewMatchDate("");
  };

  const upcomingMatches = matches.filter((m) => m.status === "upcoming");
  const completedMatches = matches.filter((m) => m.status === "completed");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Panel Admina</h1>
          <p className="text-muted-foreground font-body text-sm">Zarządzaj ligą, graczami i meczami</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending players */}
        <section className="rounded-lg border border-border bg-card p-6 card-glow">
          <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-accent" />
            Oczekujący gracze ({pendingPlayers.length})
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
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleApprove(p.id, p.name)}>
                      <UserCheck className="h-3.5 w-3.5 mr-1" /> Zatwierdź
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add match */}
        <section className="rounded-lg border border-border bg-card p-6 card-glow">
          <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-secondary" />
            Zaplanuj Mecz
          </h2>
          <form onSubmit={handleAddMatch} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 1</Label>
              <Select value={newMatchP1} onValueChange={setNewMatchP1}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue placeholder="Wybierz gracza" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 2</Label>
              <Select value={newMatchP2} onValueChange={setNewMatchP2}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue placeholder="Wybierz gracza" />
                </SelectTrigger>
                <SelectContent>
                  {players.filter((p) => p.id !== newMatchP1).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={newMatchDate} onChange={(e) => setNewMatchDate(e.target.value)} className="bg-muted/30 border-border" required />
            </div>
            <Button type="submit" variant="hero" className="w-full">
              <Calendar className="h-4 w-4 mr-2" /> Dodaj Mecz
            </Button>
          </form>
        </section>

        {/* Stats overview */}
        <section className="rounded-lg border border-border bg-card p-6 card-glow lg:col-span-2">
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Podsumowanie Ligi</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-muted/30 rounded-lg p-4">
              <div className="text-3xl font-display font-bold text-foreground">{players.length}</div>
              <div className="text-xs text-muted-foreground font-display uppercase tracking-wider mt-1">Graczy</div>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-4">
              <div className="text-3xl font-display font-bold text-foreground">{completedMatches.length}</div>
              <div className="text-xs text-muted-foreground font-display uppercase tracking-wider mt-1">Rozegranych</div>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-4">
              <div className="text-3xl font-display font-bold text-foreground">{upcomingMatches.length}</div>
              <div className="text-xs text-muted-foreground font-display uppercase tracking-wider mt-1">Zaplanowanych</div>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-4">
              <div className="text-3xl font-display font-bold text-foreground">{pendingPlayers.length}</div>
              <div className="text-xs text-muted-foreground font-display uppercase tracking-wider mt-1">Oczekujących</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPage;
