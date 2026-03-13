import { useMemo } from "react";
import { Match, Player, League } from "@/data/mockData";
import { AlertTriangle, Clock, Users, Calendar } from "lucide-react";

interface LeagueStatusPanelProps {
  matches: Match[];
  players: Player[];
  leagues: League[];
}

const LeagueStatusPanel = ({ matches, players, leagues }: LeagueStatusPanelProps) => {
  const statusData = useMemo(() => {
    const activeLeagues = leagues.filter(l => l.is_active);

    return activeLeagues.map(league => {
      const leagueMatches = matches.filter(m => m.leagueId === league.id);
      const upcoming = leagueMatches.filter(m => m.status === "upcoming");
      const completed = leagueMatches.filter(m => m.status === "completed");
      const pending = leagueMatches.filter(m => m.status === "pending_approval");

      // Find players who haven't played the longest
      const playerLastMatch: Record<string, Date> = {};
      const leaguePlayers = new Set<string>();

      for (const m of leagueMatches) {
        leaguePlayers.add(m.player1Id);
        leaguePlayers.add(m.player2Id);
        if (m.status === "completed") {
          const d = new Date(m.date);
          if (!playerLastMatch[m.player1Id] || d > playerLastMatch[m.player1Id]) {
            playerLastMatch[m.player1Id] = d;
          }
          if (!playerLastMatch[m.player2Id] || d > playerLastMatch[m.player2Id]) {
            playerLastMatch[m.player2Id] = d;
          }
        }
      }

      // Players who never played
      const neverPlayed = [...leaguePlayers].filter(pid => !playerLastMatch[pid]);
      
      // Players sorted by oldest last match
      const inactivePlayers = [...leaguePlayers]
        .filter(pid => playerLastMatch[pid])
        .map(pid => ({
          id: pid,
          name: players.find(p => p.id === pid)?.name || "?",
          lastMatch: playerLastMatch[pid],
          daysSince: Math.floor((Date.now() - playerLastMatch[pid].getTime()) / (1000 * 60 * 60 * 24)),
        }))
        .sort((a, b) => a.lastMatch.getTime() - b.lastMatch.getTime())
        .slice(0, 5);

      // Overdue matches (upcoming older than 7 days ago)
      const overdueMatches = upcoming.filter(m => {
        if (!m.confirmedDate) return false;
        return new Date(m.confirmedDate) < new Date();
      });

      return {
        league,
        total: leagueMatches.length,
        completed: completed.length,
        upcoming: upcoming.length,
        pending: pending.length,
        overdue: overdueMatches.length,
        neverPlayed: neverPlayed.map(pid => players.find(p => p.id === pid)?.name || "?"),
        inactivePlayers,
        progress: leagueMatches.length > 0 ? Math.round((completed.length / leagueMatches.length) * 100) : 0,
      };
    });
  }, [matches, players, leagues]);

  if (statusData.length === 0) {
    return <p className="text-muted-foreground font-body text-sm">Brak aktywnych lig.</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" /> Status lig
      </h2>

      {statusData.map(({ league, total, completed, upcoming, pending, overdue, neverPlayed, inactivePlayers, progress }) => (
        <div key={league.id} className="rounded-lg border border-border bg-card p-5 card-glow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-foreground">{league.name} <span className="text-xs text-muted-foreground font-body">· {league.season}</span></h3>
            <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">{progress}% ukończone</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-muted/30 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <MiniStat label="Rozegrane" value={completed} icon="✅" />
            <MiniStat label="Zaplanowane" value={upcoming} icon="📅" />
            <MiniStat label="Oczekujące" value={pending} icon="⏳" />
            <MiniStat label="Zaległe" value={overdue} icon="⚠️" highlight={overdue > 0} />
          </div>

          {/* Inactive players */}
          {(inactivePlayers.length > 0 || neverPlayed.length > 0) && (
            <div className="mt-3 space-y-2">
              {neverPlayed.length > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                  <span className="text-muted-foreground font-body">
                    <span className="text-destructive font-medium">Nigdy nie grali:</span>{" "}
                    {neverPlayed.slice(0, 5).join(", ")}{neverPlayed.length > 5 && ` (+${neverPlayed.length - 5})`}
                  </span>
                </div>
              )}
              {inactivePlayers.length > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                  <span className="text-muted-foreground font-body">
                    <span className="text-accent font-medium">Najdłużej bez meczu:</span>{" "}
                    {inactivePlayers.map(p => `${p.name} (${p.daysSince}d)`).join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const MiniStat = ({ label, value, icon, highlight }: { label: string; value: number; icon: string; highlight?: boolean }) => (
  <div className={`rounded-lg border p-3 text-center ${highlight ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/20"}`}>
    <div className="text-lg font-display font-bold text-foreground">{icon} {value}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">{label}</div>
  </div>
);

export default LeagueStatusPanel;
