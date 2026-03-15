import { useState } from "react";
import { useLeague } from "@/contexts/LeagueContext";
import { Link } from "react-router-dom";
import PlayerAvatar from "@/components/PlayerAvatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { pl } from "@/lib/pluralize";

const PlayersPage = () => {
  const { players, leagues, activeLeagueId, getPlayerLeagueStats, getPlayerAchievements, matches } = useLeague();
  const [search, setSearch] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");

  const approved = players.filter((p) => p.approved);

  const filtered = approved.filter((p) => {
    const s = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(s)
      || (p.autodarts_user_id && p.autodarts_user_id.toLowerCase().includes(s))
      || (p.dartcounter_id && p.dartcounter_id.toLowerCase().includes(s))
      || (p.dartsmind_id && p.dartsmind_id.toLowerCase().includes(s));
    if (selectedLeague === "all") return matchesSearch;
    const inLeague = matches.some(
      (m) => m.leagueId === selectedLeague && (m.player1Id === p.id || m.player2Id === p.id)
    );
    return matchesSearch && inLeague;
  });

  const leagueForStats = selectedLeague === "all" ? activeLeagueId : selectedLeague;

  const withStats = filtered.map((p) => ({
    ...p,
    stats: getPlayerLeagueStats(p.id, leagueForStats),
    achievements: getPlayerAchievements(p.id, leagueForStats),
  })).sort((a, b) => b.stats.points - a.stats.points);

  return (
    <div>
      <PageHeader title="Gracze" subtitle={`${pl.participant(approved.length)} na platformie`} />
      <div className="container mx-auto px-4 py-12 space-y-8">
      {/* Filters */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl blur-xl opacity-50" />
        <div className="relative flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj po nazwie lub nicku z platformy..."
              className="pl-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
          <Select value={selectedLeague} onValueChange={setSelectedLeague}>
            <SelectTrigger className="w-full sm:w-56 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors">
              <SelectValue placeholder="Wszystkie ligi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie ligi</SelectItem>
              {leagues.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {withStats.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
            <Search className="h-12 w-12 relative text-muted-foreground/40" />
          </div>
          <p className="text-lg font-body text-muted-foreground">Nie znaleziono graczy</p>
          <p className="text-sm font-body text-muted-foreground/60 mt-1">Zmień filtry lub wyszukaj inną frazę</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {withStats.map((player, idx) => (
            <Link to={`/players/${player.id}`} key={player.id}>
              <div className="group relative rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-card/80 overflow-hidden shadow-md hover:shadow-xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
                {/* Background gradient effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-accent/5" />
                
                <div className="relative p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <PlayerAvatar 
                        avatarUrl={player.avatar_url} 
                        initials={player.avatar} 
                        size="sm" 
                        className="w-12 h-12 text-sm ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-200" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-body font-semibold text-foreground group-hover:text-primary transition-colors duration-200">{player.name}</div>
                        <div className="text-xs text-muted-foreground font-body">
                          {player.stats.matchesPlayed > 0 ? `#${idx + 1} ranking` : "Brak meczów"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <StatBlock label="Pkt" value={player.stats.points.toString()} />
                    <StatBlock label="Śr." value={player.stats.avg > 0 ? player.stats.avg.toFixed(1) : "—"} />
                    <StatBlock label="180" value={player.stats.oneEighties.toString()} />
                  </div>

                  {/* Record & Form */}
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-body text-muted-foreground">{player.stats.wins}W {player.stats.losses}P</span>
                      <span className="font-display font-bold text-foreground">{player.stats.matchesPlayed > 0 ? ((player.stats.wins / player.stats.matchesPlayed) * 100).toFixed(0) : '0'}%</span>
                    </div>
                    <div className="flex gap-1">
                      {player.stats.form.slice(-5).map((f, i) => (
                        <div key={i} className={`flex-1 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold transition-all duration-200 group-hover:scale-105 ${
                          f === "W" ? "bg-secondary/30 text-secondary border border-secondary/50" : "bg-destructive/30 text-destructive border border-destructive/50"
                        }`}>{f}</div>
                      ))}
                    </div>
                  </div>

                  {/* Achievements */}
                  {player.achievements.length > 0 && (
                    <div className="pt-2 border-t border-border/30">
                      <div className="flex gap-1.5 flex-wrap">
                        {player.achievements.slice(0, 3).map((a) => (
                          <span key={a.id} className="text-[10px] bg-muted/50 border border-border/50 rounded-full px-2.5 py-1 font-body hover:bg-muted transition-colors duration-200">{a.icon} {a.name}</span>
                        ))}
                        {player.achievements.length > 3 && (
                          <span className="text-[10px] text-muted-foreground/70 px-1 py-1 font-body">+{player.achievements.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
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
