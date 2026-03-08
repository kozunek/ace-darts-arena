import { useLeague } from "@/contexts/LeagueContext";
import { Link } from "react-router-dom";
import PlayerAvatar from "@/components/PlayerAvatar";

const PlayersPage = () => {
  const { players, activeLeagueId, getPlayerLeagueStats, getPlayerAchievements } = useLeague();
  const approved = players.filter((p) => p.approved);

  const withStats = approved.map((p) => ({
    ...p,
    stats: getPlayerLeagueStats(p.id, activeLeagueId),
    achievements: getPlayerAchievements(p.id, activeLeagueId),
  })).sort((a, b) => b.stats.points - a.stats.points);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Gracze</h1>
        <p className="text-muted-foreground font-body">{approved.length} uczestników ligi</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {withStats.map((player, idx) => (
          <Link to={`/players/${player.id}`} key={player.id}>
            <div className="rounded-lg border border-border bg-card p-5 card-glow hover:border-primary/30 transition-all group cursor-pointer h-full">
              <div className="flex items-center gap-3 mb-4">
                <PlayerAvatar avatarUrl={player.avatar_url} initials={player.avatar} size="sm" className="w-12 h-12 text-sm group-hover:border-primary/50 transition-colors" />
                <div>
                  <div className="font-body font-semibold text-foreground">{player.name}</div>
                  <div className="text-xs text-muted-foreground font-body">
                    {player.stats.matchesPlayed > 0 ? `#${idx + 1} w rankingu` : "Brak meczów"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <StatBlock label="Pkt" value={player.stats.points.toString()} />
                <StatBlock label="Śr." value={player.stats.avg > 0 ? player.stats.avg.toFixed(1) : "—"} />
                <StatBlock label="180" value={player.stats.oneEighties.toString()} />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-body">{player.stats.wins}W {player.stats.draws}R {player.stats.losses}P</span>
                <div className="flex gap-0.5">
                  {player.stats.form.slice(-5).map((f, i) => (
                    <span key={i} className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold ${
                      f === "W" ? "bg-secondary/20 text-secondary" : f === "L" ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent"
                    }`}>{f}</span>
                  ))}
                </div>
              </div>

              {player.achievements.length > 0 && (
                <div className="mt-3 flex gap-1 flex-wrap">
                  {player.achievements.slice(0, 3).map((a) => (
                    <span key={a.id} className="text-[10px] bg-muted/50 border border-border rounded-full px-2 py-0.5">{a.icon} {a.name}</span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const StatBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center bg-muted/30 rounded-md py-2">
    <div className="font-display font-bold text-foreground text-lg">{value}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">{label}</div>
  </div>
);

export default PlayersPage;
