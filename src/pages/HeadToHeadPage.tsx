import { useState } from "react";
import { useLeague } from "@/contexts/LeagueContext";
import { ArrowLeft, Swords, Trophy, TrendingUp, Target, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import LeagueSelector from "@/components/LeagueSelector";
import PlayerAvatar from "@/components/PlayerAvatar";

const HeadToHeadPage = () => {
  const { players, matches, activeLeagueId, getLeagueMatches } = useLeague();
  const [player1Id, setPlayer1Id] = useState<string>("");
  const [player2Id, setPlayer2Id] = useState<string>("");

  const leagueMatches = getLeagueMatches(activeLeagueId);

  const h2hMatches = leagueMatches.filter(
    (m) =>
      m.status === "completed" &&
      ((m.player1Id === player1Id && m.player2Id === player2Id) ||
        (m.player1Id === player2Id && m.player2Id === player1Id))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const p1 = players.find((p) => p.id === player1Id);
  const p2 = players.find((p) => p.id === player2Id);

  // Calculate H2H stats
  let p1Wins = 0, p2Wins = 0, draws = 0;
  let p1AvgSum = 0, p2AvgSum = 0, avgCount = 0;
  let p1_180 = 0, p2_180 = 0;
  let p1Legs = 0, p2Legs = 0;

  h2hMatches.forEach((m) => {
    const p1IsPlayer1 = m.player1Id === player1Id;
    const s1 = p1IsPlayer1 ? m.score1 : m.score2;
    const s2 = p1IsPlayer1 ? m.score2 : m.score1;

    if ((s1 ?? 0) > (s2 ?? 0)) p1Wins++;
    else if ((s2 ?? 0) > (s1 ?? 0)) p2Wins++;
    else draws++;

    const a1 = p1IsPlayer1 ? m.avg1 : m.avg2;
    const a2 = p1IsPlayer1 ? m.avg2 : m.avg1;
    if (a1 != null && a2 != null) {
      p1AvgSum += a1;
      p2AvgSum += a2;
      avgCount++;
    }

    p1_180 += (p1IsPlayer1 ? m.oneEighties1 : m.oneEighties2) ?? 0;
    p2_180 += (p1IsPlayer1 ? m.oneEighties2 : m.oneEighties1) ?? 0;
    p1Legs += (p1IsPlayer1 ? m.legsWon1 : m.legsWon2) ?? 0;
    p2Legs += (p1IsPlayer1 ? m.legsWon2 : m.legsWon1) ?? 0;
  });

  const bothSelected = player1Id && player2Id && player1Id !== player2Id;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Swords className="h-8 w-8 text-primary" /> Porównanie H2H
        </h1>
        <p className="text-muted-foreground font-body mb-4">Porównaj statystyki dwóch graczy</p>
        <LeagueSelector />
      </div>

      {/* Player selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2 block">Gracz 1</label>
          <Select value={player1Id} onValueChange={setPlayer1Id}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Wybierz gracza" />
            </SelectTrigger>
            <SelectContent>
              {players.filter((p) => p.id !== player2Id).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="mr-2">{p.avatar}</span> {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2 block">Gracz 2</label>
          <Select value={player2Id} onValueChange={setPlayer2Id}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Wybierz gracza" />
            </SelectTrigger>
            <SelectContent>
              {players.filter((p) => p.id !== player1Id).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="mr-2">{p.avatar}</span> {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {bothSelected && p1 && p2 && (
        <>
          {/* Score summary */}
          <div className="rounded-lg border border-border bg-card p-6 card-glow">
            <div className="flex items-center justify-between mb-6">
              <div className="text-center flex-1">
                <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-xl font-display font-bold text-primary mx-auto mb-2">
                  {p1.avatar}
                </div>
                <Link to={`/players/${p1.id}`} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
                  {p1.name}
                </Link>
              </div>
              <div className="text-center px-6">
                <div className="text-4xl font-display font-bold text-foreground">
                  {p1Wins} <span className="text-muted-foreground text-lg">:</span> {p2Wins}
                </div>
                {draws > 0 && (
                  <div className="text-xs text-muted-foreground font-body mt-1">{draws} {draws === 1 ? "remis" : "remisy"}</div>
                )}
                <div className="text-xs text-muted-foreground font-display uppercase mt-2">
                  {h2hMatches.length} {h2hMatches.length === 1 ? "mecz" : h2hMatches.length < 5 ? "mecze" : "meczów"}
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-xl font-display font-bold text-primary mx-auto mb-2">
                  {p2.avatar}
                </div>
                <Link to={`/players/${p2.id}`} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
                  {p2.name}
                </Link>
              </div>
            </div>

            {/* Stat bars */}
            {h2hMatches.length > 0 && (
              <div className="space-y-3">
                <H2HBar label="Średnia" v1={avgCount > 0 ? (p1AvgSum / avgCount) : 0} v2={avgCount > 0 ? (p2AvgSum / avgCount) : 0} format={(v) => v.toFixed(1)} />
                <H2HBar label="180-tki" v1={p1_180} v2={p2_180} format={(v) => v.toString()} />
                <H2HBar label="Legi wygrane" v1={p1Legs} v2={p2Legs} format={(v) => v.toString()} />
              </div>
            )}
          </div>

          {/* Match history */}
          {h2hMatches.length > 0 ? (
            <div>
              <h2 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Historia meczów ({h2hMatches.length})
              </h2>
              <div className="space-y-2">
                {h2hMatches.map((match) => {
                  const p1IsPlayer1 = match.player1Id === player1Id;
                  const s1 = p1IsPlayer1 ? match.score1 : match.score2;
                  const s2 = p1IsPlayer1 ? match.score2 : match.score1;
                  const won = (s1 ?? 0) > (s2 ?? 0);
                  const draw = s1 === s2;

                  return (
                    <div key={match.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground font-body">
                        {new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                        {match.round && ` · Kolejka ${match.round}`}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-display font-bold text-lg ${won ? "text-secondary" : draw ? "text-accent" : "text-muted-foreground"}`}>
                          {p1?.name?.split(" ")[0]}
                        </span>
                        <span className="text-2xl font-display font-bold text-foreground">
                          {s1}:{s2}
                        </span>
                        <span className={`font-display font-bold text-lg ${!won && !draw ? "text-secondary" : draw ? "text-accent" : "text-muted-foreground"}`}>
                          {p2?.name?.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-6 text-center">
              <p className="text-muted-foreground font-body">Ci gracze nie rozegrali jeszcze meczu w tej lidze.</p>
            </div>
          )}
        </>
      )}

      {!bothSelected && (
        <div className="rounded-lg border border-border bg-muted/20 p-8 text-center">
          <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground font-body">Wybierz dwóch graczy, aby zobaczyć porównanie.</p>
        </div>
      )}
    </div>
  );
};

const H2HBar = ({ label, v1, v2, format }: { label: string; v1: number; v2: number; format: (v: number) => string }) => {
  const total = v1 + v2;
  const p1Pct = total > 0 ? (v1 / total) * 100 : 50;

  return (
    <div>
      <div className="flex justify-between text-xs font-display uppercase tracking-wider text-muted-foreground mb-1">
        <span>{format(v1)}</span>
        <span>{label}</span>
        <span>{format(v2)}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
        <div
          className="bg-primary transition-all duration-500"
          style={{ width: `${p1Pct}%` }}
        />
        <div
          className="bg-accent transition-all duration-500"
          style={{ width: `${100 - p1Pct}%` }}
        />
      </div>
    </div>
  );
};

export default HeadToHeadPage;
