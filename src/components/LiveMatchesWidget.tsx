import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Radio, ExternalLink, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface LiveMatch {
  id: string;
  match_id: string | null;
  autodarts_match_id: string;
  autodarts_link: string;
  player1_score: number;
  player2_score: number;
  started_at: string;
  player1_name?: string;
  player2_name?: string;
}

const LiveMatchesWidget = () => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);

  const fetchLive = async () => {
    const { data } = await supabase.from("live_matches").select("*");
    if (!data || data.length === 0) {
      setLiveMatches([]);
      return;
    }

    // Enrich with player names from linked matches
    const matchIds = data.filter((lm) => lm.match_id).map((lm) => lm.match_id!);
    let matchPlayers: Record<string, { p1: string; p2: string }> = {};

    if (matchIds.length > 0) {
      const { data: matchData } = await supabase
        .from("matches")
        .select("id, player1_id, player2_id")
        .in("id", matchIds);

      if (matchData) {
        const playerIds = [
          ...new Set(matchData.flatMap((m) => [m.player1_id, m.player2_id])),
        ];
        const { data: playersData } = await supabase
          .from("players_public" as any)
          .select("id, name")
          .in("id", playerIds);

        const nameMap: Record<string, string> = {};
        ((playersData || []) as any[]).forEach((p: any) => (nameMap[p.id] = p.name));

        matchData.forEach((m) => {
          matchPlayers[m.id] = {
            p1: nameMap[m.player1_id] || "Gracz 1",
            p2: nameMap[m.player2_id] || "Gracz 2",
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
      }))
    );
  };

  useEffect(() => {
    fetchLive();

    const channel = supabase
      .channel("live-matches-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_matches" },
        () => fetchLive()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (liveMatches.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Radio className="h-5 w-5 text-destructive" />
        </motion.div>
        <h2 className="text-xl font-display font-bold text-foreground">
          Mecze LIVE
        </h2>
        <span className="text-xs font-display uppercase text-destructive border border-destructive/30 rounded-full px-2 py-0.5 animate-pulse">
          Na żywo
        </span>
        <Link to="/live" className="ml-auto flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-display uppercase tracking-wider">
          Pokaż wszystkie <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {liveMatches.map((lm) => (
            <motion.div
              key={lm.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-lg border border-destructive/30 bg-gradient-to-br from-card to-destructive/5 p-5 card-glow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-display uppercase text-destructive flex items-center gap-1">
                  <Radio className="h-3 w-3" /> LIVE
                </span>
                <a
                  href={lm.autodarts_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" /> Oglądaj
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-body font-medium text-foreground text-sm flex-1">
                  {lm.player1_name || "Gracz 1"}
                </span>
                <div className="flex items-center gap-3 px-4">
                  <motion.span
                    key={`${lm.id}-s1-${lm.player1_score}`}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-display font-bold text-foreground"
                  >
                    {lm.player1_score}
                  </motion.span>
                  <span className="text-sm text-muted-foreground font-display">:</span>
                  <motion.span
                    key={`${lm.id}-s2-${lm.player2_score}`}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-display font-bold text-foreground"
                  >
                    {lm.player2_score}
                  </motion.span>
                </div>
                <span className="font-body font-medium text-foreground text-sm text-right flex-1">
                  {lm.player2_name || "Gracz 2"}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default LiveMatchesWidget;
