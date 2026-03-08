import { useParams, Link } from "react-router-dom";
import { useLeague } from "@/contexts/LeagueContext";
import { ArrowLeft, Target, Trophy, TrendingUp, Crosshair, BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const PlayerProfilePage = () => {
  const { id } = useParams();
  const { players, matches, getPlayerAllLeagueStats, getPlayerAchievements } = useLeague();
  const player = players.find((p) => p.id === id);

  if (!player) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display text-foreground mb-4">Gracz nie znaleziony</h1>
        <Link to="/players"><Button variant="outline">Wróć do listy</Button></Link>
      </div>
    );
  }

  const allLeagueStats = getPlayerAllLeagueStats(player.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/players">
        <Button variant="ghost" size="sm" className="mb-6 font-display uppercase tracking-wider text-xs">
          <ArrowLeft className="h-4 w-4 mr-1" /> Wszyscy gracze
        </Button>
      </Link>

      {/* Profile header */}
      <div className="rounded-lg border border-border bg-card p-6 md:p-8 card-glow mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-2xl font-display font-bold text-primary">
            {player.avatar}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">{player.name}</h1>
            <p className="text-muted-foreground font-body">
              Aktywny w {allLeagueStats.length} {allLeagueStats.length === 1 ? "lidze" : "ligach"}
            </p>
          </div>
        </div>
      </div>

      {/* Per-league stats */}
      {allLeagueStats.map(({ league, stats }) => {
        const achiev = getPlayerAchievements(player.id, league.id);
        const playerMatches = matches.filter(
          (m) => m.leagueId === league.id && m.status === "completed" && (m.player1Id === id || m.player2Id === id)
        );

        return (
          <div key={league.id} className="mb-10">
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              {league.name} <span className="text-sm text-muted-foreground font-body font-normal">· {league.season}</span>
            </h2>

            {/* Main stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard icon={<Trophy className="h-5 w-5" />} label="Punkty" value={stats.points.toString()} color="text-accent" />
              <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Średnia" value={stats.avg > 0 ? stats.avg.toFixed(1) : "—"} color="text-secondary" />
              <StatCard icon={<Target className="h-5 w-5" />} label="180-tki" value={stats.oneEighties.toString()} color="text-primary" />
              <StatCard icon={<Crosshair className="h-5 w-5" />} label="Najw. checkout" value={stats.highestCheckout > 0 ? stats.highestCheckout.toString() : "—"} color="text-foreground" />
            </div>

            {/* Extended stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              <MiniStatBox label="Mecze" value={stats.matchesPlayed} />
              <MiniStatBox label="Wygrane" value={stats.wins} />
              <MiniStatBox label="Remisy" value={stats.draws} />
              <MiniStatBox label="Przegrane" value={stats.losses} />
              <MiniStatBox label="Legi +" value={stats.legsWon} />
              <MiniStatBox label="Legi -" value={stats.legsLost} />
            </div>

            {/* Scoring breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <MiniStatBox label="Najl. Śr." value={stats.bestAvg > 0 ? stats.bestAvg.toFixed(1) : "—"} />
              <MiniStatBox label="Ton 60" value={stats.ton60} />
              <MiniStatBox label="Ton 80" value={stats.ton80} />
              <MiniStatBox label="Ton+" value={stats.tonPlus} />
            </div>

            {/* Form */}
            {stats.form.length > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">Forma:</span>
                {stats.form.map((f, i) => (
                  <span key={i} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold border ${
                    f === "W" ? "bg-secondary/20 text-secondary border-secondary/30" :
                    f === "L" ? "bg-destructive/20 text-destructive border-destructive/30" :
                    "bg-accent/20 text-accent border-accent/30"
                  }`}>{f}</span>
                ))}
              </div>
            )}

            {/* Achievements */}
            {achiev.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Osiągnięcia ({achiev.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {achiev.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border bg-muted/20 p-3 flex items-center gap-3">
                      <span className="text-2xl">{a.icon}</span>
                      <div>
                        <div className="font-body font-semibold text-foreground text-sm">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match history */}
            <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Historia meczów
            </h3>
            {playerMatches.length === 0 ? (
              <p className="text-muted-foreground font-body text-sm">Brak rozegranych meczów.</p>
            ) : (
              <div className="space-y-2">
                {playerMatches.map((match) => {
                  const isP1 = match.player1Id === id;
                  const myScore = isP1 ? match.score1 : match.score2;
                  const oppScore = isP1 ? match.score2 : match.score1;
                  const opponent = isP1 ? match.player2Name : match.player1Name;
                  const myAvg = isP1 ? match.avg1 : match.avg2;
                  const my180 = isP1 ? match.oneEighties1 : match.oneEighties2;
                  const won = (myScore ?? 0) > (oppScore ?? 0);
                  const draw = myScore === oppScore;

                  return (
                    <div key={match.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                      <div>
                        <div className="font-body font-medium text-foreground text-sm">vs {opponent}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(match.date).toLocaleDateString("pl-PL")}
                          {match.round && ` · Kolejka ${match.round}`}
                          {myAvg != null && ` · Śr. ${myAvg.toFixed(1)}`}
                          {my180 != null && my180 > 0 && ` · 180×${my180}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-display font-bold ${won ? "text-secondary" : draw ? "text-accent" : "text-destructive"}`}>
                          {myScore}:{oppScore}
                        </span>
                        <span className={`text-xs font-display uppercase px-2 py-1 rounded border ${
                          won ? "text-secondary bg-secondary/10 border-secondary/30" :
                          draw ? "text-accent bg-accent/10 border-accent/30" :
                          "text-destructive bg-destructive/10 border-destructive/30"
                        }`}>{won ? "W" : draw ? "R" : "P"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {allLeagueStats.length === 0 && (
        <p className="text-muted-foreground font-body">Gracz nie uczestniczy jeszcze w żadnej lidze.</p>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="rounded-lg border border-border bg-card p-4 card-glow text-center">
    <div className={`${color} mb-2 flex justify-center`}>{icon}</div>
    <div className="text-2xl font-display font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground uppercase tracking-wider font-display mt-1">{label}</div>
  </div>
);

const MiniStatBox = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
    <div className="text-lg font-display font-bold text-foreground">{value}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">{label}</div>
  </div>
);

export default PlayerProfilePage;
