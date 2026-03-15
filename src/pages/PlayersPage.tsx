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
      <PageHeader title="Gracze" subtitle={`${pl.participant(approved.length)} ligi`} />
      <div className="container mx-auto px-4 py-8">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po nazwie lub nicku z platformy..."
            className="pl-9 bg-muted/30 border-border"
          />
        </div>
        <Select value={selectedLeague} onValueChange={setSelectedLeague}>
          <SelectTrigger className="w-full sm:w-56 bg-muted/30 border-border">
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

      {withStats.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground font-body">
          Nie znaleziono graczy
        </div>
      ) : (
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
                  <span className="font-body">{player.stats.wins}W {player.stats.losses}P</span>
                  <div className="flex gap-0.5">
                    {player.stats.form.slice(-5).map((f, i) => (
                      <span key={i} className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold ${
                        f === "W" ? "bg-secondary/20 text-secondary" : "bg-destructive/20 text-destructive"
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
