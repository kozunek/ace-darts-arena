import { useLeague } from "@/contexts/LeagueContext";
import { Trophy, Medal, Award } from "lucide-react";
import { DEFAULT_BONUS_RULES } from "@/data/mockData";
import PlayerAvatar from "@/components/PlayerAvatar";

const FormBadge = ({ result }: { result: "W" | "L" | "D" }) => {
  const styles = {
    W: "bg-secondary/20 text-secondary border-secondary/30",
    L: "bg-destructive/20 text-destructive border-destructive/30",
    D: "bg-accent/20 text-accent border-accent/30",
  };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${styles[result]}`}>
      {result}
    </span>
  );
};

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Trophy className="h-4 w-4 text-accent" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-muted-foreground" />;
  if (rank === 3) return <Award className="h-4 w-4 text-primary/70" />;
  return <span className="text-xs text-muted-foreground font-display w-4 text-center">{rank}</span>;
};

const LeagueTable = () => {
  const { activeLeagueId, getLeagueStandings, getPlayerAchievements, leagues } = useLeague();
  const league = leagues.find(l => l.id === activeLeagueId);
  const rules = league?.bonus_rules ?? DEFAULT_BONUS_RULES;
  const standings = getLeagueStandings(activeLeagueId);

  if (standings.length === 0) {
    return (
      <section>
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">Tabela Ligi</h2>
        <p className="text-muted-foreground font-body">Brak graczy w tej lidze.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">Tabela Ligi</h2>
      <div className="rounded-lg border border-border overflow-hidden card-glow">
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-2 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground w-8">#</th>
                <th className="text-left px-2 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground min-w-[100px]">Gracz</th>
                <th className="text-center px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">M</th>
                <th className="text-center px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">W</th>
                <th className="text-center px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">R</th>
                <th className="text-center px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">P</th>
                <th className="text-center px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">Pkt</th>
                <th className="text-center px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">Śr.</th>
                <th className="text-center px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">180</th>
                <th className="text-center px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground">HC</th>
                <th className="text-center px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground min-w-[90px]">Forma</th>
                <th className="text-left px-1.5 py-2 text-[10px] font-display uppercase tracking-wider text-muted-foreground min-w-[120px]">Osiągnięcia</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((entry, index) => {
                const achiev = getPlayerAchievements(entry.id, activeLeagueId);
                return (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-2 py-2"><RankIcon rank={index + 1} /></td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar avatarUrl={entry.avatar_url} initials={entry.avatar} size="sm" className="w-7 h-7 text-[9px]" />
                        <span className="font-body font-medium text-foreground text-xs whitespace-nowrap">{entry.name}</span>
                      </div>
                    </td>
                    <td className="text-center px-1.5 py-2 text-xs font-body text-muted-foreground">{entry.stats.matchesPlayed}</td>
                    <td className="text-center px-1.5 py-2 text-xs font-body text-secondary font-semibold">{entry.stats.wins}</td>
                    <td className="text-center px-1.5 py-2 text-xs font-body text-accent font-semibold">{entry.stats.draws}</td>
                    <td className="text-center px-1.5 py-2 text-xs font-body text-destructive font-semibold">{entry.stats.losses}</td>
                    <td className="text-center px-1.5 py-2">
                      <div className="flex flex-col items-center">
                        <span className="font-display font-bold text-foreground text-sm">{entry.stats.points}</span>
                        {entry.stats.bonusPoints > 0 && (
                          <span className="text-[8px] text-accent font-display leading-tight" title={`Bazowe: ${entry.stats.basePoints} + Bonus: ${entry.stats.bonusPoints}`}>
                            ({entry.stats.basePoints}+{entry.stats.bonusPoints})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-1.5 py-2 text-xs font-body text-muted-foreground">{entry.stats.avg.toFixed(1)}</td>
                    <td className="text-center px-1.5 py-2 text-xs font-body text-muted-foreground">{entry.stats.oneEighties}</td>
                    <td className="text-center px-1.5 py-2 text-xs font-body text-muted-foreground">{entry.stats.highestCheckout}</td>
                    <td className="text-center px-1.5 py-2">
                      <div className="flex gap-0.5 justify-center">
                        {entry.stats.form.map((f, i) => <FormBadge key={i} result={f} />)}
                      </div>
                    </td>
                    <td className="px-1.5 py-2">
                      <div className="flex gap-0.5 flex-wrap">
                        {achiev.slice(0, 3).map((a) => (
                          <span key={a.id} className="text-[10px] bg-muted/50 border border-border rounded-full px-1.5 py-0.5 whitespace-nowrap" title={a.description}>
                            {a.icon}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bonus points legend */}
      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
        <h3 className="text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-2">System punktowy</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[10px] font-body text-muted-foreground">
          {rules.win > 0 && <span>🏆 Wygrana: <strong className="text-foreground">+{rules.win}</strong></span>}
          {rules.draw > 0 && <span>🤝 Remis: <strong className="text-foreground">+{rules.draw}</strong></span>}
          {rules.per180 > 0 && <span>🎯 180: <strong className="text-foreground">+{rules.per180}</strong></span>}
          
          {rules.checkout100 > 0 && <span>✅ CO 100+: <strong className="text-foreground">+{rules.checkout100}</strong></span>}
          {rules.checkout150 > 0 && <span>💫 CO 150+: <strong className="text-foreground">+{rules.checkout100 + rules.checkout150}</strong></span>}
          {rules.avg90 > 0 && <span>📊 Śr. 90+: <strong className="text-foreground">+{rules.avg90}</strong></span>}
          {rules.avg100 > 0 && <span>📈 Śr. 100+: <strong className="text-foreground">+{rules.avg90 + rules.avg100}</strong></span>}
          {rules.closeLoss > 0 && <span>🥈 Bliska przegrana: <strong className="text-foreground">+{rules.closeLoss}</strong></span>}
          {rules.cleanSweep > 0 && <span>💪 Clean sweep: <strong className="text-foreground">+{rules.cleanSweep}</strong></span>}
        </div>
      </div>
    </section>
  );
};

export default LeagueTable;
