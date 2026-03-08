import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague, MatchResultData } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, PenTool, Send, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const SubmitMatchPage = () => {
  const { user } = useAuth();
  const { matches, submitMatchResult } = useLeague();
  const { toast } = useToast();

  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [autodartsLink, setAutodartsLink] = useState("");
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [avg1, setAvg1] = useState("");
  const [avg2, setAvg2] = useState("");
  const [oneEighties1, setOneEighties1] = useState("");
  const [oneEighties2, setOneEighties2] = useState("");
  const [hc1, setHc1] = useState("");
  const [hc2, setHc2] = useState("");
  const [ton40_1, setTon40_1] = useState("");
  const [ton40_2, setTon40_2] = useState("");
  const [ton60_1, setTon60_1] = useState("");
  const [ton60_2, setTon60_2] = useState("");
  const [ton80_1, setTon80_1] = useState("");
  const [ton80_2, setTon80_2] = useState("");
  const [tonPlus1, setTonPlus1] = useState("");
  const [tonPlus2, setTonPlus2] = useState("");
  const [darts1, setDarts1] = useState("");
  const [darts2, setDarts2] = useState("");

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

  const myUpcomingMatches = matches.filter(
    (m) => m.status === "upcoming" && (m.player1Id === user.id || m.player2Id === user.id)
  );
  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  const resetForm = () => {
    setSelectedMatchId(""); setScore1(""); setScore2(""); setAutodartsLink("");
    setAvg1(""); setAvg2(""); setOneEighties1(""); setOneEighties2("");
    setHc1(""); setHc2(""); setTon40_1(""); setTon40_2("");
    setTon60_1(""); setTon60_2(""); setTon80_1(""); setTon80_2("");
    setTonPlus1(""); setTonPlus2(""); setDarts1(""); setDarts2("");
    setShowAdvanced(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchId) { toast({ title: "Błąd", description: "Wybierz mecz.", variant: "destructive" }); return; }
    const s1 = parseInt(score1), s2 = parseInt(score2);
    if (isNaN(s1) || isNaN(s2)) { toast({ title: "Błąd", description: "Podaj prawidłowy wynik.", variant: "destructive" }); return; }

    const optNum = (v: string) => v ? parseFloat(v) : undefined;
    const data: MatchResultData = {
      score1: s1, score2: s2,
      avg1: optNum(avg1), avg2: optNum(avg2),
      oneEighties1: optNum(oneEighties1), oneEighties2: optNum(oneEighties2),
      highCheckout1: optNum(hc1), highCheckout2: optNum(hc2),
      ton40_1: optNum(ton40_1), ton40_2: optNum(ton40_2),
      ton60_1: optNum(ton60_1), ton60_2: optNum(ton60_2),
      ton80_1: optNum(ton80_1), ton80_2: optNum(ton80_2),
      tonPlus1: optNum(tonPlus1), tonPlus2: optNum(tonPlus2),
      dartsThrown1: optNum(darts1), dartsThrown2: optNum(darts2),
      autodartsLink: autodartsLink || undefined,
    };

    submitMatchResult(selectedMatchId, data);
    toast({ title: "✅ Wynik zgłoszony!", description: "Tabela i statystyki zostały przeliczone." });
    resetForm();
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
          <div className="space-y-2 mb-6">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Wybierz mecz z Twojej kolejki</Label>
            <div className="space-y-2">
              {myUpcomingMatches.map((match) => {
                const opponent = match.player1Id === user.id ? match.player2Name : match.player1Name;
                const isSelected = selectedMatchId === match.id;
                return (
                  <button key={match.id} type="button" onClick={() => setSelectedMatchId(match.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-all ${isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-body font-medium text-foreground">vs {opponent}</span>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}
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
              {/* Score */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">{selectedMatch.player1Name}</Label>
                  <Input type="number" min="0" max="20" value={score1} onChange={(e) => setScore1(e.target.value)}
                    className="bg-muted/30 border-border text-center text-2xl font-display" placeholder="0" required />
                </div>
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">{selectedMatch.player2Name}</Label>
                  <Input type="number" min="0" max="20" value={score2} onChange={(e) => setScore2(e.target.value)}
                    className="bg-muted/30 border-border text-center text-2xl font-display" placeholder="0" required />
                </div>
              </div>

              {/* Autodarts link */}
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5" /> Link Autodarts.io (opcjonalny)
                </Label>
                <Input type="url" value={autodartsLink} onChange={(e) => setAutodartsLink(e.target.value)}
                  placeholder="https://autodarts.io/matches/..." className="bg-muted/30 border-border" />
              </div>

              {/* Advanced stats toggle */}
              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-body transition-colors">
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAdvanced ? "Ukryj szczegółowe statystyki" : "Dodaj szczegółowe statystyki (średnia, 180, checkout...)"}
              </button>

              {showAdvanced && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground font-body mb-2">
                    Wpisz statystyki z Autodarts.io — wszystkie pola są opcjonalne.
                  </p>

                  <StatRow label="Średnia (3 darts)" v1={avg1} v2={avg2} s1={setAvg1} s2={setAvg2} step="0.1" p1={selectedMatch.player1Name} p2={selectedMatch.player2Name} />
                  <StatRow label="180-tki" v1={oneEighties1} v2={oneEighties2} s1={setOneEighties1} s2={setOneEighties2} p1={selectedMatch.player1Name} p2={selectedMatch.player2Name} />
                  <StatRow label="Najw. checkout" v1={hc1} v2={hc2} s1={setHc1} s2={setHc2} p1={selectedMatch.player1Name} p2={selectedMatch.player2Name} />
                  <StatRow label="Ton 40 (40-59)" v1={ton40_1} v2={ton40_2} s1={setTon40_1} s2={setTon40_2} p1={selectedMatch.player1Name} p2={selectedMatch.player2Name} />
                  <StatRow label="Ton 60 (60-79)" v1={ton60_1} v2={ton60_2} s1={setTon60_1} s2={setTon60_2} p1={selectedMatch.player1Name} p2={selectedMatch.player2Name} />
                  <StatRow label="Ton 80 (80-99)" v1={ton80_1} v2={ton80_2} s1={setTon80_1} s2={setTon80_2} p1={selectedMatch.player1Name} p2={selectedMatch.player2Name} />
                  <StatRow label="Ton+ (100+)" v1={tonPlus1} v2={tonPlus2} s1={setTonPlus1} s2={setTonPlus2} p1={selectedMatch.player1Name} p2={selectedMatch.player2Name} />
                  <StatRow label="Rzuty (darts)" v1={darts1} v2={darts2} s1={setDarts1} s2={setDarts2} p1={selectedMatch.player1Name} p2={selectedMatch.player2Name} />
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

const StatRow = ({ label, v1, v2, s1, s2, step, p1, p2 }: {
  label: string; v1: string; v2: string;
  s1: (v: string) => void; s2: (v: string) => void;
  step?: string; p1: string; p2: string;
}) => (
  <div>
    <Label className="text-xs text-muted-foreground font-body mb-1 block">{label}</Label>
    <div className="grid grid-cols-2 gap-3">
      <Input type="number" min="0" step={step || "1"} value={v1} onChange={(e) => s1(e.target.value)}
        placeholder={p1.split(" ")[0]} className="bg-muted/30 border-border text-center font-display" />
      <Input type="number" min="0" step={step || "1"} value={v2} onChange={(e) => s2(e.target.value)}
        placeholder={p2.split(" ")[0]} className="bg-muted/30 border-border text-center font-display" />
    </div>
  </div>
);

export default SubmitMatchPage;
