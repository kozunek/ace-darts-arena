import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Radio, ExternalLink, Users, Clock, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface LiveMatch {
  id: string;
  match_id: string | null;
  autodarts_match_id: string;
  autodarts_link: string;
  player1_score: number;
  player2_score: number;
  started_at: string;
  updated_at: string | null;
  player1_name?: string;
  player2_name?: string;
  league_name?: string;
  player1_avatar_url?: string | null;
  player2_avatar_url?: string | null;
}

const LiveMatchesPage = () => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLive = async () => {
    const { data } = await supabase.from("live_matches").select("*");
    if (!data || data.length === 0) {
      setLiveMatches([]);
      setLoading(false);
      return;
    }

    const matchIds = data.filter((lm) => lm.match_id).map((lm) => lm.match_id!);
    let matchPlayers: Record<string, { p1: string; p2: string; p1_avatar: string | null; p2_avatar: string | null; league_name: string }> = {};

    if (matchIds.length > 0) {
      const { data: matchData } = await supabase
        .from("matches")
        .select("id, player1_id, player2_id, league_id")
        .in("id", matchIds);

      if (matchData) {
        const playerIds = [...new Set(matchData.flatMap((m) => [m.player1_id, m.player2_id]))];
        const leagueIds = [...new Set(matchData.map((m) => m.league_id))];

        const [playersRes, leaguesRes] = await Promise.all([
          supabase.from("players").select("id, name, avatar_url").in("id", playerIds),
          supabase.from("leagues").select("id, name").in("id", leagueIds),
        ]);

        const nameMap: Record<string, { name: string; avatar_url: string | null }> = {};
        (playersRes.data || []).forEach((p) => (nameMap[p.id] = { name: p.name, avatar_url: p.avatar_url }));

        const leagueMap: Record<string, string> = {};
        (leaguesRes.data || []).forEach((l) => (leagueMap[l.id] = l.name));

        matchData.forEach((m) => {
          matchPlayers[m.id] = {
            p1: nameMap[m.player1_id]?.name || "Gracz 1",
            p2: nameMap[m.player2_id]?.name || "Gracz 2",
            p1_avatar: nameMap[m.player1_id]?.avatar_url || null,
            p2_avatar: nameMap[m.player2_id]?.avatar_url || null,
            league_name: leagueMap[m.league_id] || "Liga",
          };
        });
      }
    }

    setLiveMatches(
      data.map((lm) => ({
        ...lm,
        player1_score: lm.player1_score ?? 0,
        player2_score: lm.player2_score ?? 0,
        started_at: lm.started_at ?? new Date().toISOString(),
        player1_name: lm.match_id ? matchPlayers[lm.match_id]?.p1 : undefined,
        player2_name: lm.match_id ? matchPlayers[lm.match_id]?.p2 : undefined,
        player1_avatar_url: lm.match_id ? matchPlayers[lm.match_id]?.p1_avatar : null,
        player2_avatar_url: lm.match_id ? matchPlayers[lm.match_id]?.p2_avatar : null,
        league_name: lm.match_id ? matchPlayers[lm.match_id]?.league_name : undefined,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchLive();

    const channel = supabase
      .channel("live-matches-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_matches" }, () => fetchLive())
      .subscribe();

    // Auto-refresh every 10s for time displays
    const interval = setInterval(fetchLive, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Radio className="h-7 w-7 text-destructive" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-wider uppercase">
            Mecze na żywo
          </h1>
          <span className="text-xs font-display uppercase text-destructive border border-destructive/30 rounded-full px-3 py-1 animate-pulse">
            LIVE
          </span>
          {liveMatches.length > 0 && (
            <span className="ml-auto text-sm text-muted-foreground font-body">
              {liveMatches.length} {liveMatches.length === 1 ? "mecz" : liveMatches.length < 5 ? "mecze" : "meczy"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        ) : liveMatches.length === 0 ? (
          <div className="text-center py-20">
            <Radio className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-display text-muted-foreground mb-2">
              Brak meczów na żywo
            </h2>
            <p className="text-sm text-muted-foreground/70 font-body max-w-md mx-auto">
              Gdy ktoś rozpocznie mecz ligowy na Autodarts z zainstalowaną wtyczką eDART,
              pojawi się tutaj na żywo z wynikiem w czasie rzeczywistym.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {liveMatches.map((lm) => (
                <motion.div
                  key={lm.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-xl border border-destructive/30 bg-gradient-to-br from-card to-destructive/5 overflow-hidden card-glow"
                >
                  {/* Match header */}
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Radio className="h-3.5 w-3.5 text-destructive" />
                      </motion.div>
                      <span className="text-xs font-display uppercase text-destructive tracking-wider">
                        LIVE
                      </span>
                    </div>
                    {lm.league_name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                        <Trophy className="h-3 w-3 text-accent" />
                        {lm.league_name}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(lm.started_at), { locale: pl, addSuffix: false })}
                    </div>
                  </div>

                  {/* Scoreboard */}
                  <div className="px-5 py-6">
                    <div className="flex items-center justify-between">
                      {/* Player 1 */}
                      <div className="flex-1 text-center">
                        {lm.player1_avatar_url ? (
                          <img
                            src={lm.player1_avatar_url}
                            alt={lm.player1_name}
                            className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-border object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full mx-auto mb-2 bg-muted flex items-center justify-center border-2 border-border">
                            <Users className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-display font-semibold text-foreground text-sm block">
                          {lm.player1_name || "Gracz 1"}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="flex items-center gap-4 px-6">
                        <motion.span
                          key={`${lm.id}-s1-${lm.player1_score}`}
                          initial={{ scale: 1.4, color: "hsl(var(--accent))" }}
                          animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                          transition={{ duration: 0.5 }}
                          className="text-5xl font-display font-bold"
                        >
                          {lm.player1_score}
                        </motion.span>
                        <span className="text-2xl text-muted-foreground font-display">:</span>
                        <motion.span
                          key={`${lm.id}-s2-${lm.player2_score}`}
                          initial={{ scale: 1.4, color: "hsl(var(--accent))" }}
                          animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                          transition={{ duration: 0.5 }}
                          className="text-5xl font-display font-bold"
                        >
                          {lm.player2_score}
                        </motion.span>
                      </div>

                      {/* Player 2 */}
                      <div className="flex-1 text-center">
                        {lm.player2_avatar_url ? (
                          <img
                            src={lm.player2_avatar_url}
                            alt={lm.player2_name}
                            className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-border object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full mx-auto mb-2 bg-muted flex items-center justify-center border-2 border-border">
                            <Users className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-display font-semibold text-foreground text-sm block">
                          {lm.player2_name || "Gracz 2"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-5 pb-4 flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 font-display uppercase tracking-wider text-xs"
                      asChild
                    >
                      <a href={lm.autodarts_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Oglądaj na Autodarts
                      </a>
                    </Button>
                  </div>

                  {/* Autodarts embed iframe */}
                  <div className="border-t border-border">
                    <iframe
                      src={lm.autodarts_link}
                      className="w-full h-[500px] bg-background"
                      title={`Live: ${lm.player1_name || "P1"} vs ${lm.player2_name || "P2"}`}
                      allow="fullscreen"
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMatchesPage;
