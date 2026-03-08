import { useLeague } from "@/contexts/LeagueContext";
import { Trophy, Medal, Award } from "lucide-react";
import { DEFAULT_BONUS_RULES } from "@/data/mockData";

const FormBadge = ({ result }: { result: "W" | "L" | "D" }) => {
  const styles = {
    W: "bg-secondary/20 text-secondary border-secondary/30",
    L: "bg-destructive/20 text-destructive border-destructive/30",
    D: "bg-accent/20 text-accent border-accent/30",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold border ${styles[result]}`}>
      {result}
    </span>
  );
};

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-accent" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
  if (rank === 3) return <Award className="h-5 w-5 text-primary/70" />;
  return <span className="text-sm text-muted-foreground font-display w-5 text-center">{rank}</span>;
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Gracz</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">M</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">W</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">R</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">P</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Pkt</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden md:table-cell">Śr.</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden md:table-cell">180</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden lg:table-cell">HC</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden md:table-cell">Forma</th>
                <th className="text-left px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Osiągnięcia</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((entry, index) => {
                const achiev = getPlayerAchievements(entry.id, activeLeagueId);
                return (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><RankIcon rank={index + 1} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary">
                          {entry.avatar}
                        </div>
                        <span className="font-body font-medium text-foreground text-sm">{entry.name}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 text-sm font-body text-muted-foreground">{entry.stats.matchesPlayed}</td>
                    <td className="text-center px-3 py-3 text-sm font-body text-secondary font-semibold">{entry.stats.wins}</td>
                    <td className="text-center px-3 py-3 text-sm font-body text-accent font-semibold">{entry.stats.draws}</td>
                    <td className="text-center px-3 py-3 text-sm font-body text-destructive font-semibold">{entry.stats.losses}</td>
                    <td className="text-center px-3 py-3">
                      <div className="flex flex-col items-center">
                        <span className="font-display font-bold text-foreground text-lg">{entry.stats.points}</span>
                        {entry.stats.bonusPoints > 0 && (
                          <span className="text-[10px] text-accent font-display" title={`Bazowe: ${entry.stats.basePoints} + Bonus: ${entry.stats.bonusPoints}`}>
                            ({entry.stats.basePoints}+{entry.stats.bonusPoints})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 text-sm font-body text-muted-foreground hidden md:table-cell">{entry.stats.avg.toFixed(1)}</td>
                    <td className="text-center px-3 py-3 text-sm font-body text-muted-foreground hidden md:table-cell">{entry.stats.oneEighties}</td>
                    <td className="text-center px-3 py-3 text-sm font-body text-muted-foreground hidden lg:table-cell">{entry.stats.highestCheckout}</td>
                    <td className="text-center px-3 py-3 hidden md:table-cell">
                      <div className="flex gap-1 justify-center">
                        {entry.stats.form.map((f, i) => <FormBadge key={i} result={f} />)}
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {achiev.slice(0, 3).map((a) => (
                          <span key={a.id} className="text-xs bg-muted/50 border border-border rounded-full px-2 py-0.5" title={a.description}>
                            {a.icon} {a.name}
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

      {/* Bonus points legend - only show active rules */}
      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
        <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">System punktowy</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-body text-muted-foreground">
          {rules.win > 0 && <span>🏆 Wygrana: <strong className="text-foreground">+{rules.win} pkt</strong></span>}
          {rules.draw > 0 && <span>🤝 Remis: <strong className="text-foreground">+{rules.draw} pkt</strong></span>}
          {rules.per180 > 0 && <span>🎯 Za każde 180: <strong className="text-foreground">+{rules.per180} pkt</strong></span>}
          {rules.nineDarter > 0 && <span>💎 9-darter: <strong className="text-foreground">+{rules.nineDarter} pkt</strong></span>}
          {rules.checkout100 > 0 && <span>✅ Checkout 100+: <strong className="text-foreground">+{rules.checkout100} pkt</strong></span>}
          {rules.checkout150 > 0 && <span>💫 Checkout 150+: <strong className="text-foreground">+{rules.checkout100 + rules.checkout150} pkt</strong></span>}
          {rules.avg90 > 0 && <span>📊 Średnia 90+: <strong className="text-foreground">+{rules.avg90} pkt</strong></span>}
          {rules.avg100 > 0 && <span>📈 Średnia 100+: <strong className="text-foreground">+{rules.avg90 + rules.avg100} pkt</strong></span>}
          {rules.closeLoss > 0 && <span>🥈 Bliska przegrana (1 leg): <strong className="text-foreground">+{rules.closeLoss} pkt</strong></span>}
          {rules.cleanSweep > 0 && <span>💪 Clean sweep (0 dla rywala): <strong className="text-foreground">+{rules.cleanSweep} pkt</strong></span>}
        </div>
      </div>
    </section>
  );
};

export default LeagueTable;
