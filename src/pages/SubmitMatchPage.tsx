import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, PenTool, Send, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const SubmitMatchPage = () => {
  const { user } = useAuth();
  const { matches, submitMatchResult } = useLeague();
  const { toast } = useToast();

  const [mode, setMode] = useState<"link" | "manual">("manual");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [autodartsLink, setAutodartsLink] = useState("");
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane Logowanie</h1>
        <p className="text-muted-foreground font-body mb-6">
          Aby zgłosić wynik meczu, musisz być zalogowany.
        </p>
        <Link to="/login">
          <Button variant="hero" size="lg">Zaloguj się</Button>
        </Link>
      </div>
    );
  }

  // Only show upcoming matches where the logged-in user is a participant
  const myUpcomingMatches = matches.filter(
    (m) => m.status === "upcoming" && (m.player1Id === user.id || m.player2Id === user.id)
  );

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMatchId) {
      toast({ title: "Błąd", description: "Wybierz mecz do zgłoszenia.", variant: "destructive" });
      return;
    }

    const s1 = parseInt(score1);
    const s2 = parseInt(score2);

    if (mode === "manual" && (isNaN(s1) || isNaN(s2))) {
      toast({ title: "Błąd", description: "Podaj prawidłowy wynik.", variant: "destructive" });
      return;
    }

    if (mode === "link" && !autodartsLink.includes("autodarts.io")) {
      toast({ title: "Błąd", description: "Podaj prawidłowy link do Autodarts.io.", variant: "destructive" });
      return;
    }

    if (mode === "manual") {
      submitMatchResult(selectedMatchId, s1, s2);
    } else {
      // For now with link mode, still require manual score (Firecrawl will automate later)
      submitMatchResult(selectedMatchId, s1, s2, autodartsLink);
    }

    toast({
      title: "✅ Wynik zgłoszony!",
      description: `Mecz zaktualizowany. Tabela i statystyki zostały przeliczone.`,
    });

    setSelectedMatchId("");
    setScore1("");
    setScore2("");
    setAutodartsLink("");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Dodaj Wynik</h1>
        <p className="text-muted-foreground font-body">
          Zalogowany jako <span className="text-foreground font-semibold">{user.name}</span>
        </p>
      </div>

      {myUpcomingMatches.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center card-glow">
          <p className="text-muted-foreground font-body text-lg mb-2">Brak zaplanowanych meczów</p>
          <p className="text-sm text-muted-foreground">Nie masz żadnych nadchodzących meczów do zgłoszenia.</p>
        </div>
      ) : (
        <>
          {/* Match selection */}
          <div className="space-y-2 mb-6">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
              Wybierz mecz z Twojej kolejki
            </Label>
            <div className="space-y-2">
              {myUpcomingMatches.map((match) => {
                const opponent = match.player1Id === user.id ? match.player2Name : match.player1Name;
                const isSelected = selectedMatchId === match.id;
                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setSelectedMatchId(match.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-body font-medium text-foreground">vs {opponent}</span>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-display text-primary uppercase">Wybrany</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMatch && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "manual" ? "default" : "outline"}
                  onClick={() => setMode("manual")}
                  className="font-display uppercase tracking-wider text-xs flex-1"
                >
                  <PenTool className="h-4 w-4 mr-2" /> Ręcznie
                </Button>
                <Button
                  type="button"
                  variant={mode === "link" ? "default" : "outline"}
                  onClick={() => setMode("link")}
                  className="font-display uppercase tracking-wider text-xs flex-1"
                >
                  <Link2 className="h-4 w-4 mr-2" /> + Link Autodarts
                </Button>
              </div>

              {/* Score inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                    {selectedMatch.player1Name}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={score1}
                    onChange={(e) => setScore1(e.target.value)}
                    className="bg-muted/30 border-border text-center text-2xl font-display"
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                    {selectedMatch.player2Name}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={score2}
                    onChange={(e) => setScore2(e.target.value)}
                    className="bg-muted/30 border-border text-center text-2xl font-display"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {mode === "link" && (
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                    Link Autodarts.io
                  </Label>
                  <Input
                    type="url"
                    value={autodartsLink}
                    onChange={(e) => setAutodartsLink(e.target.value)}
                    placeholder="https://autodarts.io/matches/..."
                    className="bg-muted/30 border-border"
                    required
                  />
                  <p className="text-xs text-muted-foreground font-body">
                    Link zostanie zapisany przy meczu. Automatyczne pobieranie danych będzie dostępne po włączeniu Cloud.
                  </p>
                </div>
              )}

              <Button type="submit" variant="hero" size="lg" className="w-full">
                <Send className="h-4 w-4 mr-2" /> Zgłoś Wynik
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default SubmitMatchPage;
