import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Clock, Star, Flame, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PlayerAvatar from "@/components/PlayerAvatar";
import PageHeader from "@/components/PageHeader";
import { pl } from "@/lib/pluralize";
import { Link } from "react-router-dom";

interface Challenge {
  id: string;
  challenge_type: string;
  title: string;
  description: string;
  icon: string;
  week_start: string;
  week_end: string;
  is_active: boolean;
}

interface ChallengeEntry {
  id: string;
  challenge_id: string;
  player_id: string;
  score: number;
  match_count: number;
  player_name?: string;
  player_avatar?: string;
  player_avatar_url?: string | null;
}

interface Reward {
  id: string;
  challenge_id: string;
  player_id: string;
  rank: number;
  reward_value: string;
  challenge_title?: string;
  challenge_icon?: string;
  week_start?: string;
}

const RANK_COLORS = ["text-yellow-400", "text-slate-300", "text-amber-600"];
const RANK_BG = ["bg-yellow-500/10 border-yellow-500/30", "bg-slate-400/10 border-slate-400/30", "bg-amber-600/10 border-amber-600/30"];

const WeeklyChallengesPage = () => {
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [entries, setEntries] = useState<Record<string, ChallengeEntry[]>>({});
  const [pastRewards, setPastRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Realtime leaderboard updates
    const channel = supabase
      .channel("challenge-entries-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_challenge_entries" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    // Active challenges
    const { data: challenges } = await supabase
      .from("weekly_challenges")
      .select("*")
      .eq("is_active", true)
      .order("week_start", { ascending: false });

    setActiveChallenges((challenges as Challenge[]) || []);

    // Entries for active challenges
    if (challenges && challenges.length > 0) {
      const ids = challenges.map((c: any) => c.id);
      const { data: allEntries } = await supabase
        .from("weekly_challenge_entries")
        .select("*")
        .in("challenge_id", ids)
        .order("score", { ascending: false });

      // Get player info
      const playerIds = [...new Set((allEntries || []).map((e: any) => e.player_id))];
      const { data: players } = await supabase
        .from("players_public" as any)
        .select("id, name, avatar, avatar_url")
        .in("id", playerIds);

      const playerMap = new Map((players || []).map((p: any) => [p.id, p]));

      const grouped: Record<string, ChallengeEntry[]> = {};
      for (const e of (allEntries || []) as any[]) {
        const p = playerMap.get(e.player_id);
        const entry: ChallengeEntry = {
          ...e,
          player_name: p?.name || "?",
          player_avatar: p?.avatar || "?",
          player_avatar_url: p?.avatar_url || null,
        };
        if (!grouped[e.challenge_id]) grouped[e.challenge_id] = [];
        grouped[e.challenge_id].push(entry);
      }
      setEntries(grouped);
    }

    // Past rewards (last 4 weeks)
    const { data: rewards } = await supabase
      .from("weekly_challenge_rewards")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (rewards && rewards.length > 0) {
      const challengeIds = [...new Set(rewards.map((r: any) => r.challenge_id))];
      const { data: pastChallenges } = await supabase
        .from("weekly_challenges")
        .select("id, title, icon, week_start")
        .in("id", challengeIds);

      const chMap = new Map((pastChallenges || []).map((c: any) => [c.id, c]));
      
      const playerIds = [...new Set(rewards.map((r: any) => r.player_id))];
      const { data: players } = await supabase
        .from("players_public" as any)
        .select("id, name, avatar, avatar_url")
        .in("id", playerIds);
      
      const playerMap = new Map((players || []).map((p: any) => [p.id, p]));

      setPastRewards(rewards.map((r: any) => {
        const ch = chMap.get(r.challenge_id);
        const p = playerMap.get(r.player_id);
        return {
          ...r,
          challenge_title: ch?.title || "?",
          challenge_icon: ch?.icon || "🏆",
          week_start: ch?.week_start,
          player_name: p?.name || "?",
          player_avatar: p?.avatar || "?",
          player_avatar_url: p?.avatar_url || null,
        };
      }));
    }

    setLoading(false);
  };

  const daysLeft = () => {
    if (activeChallenges.length === 0) return 0;
    const end = new Date(activeChallenges[0].week_end + "T23:59:59Z");
    const now = new Date();
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
  };

  const formatScore = (type: string, score: number) => {
    if (type === "highest_avg") return score.toFixed(1);
    return String(Math.round(score));
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Wyzwania" subtitle="Tygodniowe wyzwania z nagrodami" />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => <div key={i} className="h-48 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Wyzwania tygodniowe" subtitle="Rywalizuj, zdobywaj nagrody i wspinaj się na szczyt!" />
      <div className="container mx-auto px-4 py-12 space-y-12">

        {/* Timer Section */}
        {activeChallenges.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-xl opacity-60" />
            <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-xl px-6 py-8 shadow-lg">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-center">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-lg animate-pulse" />
                    <Clock className="h-8 w-8 text-primary relative animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Czas do końca</p>
                    <p className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{daysLeft()}</p>
                    <p className="text-xs text-muted-foreground font-body">dni pozostało</p>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
                <div className="text-sm font-body text-muted-foreground">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1">Bieżący tydzień</p>
                  <p className="font-mono text-foreground">
                    {new Date(activeChallenges[0].week_start).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })} 
                    <span className="text-muted-foreground/60 mx-2">→</span>
                    {new Date(activeChallenges[0].week_end).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Challenges */}
        {activeChallenges.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
              <Trophy className="h-16 w-16 mx-auto relative text-muted-foreground/40" />
            </div>
            <p className="text-lg font-body text-muted-foreground">Brak aktywnych wyzwań</p>
            <p className="text-sm font-body text-muted-foreground/60 mt-1">Nowe wyzwania pojawią się w poniedziałek! Zarób nagrody i odznaki.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
          {activeChallenges.map(ch => {
            const chEntries = entries[ch.id] || [];
            return (
              <div key={ch.id} className="group rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-card/80 overflow-hidden shadow-md hover:shadow-2xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 h-fit">
                {/* Challenge header with animated background */}
                <div className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 px-6 py-8 border-b border-border/30">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 animate-pulse" />
                  </div>
                  <div className="relative flex items-start gap-4">
                    <div className="text-5xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                      {ch.icon}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="font-display font-bold text-foreground text-xl mb-1 group-hover:text-primary transition-colors duration-300">{ch.title}</h3>
                      <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-2">{ch.description}</p>
                    </div>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="p-6">
                  {chEntries.length === 0 ? (
                    <div className="text-center py-8">
                      <Flame className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground font-body">Brak wyników</p>
                      <p className="text-xs text-muted-foreground/60 font-body mt-1">Zagraj mecz aby pojawić się w rankingu!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chEntries.slice(0, 10).map((entry, idx) => (
                        <Link
                          to={`/players/${entry.player_id}`}
                          key={entry.id}
                          className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 group/item ${
                            idx < 3 
                              ? RANK_BG[idx] + " border border-" + (idx === 0 ? "yellow-500/40" : idx === 1 ? "slate-400/40" : "amber-600/40") + " shadow-sm group-hover:shadow-md" 
                              : "hover:bg-muted/60 border border-transparent"
                          }`}
                        >
                          {/* Rank Badge */}
                          <div className={`relative w-8 h-8 flex items-center justify-center rounded-full font-display font-bold text-sm ${
                            idx < 3 ? RANK_COLORS[idx] + " text-shadow" : "text-muted-foreground"
                          } ${idx < 3 ? "animate-pulse" : ""}`} style={{
                            textShadow: idx < 3 ? '0 0 8px rgba(255,255,255,0.3)' : 'none'
                          }}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </div>
                          
                          {/* Avatar */}
                          <PlayerAvatar 
                            avatarUrl={entry.player_avatar_url} 
                            initials={entry.player_avatar || "?"} 
                            size="sm" 
                            className="w-8 h-8 text-[10px] ring-2 ring-primary/20 group-hover/item:ring-primary/50 transition-all duration-200" 
                          />
                          
                          {/* Player Name */}
                          <div className="flex-1 min-w-0">
                            <p className="font-body font-medium text-sm text-foreground truncate group-hover/item:text-primary transition-colors duration-200">
                              {entry.player_name}
                            </p>
                          </div>
                          
                          {/* Match Count Badge */}
                          <Badge variant="secondary" className="text-xs font-body flex-shrink-0">
                            {pl.match(entry.match_count)}
                          </Badge>
                          
                          {/* Score */}
                          <div className="font-display font-bold text-foreground text-lg min-w-[4rem] text-right group-hover/item:text-primary transition-colors duration-200">
                            {formatScore(ch.challenge_type, entry.score)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Past Rewards / Hall of Fame */}
        {pastRewards.length > 0 && (
          <section>
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-accent/30 rounded-full blur-lg" />
                  <Star className="h-8 w-8 text-accent relative" />
                </div>
                Hall of Fame
              </h2>
              <p className="text-muted-foreground font-body">Zwycięzcy poprzednich tygodni i ich osiągnięcia</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Group by challenge */}
              {(() => {
                const grouped = new Map<string, Reward[]>();
                for (const r of pastRewards) {
                  const key = r.challenge_id;
                  if (!grouped.has(key)) grouped.set(key, []);
                  grouped.get(key)!.push(r);
                }
                return Array.from(grouped.entries()).slice(0, 12).map(([chId, rewards]) => {
                  const first = rewards[0];
                  return (
                    <div 
                      key={chId} 
                      className="group rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/80 p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/30">
                        <span className="text-3xl">{first.challenge_icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors duration-300">{first.challenge_title}</div>
                          {first.week_start && (
                            <div className="text-[11px] text-muted-foreground/70 font-body mt-0.5">
                              Tydz. {new Date(first.week_start).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        {rewards.sort((a, b) => a.rank - b.rank).map((r, idx) => (
                          <Link
                            to={`/players/${(r as any).player_id}`}
                            key={r.id} 
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200 group/reward"
                          >
                            <div className={`flex-shrink-0 font-display font-bold text-sm px-2.5 py-1 rounded-full ${
                              r.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                              r.rank === 2 ? "bg-slate-400/20 text-slate-300" :
                              r.rank === 3 ? "bg-amber-600/20 text-amber-500" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {r.reward_value.split(' ')[0]}
                            </div>
                            <span className="font-body text-sm text-foreground group-hover/reward:text-primary transition-colors duration-200 truncate flex-1">
                              {(r as any).player_name}
                            </span>
                            {idx < 3 && <Flame className="h-3.5 w-3.5 text-accent/60 flex-shrink-0" />}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default WeeklyChallengesPage;
