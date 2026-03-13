import { useMemo } from "react";
import { Match, Player } from "@/data/mockData";
import { Users, AlertTriangle, Trophy, Clock } from "lucide-react";

interface ActivityReportPanelProps {
  matches: Match[];
  players: Player[];
}

const ActivityReportPanel = ({ matches, players }: ActivityReportPanelProps) => {
  const report = useMemo(() => {
    const completedMatches = matches.filter(m => m.status === "completed");
    const approvedPlayers = players.filter(p => p.approved);

    const playerActivity = approvedPlayers.map(player => {
      const playerMatches = completedMatches.filter(
        m => m.player1Id === player.id || m.player2Id === player.id
      );
      const submittedMatches = matches.filter(
        m => (m.player1Id === player.id || m.player2Id === player.id) &&
        (m.status === "completed" || m.status === "pending_approval")
      );
      
      const lastMatchDate = playerMatches.length > 0
        ? new Date(Math.max(...playerMatches.map(m => new Date(m.date).getTime())))
        : null;

      const daysSinceLastMatch = lastMatchDate
        ? Math.floor((Date.now() - lastMatchDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Calculate avg of last 5 matches
      const last5 = [...playerMatches]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const avgLast5 = last5.reduce((sum, m) => {
        const avg = m.player1Id === player.id ? m.avg1 : m.avg2;
        return sum + (avg ?? 0);
      }, 0) / (last5.length || 1);

      return {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        totalMatches: playerMatches.length,
        submittedMatches: submittedMatches.length,
        neverSubmitted: submittedMatches.length === 0,
        lastMatchDate,
        daysSinceLastMatch,
        avgLast5: last5.length > 0 ? avgLast5 : null,
        wins: playerMatches.filter(m => {
          const isP1 = m.player1Id === player.id;
          return (isP1 ? (m.score1 ?? 0) > (m.score2 ?? 0) : (m.score2 ?? 0) > (m.score1 ?? 0));
        }).length,
      };
    });

    // Sort by activity (never submitted first, then by days since last match desc)
    playerActivity.sort((a, b) => {
      if (a.neverSubmitted && !b.neverSubmitted) return -1;
      if (!a.neverSubmitted && b.neverSubmitted) return 1;
      return (b.daysSinceLastMatch ?? 999) - (a.daysSinceLastMatch ?? 999);
    });

    return playerActivity;
  }, [matches, players]);

  const neverSubmitted = report.filter(p => p.neverSubmitted);
  const active = report.filter(p => !p.neverSubmitted);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" /> Raport aktywności
      </h2>

      {/* Never submitted */}
      {neverSubmitted.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="text-sm font-display uppercase tracking-wider text-destructive mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Nigdy nie zgłosili meczu ({neverSubmitted.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {neverSubmitted.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-card px-3 py-1 text-xs font-body text-foreground">
                <span className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center text-[9px] font-display font-bold text-destructive">{p.avatar}</span>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Activity table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-body">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-display uppercase tracking-wider text-muted-foreground text-[10px]">Gracz</th>
                <th className="text-center p-3 font-display uppercase tracking-wider text-muted-foreground text-[10px]">Mecze</th>
                <th className="text-center p-3 font-display uppercase tracking-wider text-muted-foreground text-[10px]">Wygrane</th>
                <th className="text-center p-3 font-display uppercase tracking-wider text-muted-foreground text-[10px]">Śr. (ost. 5)</th>
                <th className="text-center p-3 font-display uppercase tracking-wider text-muted-foreground text-[10px]">Ostatni mecz</th>
                <th className="text-center p-3 font-display uppercase tracking-wider text-muted-foreground text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {active.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-display font-bold text-primary">{p.avatar}</span>
                      <span className="font-medium text-foreground">{p.name}</span>
                    </div>
                  </td>
                  <td className="text-center p-3 text-foreground">{p.totalMatches}</td>
                  <td className="text-center p-3 text-foreground">{p.wins}</td>
                  <td className="text-center p-3 text-foreground">{p.avgLast5 != null ? p.avgLast5.toFixed(1) : "—"}</td>
                  <td className="text-center p-3 text-muted-foreground">
                    {p.lastMatchDate ? (
                      <>
                        {p.lastMatchDate.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                        <span className="text-[10px] ml-1 text-muted-foreground">({p.daysSinceLastMatch}d)</span>
                      </>
                    ) : "—"}
                  </td>
                  <td className="text-center p-3">
                    {p.daysSinceLastMatch != null && p.daysSinceLastMatch > 14 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-display uppercase">
                        <Clock className="h-3 w-3" /> Nieaktywny
                      </span>
                    ) : p.daysSinceLastMatch != null && p.daysSinceLastMatch > 7 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-display uppercase">
                        <Clock className="h-3 w-3" /> Ostrzeżenie
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 text-secondary px-2 py-0.5 text-[10px] font-display uppercase">
                        <Trophy className="h-3 w-3" /> Aktywny
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityReportPanel;
