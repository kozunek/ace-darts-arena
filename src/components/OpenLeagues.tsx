import { useState, useEffect } from "react";
import { useLeague } from "@/contexts/LeagueContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, Users, UserPlus, Check, LogIn, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const LEAGUE_TYPE_LABELS: Record<string, string> = {
  league: "Liga",
  bracket: "Turniej",
  group_bracket: "Grupy + Drabinka",
};

const OpenLeagues = () => {
  const { leagues, players, joinLeague, leaveLeague, refreshData } = useLeague();
  const { user } = useAuth();
  const { toast } = useToast();
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setMyPlayerId(null); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setMyPlayerId(data?.id ?? null);
    };
    fetch();
  }, [user]);

  const openLeagues = leagues.filter((l) => l.registration_open);

  if (openLeagues.length === 0) return null;

  const isJoined = (leagueId: string) => {
    if (!myPlayerId) return false;
    const player = players.find((p) => p.id === myPlayerId);
    return player?.leagueIds?.includes(leagueId) ?? false;
  };

  const registeredCount = (leagueId: string) =>
    players.filter((p) => p.leagueIds?.includes(leagueId)).length;

  const handleJoin = async (leagueId: string) => {
    setJoining(leagueId);
    const { error } = await joinLeague(leagueId);
    if (error) {
      toast({ title: "Błąd", description: error, variant: "destructive" });
    } else {
      toast({ title: "✅ Zapisano!", description: "Zostałeś zapisany do ligi." });
      refreshData();
    }
    setJoining(null);
  };

  const handleLeave = async (leagueId: string) => {
    await leaveLeague(leagueId);
    toast({ title: "Wypisano", description: "Opuściłeś ligę." });
    refreshData();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        Otwarte zapisy
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {openLeagues.map((league) => {
            const joined = isJoined(league.id);
            const count = registeredCount(league.id);
            return (
              <motion.div
                key={league.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-5 transition-all ${
                  joined
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-bold text-foreground text-lg">{league.name}</h3>
                    <p className="text-xs text-muted-foreground font-body">{league.season}</p>
                  </div>
                  <span className="text-xs font-display uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {LEAGUE_TYPE_LABELS[league.league_type] || league.league_type}
                  </span>
                </div>
                {league.description && (
                  <p className="text-sm text-muted-foreground font-body mb-3">{league.description}</p>
                )}
                <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5" /> {league.format || "Best of 5"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {count} zapisanych
                  </span>
                  {league.registration_deadline && (
                    <span className="flex items-center gap-1 text-accent">
                      <Calendar className="h-3.5 w-3.5" /> Zapisy do {new Date(league.registration_deadline).toLocaleDateString("pl-PL")}
                    </span>
                  )}
                </div>
                {!user ? (
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="w-full">
                      <LogIn className="h-4 w-4 mr-1" /> Zaloguj się aby się zapisać
                    </Button>
                  </Link>
                ) : joined ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-primary border-primary/30" disabled>
                      <Check className="h-4 w-4 mr-1" /> Zapisany
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleLeave(league.id)} className="text-muted-foreground hover:text-destructive">
                      Wypisz się
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="hero"
                    size="sm"
                    className="w-full"
                    onClick={() => handleJoin(league.id)}
                    disabled={joining === league.id}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    {joining === league.id ? "Zapisywanie..." : "Zapisz się"}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OpenLeagues;
