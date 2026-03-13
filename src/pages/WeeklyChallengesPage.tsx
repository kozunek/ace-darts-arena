import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Clock, Star, Flame, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PlayerAvatar from "@/components/PlayerAvatar";
import PageHeader from "@/components/PageHeader";
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
      <div className="container mx-auto px-4 py-8 space-y-8">

        {/* Timer */}
        {activeChallenges.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-body">
            <Clock className="h-4 w-4" />
            <span>Do końca wyzwania: <strong className="text-accent">{daysLeft()} dni</strong></span>
            <span className="text-xs">({new Date(activeChallenges[0].week_start).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })} – {new Date(activeChallenges[0].week_end).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })})</span>
          </div>
        )}

        {/* Active Challenges */}
        {activeChallenges.length === 0 && (
          <div className="text-center py-12 text-muted-foreground font-body">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Brak aktywnych wyzwań. Nowe pojawią się w poniedziałek!</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeChallenges.map(ch => {
            const chEntries = entries[ch.id] || [];
            return (
              <div key={ch.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Challenge header */}
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{ch.icon}</span>
                    <div>
                      <h3 className="font-display font-bold text-foreground text-lg">{ch.title}</h3>
                      <p className="text-xs text-muted-foreground font-body">{ch.description}</p>
                    </div>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="p-4">
                  {chEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-body text-center py-6">Brak wyników — zagraj mecz aby pojawić się w rankingu!</p>
                  ) : (
                    <div className="space-y-2">
                      {chEntries.slice(0, 10).map((entry, idx) => (
                        <div
                          key={entry.id}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                            idx < 3 ? RANK_BG[idx] + " border" : "hover:bg-muted/50"
                          }`}
                        >
                          <span className={`font-display font-bold w-6 text-center text-sm ${idx < 3 ? RANK_COLORS[idx] : "text-muted-foreground"}`}>
                            {idx + 1}
                          </span>
                          <PlayerAvatar avatarUrl={entry.player_avatar_url} initials={entry.player_avatar || "?"} size="sm" className="w-8 h-8 text-[10px]" />
                          <Link to={`/players/${entry.player_id}`} className="flex-1 font-body font-medium text-sm text-foreground hover:text-primary transition-colors truncate">
                            {entry.player_name}
                          </Link>
                          <span className="text-xs text-muted-foreground font-body">{entry.match_count} mecz.</span>
                          <span className="font-display font-bold text-foreground text-sm min-w-[3rem] text-right">
                            {formatScore(ch.challenge_type, entry.score)}
                          </span>
                        </div>
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
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" /> Historia nagród
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Group by challenge */}
              {(() => {
                const grouped = new Map<string, Reward[]>();
                for (const r of pastRewards) {
                  const key = r.challenge_id;
                  if (!grouped.has(key)) grouped.set(key, []);
                  grouped.get(key)!.push(r);
                }
                return Array.from(grouped.entries()).map(([chId, rewards]) => {
                  const first = rewards[0];
                  return (
                    <div key={chId} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{first.challenge_icon}</span>
                        <div>
                          <div className="font-display font-bold text-sm text-foreground">{first.challenge_title}</div>
                          {first.week_start && (
                            <div className="text-[10px] text-muted-foreground font-body">
                              Tydzień {new Date(first.week_start).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {rewards.sort((a, b) => a.rank - b.rank).map(r => (
                          <div key={r.id} className="flex items-center gap-2 text-xs">
                            <span className={`font-bold ${r.rank <= 3 ? RANK_COLORS[r.rank - 1] : "text-muted-foreground"}`}>
                              {r.reward_value}
                            </span>
                            <span className="font-body text-foreground">{(r as any).player_name}</span>
                          </div>
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
