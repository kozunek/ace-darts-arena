import { useLeague } from "@/contexts/LeagueContext";
import { Link } from "react-router-dom";

const PlayersPage = () => {
  const { players } = useLeague();
  const sorted = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Gracze</h1>
        <p className="text-muted-foreground font-body">Wszystkich {players.length} uczestników ligi</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((player, idx) => (
          <Link to={`/players/${player.id}`} key={player.id}>
            <div className="rounded-lg border border-border bg-card p-5 card-glow hover:border-primary/30 transition-all group cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-display font-bold text-primary group-hover:bg-primary/30 transition-colors">
                  {player.avatar}
                </div>
                <div>
                  <div className="font-body font-semibold text-foreground">{player.name}</div>
                  <div className="text-xs text-muted-foreground font-body">#{idx + 1} w rankingu</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center bg-muted/30 rounded-md py-2">
                  <div className="font-display font-bold text-foreground text-lg">{player.points}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Pkt</div>
                </div>
                <div className="text-center bg-muted/30 rounded-md py-2">
                  <div className="font-display font-bold text-foreground text-lg">{player.avg.toFixed(1)}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Śr.</div>
                </div>
                <div className="text-center bg-muted/30 rounded-md py-2">
                  <div className="font-display font-bold text-foreground text-lg">{player.oneEighties}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">180</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-body">{player.wins}W {player.draws}R {player.losses}P</span>
                <div className="flex gap-0.5">
                  {player.form.map((f, i) => (
                    <span
                      key={i}
                      className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold ${
                        f === "W" ? "bg-secondary/20 text-secondary" :
                        f === "L" ? "bg-destructive/20 text-destructive" :
                        "bg-accent/20 text-accent"
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {player.badges.length > 0 && (
                <div className="mt-3 flex gap-1 flex-wrap">
                  {player.badges.map((b, i) => (
                    <span key={i} className="text-[10px] bg-muted/50 border border-border rounded-full px-2 py-0.5">{b}</span>
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

export default PlayersPage;
