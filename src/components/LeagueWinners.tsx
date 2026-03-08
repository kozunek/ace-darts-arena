import { useLeague } from "@/contexts/LeagueContext";
import { Trophy, Crown, Medal } from "lucide-react";
import { motion } from "framer-motion";
import PlayerAvatar from "@/components/PlayerAvatar";

const LeagueWinners = () => {
  const { leagues, getLeagueStandings, matches } = useLeague();

  // Only show closed/inactive leagues that have completed matches
  const closedLeagues = leagues.filter(l => {
    if (l.is_active) return false;
    const leagueMatches = matches.filter(m => m.leagueId === l.id && m.status === "completed");
    return leagueMatches.length > 0;
  });

  if (closedLeagues.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary" /> Zwycięzcy
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {closedLeagues.map(league => {
          const standings = getLeagueStandings(league.id);
          if (standings.length === 0) return null;

          const top3 = standings.slice(0, 3);
          const isLeague = league.league_type === "league";
          const isBracket = league.league_type === "bracket";

          return (
            <motion.div
              key={league.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-primary/20 bg-card p-5 card-glow"
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-display font-bold text-foreground text-sm">{league.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">
                    {league.season} · {isBracket ? "Turniej" : isLeague ? "Liga" : "Grupy + Drabinka"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {top3.map((player, idx) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const colors = ["text-primary", "text-muted-foreground", "text-muted-foreground/70"];
                  return (
                    <div key={player.id} className="flex items-center gap-3">
                      <span className="text-lg">{medals[idx]}</span>
                      <PlayerAvatar avatarUrl={player.avatar_url} initials={player.avatar} size="sm" className="w-8 h-8 text-[10px]" />
                      <div className="flex-1">
                        <span className={`font-body font-medium text-sm ${colors[idx]}`}>{player.name}</span>
                      </div>
                      <span className="text-xs font-display text-muted-foreground">
                        {player.stats.points} pkt
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default LeagueWinners;
