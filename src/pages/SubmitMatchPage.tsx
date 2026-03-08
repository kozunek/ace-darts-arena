import { useState } from "react";
import { players } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, PenTool, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SubmitMatchPage = () => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"link" | "manual">("link");
  const [autodartsLink, setAutodartsLink] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Mecz zgłoszony!",
      description: mode === "link"
        ? "Link do Autodarts.io został dodany. Wyniki zostaną przetworzone automatycznie."
        : "Wynik został zapisany ręcznie.",
    });
    setAutodartsLink("");
    setScore1("");
    setScore2("");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Dodaj Wynik</h1>
        <p className="text-muted-foreground font-body">Zgłoś wynik meczu przez link Autodarts.io lub ręcznie</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-8">
        <Button
          variant={mode === "link" ? "default" : "outline"}
          onClick={() => setMode("link")}
          className="font-display uppercase tracking-wider text-xs flex-1"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Link Autodarts
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
          className="font-display uppercase tracking-wider text-xs flex-1"
        >
          <PenTool className="h-4 w-4 mr-2" />
          Ręcznie
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Player selects */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="player1" className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 1</Label>
            <Select value={player1} onValueChange={setPlayer1}>
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
            <Label htmlFor="player2" className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 2</Label>
            <Select value={player2} onValueChange={setPlayer2}>
              <SelectTrigger className="bg-muted/30 border-border">
                <SelectValue placeholder="Wybierz gracza" />
              </SelectTrigger>
              <SelectContent>
                {players.filter((p) => p.id !== player1).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode === "link" ? (
          <div className="space-y-2">
            <Label htmlFor="link" className="font-display uppercase tracking-wider text-xs text-muted-foreground">
              Link do meczu (Autodarts.io)
            </Label>
            <Input
              id="link"
              type="url"
              value={autodartsLink}
              onChange={(e) => setAutodartsLink(e.target.value)}
              placeholder="https://autodarts.io/matches/..."
              className="bg-muted/30 border-border"
              required
            />
            <p className="text-xs text-muted-foreground font-body">
              Wyniki zostaną automatycznie pobrane z Autodarts.io po zatwierdzeniu.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                  Legi gracz 1
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
                  Legi gracz 2
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
          </div>
        )}

        <Button type="submit" variant="hero" size="lg" className="w-full">
          <Send className="h-4 w-4 mr-2" />
          Zgłoś Wynik
        </Button>
      </form>
    </div>
  );
};

export default SubmitMatchPage;
