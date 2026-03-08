import { useLeague } from "@/contexts/LeagueContext";
import { Trophy, Target, Crosshair, TrendingUp, Flame, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import LeagueSelector from "@/components/LeagueSelector";
import PlayerAvatar from "@/components/PlayerAvatar";

interface RecordEntry {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  playerAvatarUrl?: string | null;
  value: string | number;
}

const HallOfFamePage = () => {
  const { players, matches, activeLeagueId, getLeagueMatches, getPlayerLeagueStats } = useLeague();

  const leagueMatches = getLeagueMatches(activeLeagueId).filter((m) => m.status === "completed");

  // Compute records
  const records: { icon: React.ReactNode; title: string; entries: RecordEntry[] }[] = [];

  // Best single-match average
  const avgRecords: { pid: string; name: string; avatar: string; val: number }[] = [];
  leagueMatches.forEach((m) => {
    const p1 = players.find((p) => p.id === m.player1Id);
    const p2 = players.find((p) => p.id === m.player2Id);
    if (m.avg1 != null && p1) avgRecords.push({ pid: p1.id, name: p1.name, avatar: p1.avatar, val: m.avg1 });
    if (m.avg2 != null && p2) avgRecords.push({ pid: p2.id, name: p2.name, avatar: p2.avatar, val: m.avg2 });
  });
  avgRecords.sort((a, b) => b.val - a.val);
  records.push({
    icon: <TrendingUp className="h-6 w-6 text-secondary" />,
    title: "Najlepsza średnia (mecz)",
    entries: avgRecords.slice(0, 5).map((r) => ({
      playerId: r.pid, playerName: r.name, playerAvatar: r.avatar, value: r.val.toFixed(1),
    })),
  });

  // Highest checkout
  const coRecords: { pid: string; name: string; avatar: string; val: number }[] = [];
  leagueMatches.forEach((m) => {
    const p1 = players.find((p) => p.id === m.player1Id);
    const p2 = players.find((p) => p.id === m.player2Id);
    if (m.highCheckout1 && m.highCheckout1 > 0 && p1) coRecords.push({ pid: p1.id, name: p1.name, avatar: p1.avatar, val: m.highCheckout1 });
    if (m.highCheckout2 && m.highCheckout2 > 0 && p2) coRecords.push({ pid: p2.id, name: p2.name, avatar: p2.avatar, val: m.highCheckout2 });
  });
  coRecords.sort((a, b) => b.val - a.val);
  records.push({
    icon: <Crosshair className="h-6 w-6 text-primary" />,
    title: "Najwyższy checkout",
    entries: coRecords.slice(0, 5).map((r) => ({
      playerId: r.pid, playerName: r.name, playerAvatar: r.avatar, value: r.val,
    })),
  });

  // Most 180s (cumulative per player)
  const oneEightyMap: Record<string, number> = {};
  leagueMatches.forEach((m) => {
    oneEightyMap[m.player1Id] = (oneEightyMap[m.player1Id] || 0) + (m.oneEighties1 ?? 0);
    oneEightyMap[m.player2Id] = (oneEightyMap[m.player2Id] || 0) + (m.oneEighties2 ?? 0);
  });
  const oneEightyEntries = Object.entries(oneEightyMap)
    .map(([pid, val]) => {
      const p = players.find((pl) => pl.id === pid);
      return p ? { pid, name: p.name, avatar: p.avatar, val } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.val - a!.val)
    .slice(0, 5);
  records.push({
    icon: <Target className="h-6 w-6 text-accent" />,
    title: "Najwięcej 180-tek",
    entries: oneEightyEntries.map((r) => ({
      playerId: r!.pid, playerName: r!.name, playerAvatar: r!.avatar, value: r!.val,
    })),
  });

  // Most wins
  const winMap: Record<string, number> = {};
  leagueMatches.forEach((m) => {
    if ((m.score1 ?? 0) > (m.score2 ?? 0)) winMap[m.player1Id] = (winMap[m.player1Id] || 0) + 1;
    else if ((m.score2 ?? 0) > (m.score1 ?? 0)) winMap[m.player2Id] = (winMap[m.player2Id] || 0) + 1;
  });
  const winEntries = Object.entries(winMap)
    .map(([pid, val]) => {
      const p = players.find((pl) => pl.id === pid);
      return p ? { pid, name: p.name, avatar: p.avatar, val } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.val - a!.val)
    .slice(0, 5);
  records.push({
    icon: <Trophy className="h-6 w-6 text-accent" />,
    title: "Najwięcej zwycięstw",
    entries: winEntries.map((r) => ({
      playerId: r!.pid, playerName: r!.name, playerAvatar: r!.avatar, value: r!.val,
    })),
  });

  // Longest win streak
  const streakMap: Record<string, number> = {};
  const playerMatchesSorted: Record<string, typeof leagueMatches> = {};
  leagueMatches
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((m) => {
      [m.player1Id, m.player2Id].forEach((pid) => {
        if (!playerMatchesSorted[pid]) playerMatchesSorted[pid] = [];
        playerMatchesSorted[pid].push(m);
      });
    });

  Object.entries(playerMatchesSorted).forEach(([pid, pMatches]) => {
    let maxStreak = 0, current = 0;
    pMatches.forEach((m) => {
      const isP1 = m.player1Id === pid;
      const won = isP1 ? (m.score1 ?? 0) > (m.score2 ?? 0) : (m.score2 ?? 0) > (m.score1 ?? 0);
      if (won) { current++; maxStreak = Math.max(maxStreak, current); }
      else current = 0;
    });
    streakMap[pid] = maxStreak;
  });

  const streakEntries = Object.entries(streakMap)
    .map(([pid, val]) => {
      const p = players.find((pl) => pl.id === pid);
      return p ? { pid, name: p.name, avatar: p.avatar, val } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.val - a!.val)
    .slice(0, 5);
  records.push({
    icon: <Flame className="h-6 w-6 text-destructive" />,
    title: "Najdłuższa seria zwycięstw",
    entries: streakEntries.map((r) => ({
      playerId: r!.pid, playerName: r!.name, playerAvatar: r!.avatar, value: `${r!.val} z rzędu`,
    })),
  });

  const medals = ["🥇", "🥈", "🥉", "4.", "5."];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-accent" /> Hall of Fame
        </h1>
        <p className="text-muted-foreground font-body mb-4">Rekordy i najlepsi gracze ligi</p>
        <LeagueSelector />
      </div>

      {leagueMatches.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground font-body">Brak rozegranych meczów w tej lidze.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {records.map((record) => (
            <div key={record.title} className="rounded-lg border border-border bg-card p-5 card-glow">
              <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                {record.icon} {record.title}
              </h2>
              {record.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">Brak danych</p>
              ) : (
                <div className="space-y-2">
                  {record.entries.map((entry, i) => (
                    <Link
                      key={`${entry.playerId}-${i}`}
                      to={`/players/${entry.playerId}`}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/20 transition-colors"
                    >
                      <span className={`text-lg font-display w-8 text-center ${i === 0 ? "text-2xl" : ""}`}>
                        {medals[i]}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary">
                        {entry.playerAvatar}
                      </div>
                      <span className="flex-1 font-body font-medium text-foreground text-sm">{entry.playerName}</span>
                      <span className="font-display font-bold text-foreground text-lg">{entry.value}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HallOfFamePage;
