import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague } from "@/contexts/LeagueContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Swords, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PlayerAvatar from "@/components/PlayerAvatar";

const MyNextMatchWidget = () => {
  const { user } = useAuth();
  const { matches, players, leagues } = useLeague();
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("players")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setMyPlayerId(data?.id ?? null));
  }, [user]);

  if (!user || !myPlayerId) return null;

  const upcoming = matches
    .filter(
      (m) =>
        m.status === "upcoming" &&
        (m.player1Id === myPlayerId || m.player2Id === myPlayerId) &&
        m.player1Name !== "TBD" && m.player2Name !== "TBD"
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const next = upcoming[0];
  if (!next) return null;

  const isP1 = next.player1Id === myPlayerId;
  const opponentName = isP1 ? next.player2Name : next.player1Name;
  const opponentId = isP1 ? next.player2Id : next.player1Id;
  const opponent = players.find((p) => p.id === opponentId);
  const league = leagues.find((l) => l.id === next.leagueId);

  const dateStr = new Date(next.date).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const daysLeft = Math.ceil(
    (new Date(next.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <section className="rounded-lg border border-primary/30 bg-gradient-to-br from-card to-primary/5 p-4 sm:p-6 card-glow">
      <div className="flex items-center gap-2 mb-4">
        <Swords className="h-5 w-5 text-primary shrink-0" />
        <h2 className="text-base sm:text-lg font-display font-bold text-foreground">
          Twój najbliższy mecz
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PlayerAvatar
            avatarUrl={opponent?.avatar_url}
            initials={opponent?.avatar || opponentName.slice(0, 2).toUpperCase()}
            size="lg"
          />
          <div className="min-w-0">
            <div className="font-body font-semibold text-foreground text-base sm:text-lg truncate">
              vs {opponentName}
            </div>
            {league && (
              <div className="text-xs text-muted-foreground font-body truncate">
                {league.name} · {league.season}
              </div>
            )}
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="font-body">{dateStr}</span>
          </div>
          {next.confirmedDate ? (
            <span className="text-xs font-display uppercase text-secondary border border-secondary/30 rounded-full px-2 py-0.5">
              Potwierdzone
            </span>
          ) : daysLeft <= 3 ? (
            <span className="text-xs font-display uppercase text-destructive border border-destructive/30 rounded-full px-2 py-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {daysLeft <= 0 ? "Dziś!" : daysLeft === 1 ? "Za 1 dzień" : `Za ${daysLeft} dni`}
            </span>
          ) : (
            <span className="text-xs font-display uppercase text-accent border border-accent/30 rounded-full px-2 py-0.5">
              {daysLeft === 1 ? "Za 1 dzień" : `Za ${daysLeft} dni`}
            </span>
          )}
          {next.round && (
            <div className="text-[10px] font-display uppercase text-muted-foreground mt-1">
              Kolejka {next.round}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Link to="/my-matches" className="flex-1">
          <Button variant="default" size="sm" className="w-full font-display uppercase tracking-wider text-xs">
            Moje mecze
          </Button>
        </Link>
        {upcoming.length > 1 && (
          <div className="text-xs text-muted-foreground font-body self-center px-2">
            +{upcoming.length - 1} więcej
          </div>
        )}
      </div>
    </section>
  );
};

export default MyNextMatchWidget;
