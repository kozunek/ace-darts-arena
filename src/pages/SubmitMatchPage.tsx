import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague, MatchResultData } from "@/contexts/LeagueContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Send, Lock, ChevronDown, ChevronUp, Clock, Zap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import MatchStatFields from "@/components/MatchStatFields";

const SubmitMatchPage = () => {
  const { user, profile, loading, isAdmin, isModerator } = useAuth();
  const { matches, submitMatchResult } = useLeague();
  const { toast } = useToast();

  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [autodartsLink, setAutodartsLink] = useState("");
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stats, setStats] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) { setLoadingPlayer(false); return; }
    const fetchPlayerId = async () => {
      setLoadingPlayer(true);
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setMyPlayerId(data?.id ?? null);
      setLoadingPlayer(false);
    };
    fetchPlayerId();
  }, [user]);

  if (loading || loadingPlayer) return null;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane Logowanie</h1>
        <p className="text-muted-foreground font-body mb-6">Aby zgłosić wynik meczu, musisz być zalogowany.</p>
        <Link to="/login"><Button variant="hero" size="lg">Zaloguj się</Button></Link>
      </div>
    );
  }

  const canSubmitAll = isAdmin || isModerator;

  // Players see only their matches, admins/mods see all
  const upcomingMatches = matches.filter((m) => {
    if (m.status !== "upcoming") return false;
    if (canSubmitAll) return true;
    if (!myPlayerId) return false;
    return m.player1Id === myPlayerId || m.player2Id === myPlayerId;
  });

  const pendingMatches = matches.filter((m) => {
    if (m.status !== "pending_approval") return false;
    if (canSubmitAll) return true;
    if (!myPlayerId) return false;
    return m.player1Id === myPlayerId || m.player2Id === myPlayerId;
  });

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  const resetForm = () => {
    setSelectedMatchId("");
    setScore1("");
    setScore2("");
    setAutodartsLink("");
    setStats({});
    setShowAdvanced(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchId) {
      toast({ title: "Błąd", description: "Wybierz mecz.", variant: "destructive" });
      return;
    }

    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);

    if (isNaN(s1) || isNaN(s2)) {
      toast({ title: "Błąd", description: "Podaj prawidłowy wynik.", variant: "destructive" });
      return;
    }

    const optNum = (key: string) => (stats[key] ? parseFloat(stats[key]) : undefined);
    const attemptsP1 = optNum("checkoutAttempts1") ?? 0;
    const attemptsP2 = optNum("checkoutAttempts2") ?? 0;
    const hitsP1 = optNum("checkoutHits1") ?? 0;
    const hitsP2 = optNum("checkoutHits2") ?? 0;

    if (hitsP1 > attemptsP1 || hitsP2 > attemptsP2) {
      toast({ title: "Błąd", description: "Trafione checkouty nie mogą być większe niż rzucone.", variant: "destructive" });
      return;
    }

    const data: MatchResultData = {
      score1: s1,
      score2: s2,
      avg1: optNum("avg1"),
      avg2: optNum("avg2"),
      oneEighties1: optNum("oneEighties1"),
      oneEighties2: optNum("oneEighties2"),
      highCheckout1: optNum("hc1"),
      highCheckout2: optNum("hc2"),
      ton60_1: optNum("ton60_1"),
      ton60_2: optNum("ton60_2"),
      ton80_1: optNum("ton80_1"),
      ton80_2: optNum("ton80_2"),
      tonPlus1: optNum("tonPlus1"),
      tonPlus2: optNum("tonPlus2"),
      dartsThrown1: optNum("darts1"),
      dartsThrown2: optNum("darts2"),
      checkoutAttempts1: attemptsP1,
      checkoutAttempts2: attemptsP2,
      checkoutHits1: hitsP1,
      checkoutHits2: hitsP2,
      first9Avg1: optNum("first9Avg1"),
      first9Avg2: optNum("first9Avg2"),
      avgUntil170_1: optNum("avgUntil170_1"),
      avgUntil170_2: optNum("avgUntil170_2"),
      autodartsLink: autodartsLink || undefined,
    };

    submitMatchResult(selectedMatchId, data);
    toast({ title: "📋 Wynik zgłoszony!", description: "Wynik został wysłany do zatwierdzenia przez admina/moderatora." });
    resetForm();
  };

  if (!canSubmitAll && !myPlayerId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Brak przypisanego gracza</h1>
        <p className="text-muted-foreground font-body mb-6">
          Twoje konto nie jest jeszcze powiązane z żadnym graczem. Skontaktuj się z administratorem.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Dodaj Wynik</h1>
        <p className="text-muted-foreground font-body">
          Zalogowany jako <span className="text-foreground font-semibold">{profile?.name || user.email}</span>
          {canSubmitAll && <span className="ml-2 text-xs text-primary">(Admin/Moderator — widoczne wszystkie mecze)</span>}
        </p>
        <p className="text-xs text-accent font-body mt-1">⚠️ Zgłoszone wyniki wymagają zatwierdzenia przez admina lub moderatora.</p>
      </div>

      {pendingMatches.length > 0 && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-5 mb-6">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" /> Oczekujące na zatwierdzenie ({pendingMatches.length})
          </h3>
          <div className="space-y-2">
            {pendingMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
                <span className="font-body text-sm text-foreground">{m.player1Name} vs {m.player2Name}</span>
                <span className="text-sm font-display text-accent">{m.score1}:{m.score2} ⏳</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingMatches.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center card-glow">
          <p className="text-muted-foreground font-body text-lg mb-2">Brak zaplanowanych meczów</p>
          <p className="text-sm text-muted-foreground">Nie ma żadnych nadchodzących meczów do zgłoszenia.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Wybierz mecz</Label>
            <div className="space-y-2">
              {upcomingMatches.map((match) => {
                const isSelected = selectedMatchId === match.id;
                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setSelectedMatchId(match.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-all ${isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-body font-medium text-foreground">{match.player1Name} vs {match.player2Name}</span>
                        <div className="text-xs text-muted-foreground mt-1">
                          Termin: {new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
                          {match.round && ` · Kolejka ${match.round}`}
                        </div>
                      </div>
                      {isSelected && <span className="text-xs font-display text-primary uppercase">Wybrany</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMatch && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">{selectedMatch.player1Name}</Label>
                  <Input type="number" min="0" max="20" value={score1} onChange={(e) => setScore1(e.target.value)} className="bg-muted/30 border-border text-center text-2xl font-display" placeholder="0" required />
                </div>
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">{selectedMatch.player2Name}</Label>
                  <Input type="number" min="0" max="20" value={score2} onChange={(e) => setScore2(e.target.value)} className="bg-muted/30 border-border text-center text-2xl font-display" placeholder="0" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5" /> Link Autodarts.io (opcjonalny)
                </Label>
                <Input type="url" value={autodartsLink} onChange={(e) => setAutodartsLink(e.target.value)} placeholder="https://autodarts.io/matches/..." className="bg-muted/30 border-border" />
              </div>

              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-body transition-colors">
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAdvanced ? "Ukryj szczegółowe statystyki" : "Dodaj szczegółowe statystyki"}
              </button>

              {showAdvanced && (
                <MatchStatFields
                  stats={stats}
                  setStats={setStats}
                  p1={selectedMatch.player1Name}
                  p2={selectedMatch.player2Name}
                />
              )}

              <Button type="submit" variant="hero" size="lg" className="w-full">
                <Send className="h-4 w-4 mr-2" /> Zgłoś Wynik (do zatwierdzenia)
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default SubmitMatchPage;
