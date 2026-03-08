import { useParams, Link } from "react-router-dom";
import { useLeague } from "@/contexts/LeagueContext";
import { ArrowLeft, Target, Trophy, TrendingUp, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";

const PlayerProfilePage = () => {
  const { id } = useParams();
  const { players, matches } = useLeague();
  const player = players.find((p) => p.id === id);

  if (!player) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display text-foreground mb-4">Gracz nie znaleziony</h1>
        <Link to="/players"><Button variant="outline">Wróć do listy</Button></Link>
      </div>
    );
  }

  const playerMatches = matches.filter(
    (m) => (m.player1Id === id || m.player2Id === id) && m.status === "completed"
  );
  const rank = [...players].sort((a, b) => b.points - a.points).findIndex((p) => p.id === id) + 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/players">
        <Button variant="ghost" size="sm" className="mb-6 font-display uppercase tracking-wider text-xs">
          <ArrowLeft className="h-4 w-4 mr-1" /> Wszyscy gracze
        </Button>
      </Link>

      <div className="rounded-lg border border-border bg-card p-6 md:p-8 card-glow mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-2xl font-display font-bold text-primary">
            {player.avatar}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">{player.name}</h1>
            <p className="text-muted-foreground font-body">Pozycja #{rank} · {player.wins + player.losses + player.draws} meczów</p>
            {player.badges.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {player.badges.map((b, i) => (
                  <span key={i} className="text-xs bg-muted/50 border border-border rounded-full px-3 py-1">{b}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {player.form.map((f, i) => (
              <span
                key={i}
                className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold border ${
                  f === "W" ? "bg-secondary/20 text-secondary border-secondary/30" :
                  f === "L" ? "bg-destructive/20 text-destructive border-destructive/30" :
                  "bg-accent/20 text-accent border-accent/30"
                }`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Trophy className="h-5 w-5" />} label="Punkty" value={player.points.toString()} color="text-accent" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Średnia" value={player.avg.toFixed(1)} color="text-secondary" />
        <StatCard icon={<Target className="h-5 w-5" />} label="180-tki" value={player.oneEighties.toString()} color="text-primary" />
        <StatCard icon={<Crosshair className="h-5 w-5" />} label="Najw. checkout" value={player.highestCheckout.toString()} color="text-foreground" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MiniStat label="Wygrane" value={player.wins} total={player.wins + player.losses + player.draws} colorClass="text-secondary" bgClass="bg-secondary" />
        <MiniStat label="Remisy" value={player.draws} total={player.wins + player.losses + player.draws} colorClass="text-accent" bgClass="bg-accent" />
        <MiniStat label="Przegrane" value={player.losses} total={player.wins + player.losses + player.draws} colorClass="text-destructive" bgClass="bg-destructive" />
      </div>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground mb-4">Historia Meczów</h2>
        {playerMatches.length === 0 ? (
          <p className="text-muted-foreground font-body">Brak rozegranych meczów.</p>
        ) : (
          <div className="space-y-3">
            {playerMatches.map((match) => {
              const isPlayer1 = match.player1Id === id;
              const myScore = isPlayer1 ? match.score1 : match.score2;
              const oppScore = isPlayer1 ? match.score2 : match.score1;
              const opponent = isPlayer1 ? match.player2Name : match.player1Name;
              const won = (myScore ?? 0) > (oppScore ?? 0);
              const draw = myScore === oppScore;

              return (
                <div key={match.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                  <div>
                    <div className="font-body font-medium text-foreground text-sm">vs {opponent}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(match.date).toLocaleDateString("pl-PL")}
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
                    }`}>
                      {won ? "W" : draw ? "R" : "P"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
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

const MiniStat = ({ label, value, total, colorClass, bgClass }: { label: string; value: number; total: number; colorClass: string; bgClass: string }) => (
  <div className="rounded-lg border border-border bg-card p-4 text-center">
    <div className={`text-2xl font-display font-bold ${colorClass}`}>{value}</div>
    <div className="text-xs text-muted-foreground font-body mt-1">{label}</div>
    <div className="w-full bg-muted/50 rounded-full h-1.5 mt-2">
      <div className={`h-1.5 rounded-full ${bgClass}`} style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
    </div>
  </div>
);

export default PlayerProfilePage;
