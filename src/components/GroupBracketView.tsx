import { useLeague } from "@/contexts/LeagueContext";
import { Trophy, Medal, Award, Users } from "lucide-react";
import type { Match, PlayerLeagueStats } from "@/data/mockData";
import { useRef, useEffect, useState } from "react";

const FormBadge = ({ result }: { result: "W" | "L" }) => {
  const styles = {
    W: "bg-secondary/20 text-secondary border-secondary/30",
    L: "bg-destructive/20 text-destructive border-destructive/30",
  };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${styles[result]}`}>
      {result}
    </span>
  );
};

const GroupBracketView = () => {
  const { activeLeagueId, getLeagueMatches, getLeagueStandings, players } = useLeague();
  const matches = getLeagueMatches(activeLeagueId);

  // Separate group stage matches from bracket matches
  const groupMatches = matches.filter(m => m.groupName && !m.bracketRound);
  const bracketMatches = matches.filter(m => m.bracketRound);

  // Get unique group names
  const groupNames = [...new Set(groupMatches.map(m => m.groupName!))].sort();

  // For each group, compute standings from group matches only
  const getGroupStandings = (groupName: string) => {
    const gMatches = groupMatches.filter(m => m.groupName === groupName);
    const playerIds = new Set<string>();
    gMatches.forEach(m => { playerIds.add(m.player1Id); playerIds.add(m.player2Id); });

    const standings = Array.from(playerIds).map(pid => {
      const player = players.find(p => p.id === pid);
      const completed = gMatches.filter(m => m.status === "completed" && (m.player1Id === pid || m.player2Id === pid));
      
      let wins = 0, losses = 0, legsWon = 0, legsLost = 0;
      const form: ("W" | "L")[] = [];

      completed.forEach(m => {
        const isP1 = m.player1Id === pid;
        const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
        const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
        legsWon += myScore;
        legsLost += oppScore;
        if (myScore > oppScore) { wins++; form.push("W"); }
        else { losses++; form.push("L"); }
      });

      return {
        id: pid,
        name: player?.name ?? "?",
        avatar: player?.avatar ?? "?",
        wins, losses,
        points: wins * 3,
        legsWon, legsLost,
        legDiff: legsWon - legsLost,
        matchesPlayed: completed.length,
        form: form.slice(-5),
      };
    });

    return standings.sort((a, b) => b.points - a.points || b.legDiff - a.legDiff);
  };

  // Bracket rounds
  const roundOrder = ["Runda 1", "Runda 2", "Runda 3", "Runda 4", "Ćwierćfinał", "Półfinał", "Finał"];
  const roundsMap = new Map<string, Match[]>();
  bracketMatches.forEach(m => {
    const round = m.bracketRound!;
    if (!roundsMap.has(round)) roundsMap.set(round, []);
    roundsMap.get(round)!.push(m);
  });
  const rounds = Array.from(roundsMap.entries()).sort((a, b) => {
    const idxA = roundOrder.indexOf(a[0]);
    const idxB = roundOrder.indexOf(b[0]);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  return (
    <section className="space-y-8">
      {/* Group tables */}
      <div>
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Faza Grupowa
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groupNames.map(groupName => {
            const standings = getGroupStandings(groupName);
            const gMatches = groupMatches.filter(m => m.groupName === groupName);
            const totalMatches = gMatches.length;
            const completedMatches = gMatches.filter(m => m.status === "completed").length;

            return (
              <div key={groupName} className="rounded-lg border border-border bg-card card-glow overflow-hidden">
                <div className="bg-primary/10 border-b border-border px-4 py-3 flex items-center justify-between">
                  <h3 className="font-display font-bold text-foreground">{groupName}</h3>
                  <span className="text-xs text-muted-foreground font-body">
                    {completedMatches}/{totalMatches} meczów
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="text-left px-3 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground w-8">#</th>
                        <th className="text-left px-3 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">Gracz</th>
                        <th className="text-center px-2 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">M</th>
                        <th className="text-center px-2 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">W</th>
                        <th className="text-center px-2 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">P</th>
                        <th className="text-center px-2 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">Pkt</th>
                        <th className="text-center px-2 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">+/-</th>
                        <th className="text-center px-2 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">Forma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((entry, idx) => (
                        <tr key={entry.id} className={`border-b border-border/50 ${idx < 2 ? "bg-secondary/5" : ""}`}>
                          <td className="px-3 py-2 text-sm text-muted-foreground font-display">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-display font-bold text-primary">
                                {entry.avatar}
                              </div>
                              <span className="font-body text-sm text-foreground">{entry.name}</span>
                            </div>
                          </td>
                          <td className="text-center px-2 py-2 text-sm text-muted-foreground">{entry.matchesPlayed}</td>
                          <td className="text-center px-2 py-2 text-sm text-secondary font-semibold">{entry.wins}</td>
                          <td className="text-center px-2 py-2 text-sm text-destructive font-semibold">{entry.losses}</td>
                          <td className="text-center px-2 py-2">
                            <span className="font-display font-bold text-foreground">{entry.points}</span>
                          </td>
                          <td className="text-center px-2 py-2 text-sm text-muted-foreground font-body">
                            {entry.legDiff > 0 ? "+" : ""}{entry.legDiff}
                          </td>
                          <td className="text-center px-2 py-2">
                            <div className="flex gap-0.5 justify-center">
                              {entry.form.map((f, i) => <FormBadge key={i} result={f} />)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Group matches list */}
                <div className="border-t border-border px-4 py-3 space-y-2">
                  <h4 className="text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-2">Mecze grupowe</h4>
                  {gMatches.map(m => {
                    const isCompleted = m.status === "completed";
                    const isPending = m.status === "pending_approval";
                    return (
                      <div key={m.id} className={`flex items-center justify-between text-sm py-1.5 px-2 rounded ${isCompleted ? "bg-muted/20" : isPending ? "bg-accent/10" : ""}`}>
                        <span className={`font-body ${isCompleted && (m.score1 ?? 0) > (m.score2 ?? 0) ? "text-secondary font-semibold" : "text-foreground"}`}>
                          {m.player1Name}
                        </span>
                        <span className="font-display text-xs text-muted-foreground px-2">
                          {isCompleted ? `${m.score1} : ${m.score2}` : isPending ? `${m.score1} : ${m.score2} ⏳` : "vs"}
                        </span>
                        <span className={`font-body ${isCompleted && (m.score2 ?? 0) > (m.score1 ?? 0) ? "text-secondary font-semibold" : "text-foreground"}`}>
                          {m.player2Name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bracket / Playoff */}
      {rounds.length > 0 && (
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-accent" /> Faza Pucharowa
          </h2>
          <BracketWithLines rounds={rounds} />
        </div>
      )}

      {rounds.length === 0 && groupNames.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/10 p-6 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-body">
            Drabinka pucharowa zostanie wygenerowana po zakończeniu fazy grupowej.
          </p>
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
      if (!containerRef.current || rounds.length < 2) { setLines([]); return; }
      const containerRect = containerRef.current.getBoundingClientRect();
      const newLines: typeof lines = [];

      for (let rIdx = 0; rIdx < rounds.length - 1; rIdx++) {
        const [, currentMatches] = rounds[rIdx];
        const [, nextMatches] = rounds[rIdx + 1];
        const sortedCurrent = [...currentMatches].sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
        const sortedNext = [...nextMatches].sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));

        for (let i = 0; i < sortedCurrent.length; i++) {
          const currentMatch = sortedCurrent[i];
          const nextMatch = sortedNext[Math.floor(i / 2)];
          if (!nextMatch) continue;
          const currentEl = matchRefs.current.get(currentMatch.id);
          const nextEl = matchRefs.current.get(nextMatch.id);
          if (!currentEl || !nextEl) continue;
          const cRect = currentEl.getBoundingClientRect();
          const nRect = nextEl.getBoundingClientRect();
          newLines.push({
            x1: cRect.right - containerRect.left,
            y1: cRect.top + cRect.height / 2 - containerRect.top,
            x2: nRect.left - containerRect.left,
            y2: nRect.top + nRect.height / 2 - containerRect.top,
            midX: (cRect.right - containerRect.left + nRect.left - containerRect.left) / 2,
          });
        }
      }
      setLines(newLines);
    };
    const timer = setTimeout(calculateLines, 100);
    window.addEventListener("resize", calculateLines);
    return () => { clearTimeout(timer); window.removeEventListener("resize", calculateLines); };
  }, [rounds]);

  return (
    <div className="overflow-x-auto pb-4">
      <div ref={containerRef} className="relative flex gap-8 min-w-max py-4 px-2">
        {lines.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {lines.map((line, idx) => (
              <g key={idx}>
                <line x1={line.x1} y1={line.y1} x2={line.midX} y2={line.y1} stroke="hsl(var(--border))" strokeWidth={2} strokeOpacity={0.6} />
                <line x1={line.midX} y1={line.y1} x2={line.midX} y2={line.y2} stroke="hsl(var(--border))" strokeWidth={2} strokeOpacity={0.6} />
                <line x1={line.midX} y1={line.y2} x2={line.x2} y2={line.y2} stroke="hsl(var(--border))" strokeWidth={2} strokeOpacity={0.6} />
              </g>
            ))}
          </svg>
        )}
        {rounds.map(([roundName, roundMatches]) => {
          const sorted = [...roundMatches].sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
          return (
            <div key={roundName} className="flex flex-col items-center min-w-[220px] z-10">
              <div className="text-xs font-display uppercase tracking-wider text-accent mb-4 px-3 py-1 rounded-full border border-accent/30 bg-accent/10">{roundName}</div>
              <div className="flex flex-col gap-6 justify-around flex-1">
                {sorted.map(match => (
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
  const isTBD1 = match.player1Name === "TBD";
  const isTBD2 = match.player2Name === "TBD";
  const p1Won = isCompleted && (match.score1 ?? 0) > (match.score2 ?? 0);
  const p2Won = isCompleted && (match.score2 ?? 0) > (match.score1 ?? 0);

  return (
    <div className={`rounded-lg border bg-card w-[220px] overflow-hidden card-glow ${
      isPending ? "border-accent/50" : isCompleted ? "border-secondary/30" : "border-border"
    }`}>
      <div className={`flex items-center justify-between px-3 py-2.5 border-b border-border/50 ${p1Won ? "bg-secondary/10" : ""}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {p1Won && <Trophy className="h-3 w-3 text-secondary flex-shrink-0" />}
          <span className={`text-sm font-body truncate ${isTBD1 ? "text-muted-foreground italic" : p1Won ? "text-secondary font-semibold" : "text-foreground"}`}>
            {match.player1Name}
          </span>
        </div>
        {isCompleted && (
          <span className={`text-sm font-display font-bold ml-2 ${p1Won ? "text-secondary" : "text-muted-foreground"}`}>
            {match.score1}
          </span>
        )}
      </div>
      <div className={`flex items-center justify-between px-3 py-2.5 ${p2Won ? "bg-secondary/10" : ""}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {p2Won && <Trophy className="h-3 w-3 text-secondary flex-shrink-0" />}
          <span className={`text-sm font-body truncate ${isTBD2 ? "text-muted-foreground italic" : p2Won ? "text-secondary font-semibold" : "text-foreground"}`}>
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

export default GroupBracketView;
