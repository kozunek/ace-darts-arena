import { useLeague } from "@/contexts/LeagueContext";
import { Trophy } from "lucide-react";
import type { Match } from "@/data/mockData";

const BracketView = () => {
  const { activeLeagueId, getLeagueMatches, players } = useLeague();
  const matches = getLeagueMatches(activeLeagueId);

  // Group matches by bracket round
  const bracketMatches = matches.filter(m => m.bracketRound);
  const roundOrder = ["Runda 1", "Runda 2", "Runda 3", "Runda 4", "Ćwierćfinał", "Półfinał", "Finał"];
  
  const roundsMap = new Map<string, Match[]>();
  bracketMatches.forEach(m => {
    const round = m.bracketRound!;
    if (!roundsMap.has(round)) roundsMap.set(round, []);
    roundsMap.get(round)!.push(m);
  });

  // Sort rounds in proper order
  const rounds = Array.from(roundsMap.entries()).sort((a, b) => {
    const idxA = roundOrder.indexOf(a[0]);
    const idxB = roundOrder.indexOf(b[0]);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  // Also show non-bracket upcoming/completed matches
  const nonBracketMatches = matches.filter(m => !m.bracketRound);

  if (rounds.length === 0 && nonBracketMatches.length === 0) {
    return (
      <section>
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-accent" /> Drabinka Turniejowa
        </h2>
        <p className="text-muted-foreground font-body">Brak meczów w drabince. Wygeneruj harmonogram w panelu admina.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-accent" /> Drabinka Turniejowa
      </h2>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {rounds.map(([roundName, roundMatches]) => {
            // Sort by bracket position
            const sorted = [...roundMatches].sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
            
            return (
              <div key={roundName} className="flex flex-col items-center min-w-[220px]">
                <div className="text-xs font-display uppercase tracking-wider text-accent mb-4 px-3 py-1 rounded-full border border-accent/30 bg-accent/10">
                  {roundName}
                </div>
                <div className="flex flex-col gap-4 justify-around flex-1">
                  {sorted.map((match) => (
                    <BracketMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const BracketMatchCard = ({ match }: { match: Match }) => {
  const isCompleted = match.status === "completed";
  const isPending = match.status === "pending_approval";
  const p1Won = isCompleted && (match.score1 ?? 0) > (match.score2 ?? 0);
  const p2Won = isCompleted && (match.score2 ?? 0) > (match.score1 ?? 0);

  return (
    <div className={`rounded-lg border bg-card w-[220px] overflow-hidden card-glow ${
      isPending ? "border-accent/50" : isCompleted ? "border-secondary/30" : "border-border"
    }`}>
      {/* Player 1 */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b border-border/50 ${
        p1Won ? "bg-secondary/10" : ""
      }`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {p1Won && <Trophy className="h-3 w-3 text-secondary flex-shrink-0" />}
          <span className={`text-sm font-body truncate ${p1Won ? "text-secondary font-semibold" : "text-foreground"}`}>
            {match.player1Name}
          </span>
        </div>
        {isCompleted && (
          <span className={`text-sm font-display font-bold ml-2 ${p1Won ? "text-secondary" : "text-muted-foreground"}`}>
            {match.score1}
          </span>
        )}
      </div>
      {/* Player 2 */}
      <div className={`flex items-center justify-between px-3 py-2.5 ${
        p2Won ? "bg-secondary/10" : ""
      }`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {p2Won && <Trophy className="h-3 w-3 text-secondary flex-shrink-0" />}
          <span className={`text-sm font-body truncate ${p2Won ? "text-secondary font-semibold" : "text-foreground"}`}>
            {match.player2Name}
          </span>
        </div>
        {isCompleted && (
          <span className={`text-sm font-display font-bold ml-2 ${p2Won ? "text-secondary" : "text-muted-foreground"}`}>
            {match.score2}
          </span>
        )}
      </div>
      {isPending && (
        <div className="bg-accent/10 text-center py-1">
          <span className="text-[10px] font-display uppercase text-accent">Oczekuje ⏳</span>
        </div>
      )}
    </div>
  );
};

export default BracketView;
