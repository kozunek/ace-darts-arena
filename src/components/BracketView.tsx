import { useLeague } from "@/contexts/LeagueContext";
import { Trophy, Medal } from "lucide-react";
import type { Match } from "@/data/mockData";
import { useRef, useEffect, useState } from "react";

const TBD_ID = "00000000-0000-0000-0000-000000000000";

const BracketView = () => {
  const { activeLeagueId, getLeagueMatches, players, leagues } = useLeague();
  const matches = getLeagueMatches(activeLeagueId);
  const league = leagues.find(l => l.id === activeLeagueId);

  // Group matches by bracket round
  const bracketMatches = matches.filter(m => m.bracketRound);
  const thirdPlaceMatch = bracketMatches.find(m => m.bracketRound === "Mecz o 3. miejsce");
  const luckyLoserMatches = bracketMatches.filter(m => m.bracketRound?.startsWith("Lucky Loser"));
  const luckyLoserFinal = bracketMatches.find(m => m.bracketRound === "Lucky Loser Finał");

  const mainBracketMatches = bracketMatches.filter(m => 
    m.bracketRound !== "Mecz o 3. miejsce" && 
    !m.bracketRound?.startsWith("Lucky Loser")
  );

  const roundOrder = ["Runda 1", "Runda 2", "Runda 3", "Runda 4", "Ćwierćfinał", "Półfinał", "Finał"];
  
  const roundsMap = new Map<string, Match[]>();
  mainBracketMatches.forEach(m => {
    const round = m.bracketRound!;
    if (!roundsMap.has(round)) roundsMap.set(round, []);
    roundsMap.get(round)!.push(m);
  });

  const rounds = Array.from(roundsMap.entries()).sort((a, b) => {
    const idxA = roundOrder.indexOf(a[0]);
    const idxB = roundOrder.indexOf(b[0]);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

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
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-accent" /> Drabinka Turniejowa
      </h2>

      {/* Main bracket with connector lines */}
      <BracketWithLines rounds={rounds} />

      {/* Third place match */}
      {thirdPlaceMatch && (
        <div className="mt-6">
          <h3 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-600" /> Mecz o 3. miejsce
          </h3>
          <BracketMatchCard match={thirdPlaceMatch} />
        </div>
      )}

      {/* Lucky Loser bracket */}
      {luckyLoserMatches.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Lucky Loser
          </h3>
          <p className="text-xs text-muted-foreground font-body mb-3">
            Przegrani z głównej drabinki grają w mini-turnieju. Zwycięzca gra w finale głównym!
          </p>
          <div className="flex flex-wrap gap-3">
            {luckyLoserMatches
              .filter(m => m.bracketRound !== "Lucky Loser Finał")
              .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
              .map(m => (
                <BracketMatchCard key={m.id} match={m} />
              ))}
          </div>
          {luckyLoserFinal && (
            <div className="mt-3">
              <span className="text-xs font-display uppercase tracking-wider text-primary mb-2 block">Finał Lucky Loser</span>
              <BracketMatchCard match={luckyLoserFinal} />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

/** Bracket with SVG connector lines between rounds */
const BracketWithLines = ({ rounds }: { rounds: [string, Match[]][] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; midX: number }[]>([]);
  const matchRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerRef = (matchId: string, el: HTMLDivElement | null) => {
    if (el) matchRefs.current.set(matchId, el);
    else matchRefs.current.delete(matchId);
  };

  useEffect(() => {
    const calculateLines = () => {
      if (!containerRef.current || rounds.length < 2) {
        setLines([]);
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLines: typeof lines = [];

      for (let rIdx = 0; rIdx < rounds.length - 1; rIdx++) {
        const [, currentMatches] = rounds[rIdx];
        const [, nextMatches] = rounds[rIdx + 1];
        const sortedCurrent = [...currentMatches].sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
        const sortedNext = [...nextMatches].sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));

        // Each pair of current matches feeds into one next match
        for (let i = 0; i < sortedCurrent.length; i++) {
          const currentMatch = sortedCurrent[i];
          const nextMatchIdx = Math.floor(i / 2);
          const nextMatch = sortedNext[nextMatchIdx];
          if (!nextMatch) continue;

          const currentEl = matchRefs.current.get(currentMatch.id);
          const nextEl = matchRefs.current.get(nextMatch.id);
          if (!currentEl || !nextEl) continue;

          const currentRect = currentEl.getBoundingClientRect();
          const nextRect = nextEl.getBoundingClientRect();

          const x1 = currentRect.right - containerRect.left;
          const y1 = currentRect.top + currentRect.height / 2 - containerRect.top;
          const x2 = nextRect.left - containerRect.left;
          const y2 = nextRect.top + nextRect.height / 2 - containerRect.top;
          const midX = (x1 + x2) / 2;

          newLines.push({ x1, y1, x2, y2, midX });
        }
      }

      setLines(newLines);
    };

    // Calculate after layout
    const timer = setTimeout(calculateLines, 100);
    window.addEventListener("resize", calculateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculateLines);
    };
  }, [rounds]);

  return (
    <div className="overflow-x-auto pb-4">
      <div ref={containerRef} className="relative flex gap-8 min-w-max py-4 px-2">
        {/* SVG connector lines */}
        {lines.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
          >
            {lines.map((line, idx) => (
              <g key={idx}>
                {/* Horizontal from current match to midpoint */}
                <line
                  x1={line.x1} y1={line.y1}
                  x2={line.midX} y2={line.y1}
                  stroke="hsl(var(--border))"
                  strokeWidth={2}
                  strokeOpacity={0.6}
                />
                {/* Vertical from y1 to y2 at midpoint */}
                <line
                  x1={line.midX} y1={line.y1}
                  x2={line.midX} y2={line.y2}
                  stroke="hsl(var(--border))"
                  strokeWidth={2}
                  strokeOpacity={0.6}
                />
                {/* Horizontal from midpoint to next match */}
                <line
                  x1={line.midX} y1={line.y2}
                  x2={line.x2} y2={line.y2}
                  stroke="hsl(var(--border))"
                  strokeWidth={2}
                  strokeOpacity={0.6}
                />
              </g>
            ))}
          </svg>
        )}

        {rounds.map(([roundName, roundMatches]) => {
          const sorted = [...roundMatches].sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
          
          return (
            <div key={roundName} className="flex flex-col items-center min-w-[220px] z-10">
              <div className="text-xs font-display uppercase tracking-wider text-accent mb-4 px-3 py-1 rounded-full border border-accent/30 bg-accent/10">
                {roundName}
              </div>
              <div className="flex flex-col gap-6 justify-around flex-1">
                {sorted.map((match) => (
                  <div key={match.id} ref={(el) => registerRef(match.id, el)}>
                    <BracketMatchCard match={match} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BracketMatchCard = ({ match }: { match: Match }) => {
  const isCompleted = match.status === "completed";
  const isPending = match.status === "pending_approval";
  const isTBD1 = match.player1Name === "TBD" || match.player1Id === TBD_ID;
  const isTBD2 = match.player2Name === "TBD" || match.player2Id === TBD_ID;
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
          <span className={`text-sm font-body truncate ${isTBD1 ? "text-muted-foreground italic" : p1Won ? "text-secondary font-semibold" : "text-foreground"}`}>
            {isTBD1 ? "TBD" : match.player1Name}
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
          <span className={`text-sm font-body truncate ${isTBD2 ? "text-muted-foreground italic" : p2Won ? "text-secondary font-semibold" : "text-foreground"}`}>
            {isTBD2 ? "TBD" : match.player2Name}
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
