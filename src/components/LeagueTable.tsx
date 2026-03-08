import { Player } from "@/data/mockData";
import { Trophy, Medal, Award } from "lucide-react";

interface LeagueTableProps {
  players: Player[];
}

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

const LeagueTable = ({ players }: LeagueTableProps) => {
  const sorted = [...players].sort((a, b) => b.points - a.points);

  return (
    <section>
      <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
        Tabela Ligi
      </h2>

      <div className="rounded-lg border border-border overflow-hidden card-glow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Gracz</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">W</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">R</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">P</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Pkt</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden md:table-cell">Śr.</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden md:table-cell">180</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden lg:table-cell">HC</th>
                <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden md:table-cell">Forma</th>
                <th className="text-left px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Odznaki</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, index) => (
                <tr
                  key={player.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-4 py-3">
                    <RankIcon rank={index + 1} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary">
                        {player.avatar}
                      </div>
                      <span className="font-body font-medium text-foreground text-sm">{player.name}</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3 text-sm font-body text-secondary font-semibold">{player.wins}</td>
                  <td className="text-center px-3 py-3 text-sm font-body text-accent font-semibold">{player.draws}</td>
                  <td className="text-center px-3 py-3 text-sm font-body text-destructive font-semibold">{player.losses}</td>
                  <td className="text-center px-3 py-3">
                    <span className="font-display font-bold text-foreground text-lg">{player.points}</span>
                  </td>
                  <td className="text-center px-3 py-3 text-sm font-body text-muted-foreground hidden md:table-cell">{player.avg.toFixed(1)}</td>
                  <td className="text-center px-3 py-3 text-sm font-body text-muted-foreground hidden md:table-cell">{player.oneEighties}</td>
                  <td className="text-center px-3 py-3 text-sm font-body text-muted-foreground hidden lg:table-cell">{player.highestCheckout}</td>
                  <td className="text-center px-3 py-3 hidden md:table-cell">
                    <div className="flex gap-1 justify-center">
                      {player.form.map((f, i) => (
                        <FormBadge key={i} result={f} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {player.badges.map((badge, i) => (
                        <span key={i} className="text-xs bg-muted/50 border border-border rounded-full px-2 py-0.5">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default LeagueTable;
