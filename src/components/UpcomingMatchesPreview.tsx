import { useLeague } from "@/contexts/LeagueContext";
import { Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const UpcomingMatchesPreview = () => {
  const { activeLeagueId, getLeagueMatches } = useLeague();
  const upcoming = getLeagueMatches(activeLeagueId).filter((m) => m.status === "upcoming").slice(0, 4);

  if (upcoming.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Nadchodzące Mecze</h2>
        <Link to="/matches">
          <Button variant="ghost" size="sm" className="font-display uppercase tracking-wider text-xs">
            Wszystkie <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {upcoming.map((match) => (
          <div key={match.id} className="rounded-lg border border-border bg-card p-5 card-glow transition-all hover:border-primary/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-body">{new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
              {match.round && <span className="ml-auto text-[10px] font-display uppercase text-muted-foreground">Kolejka {match.round}</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body font-medium text-foreground text-sm">{match.player1Name}</span>
              <span className="text-xs font-display text-muted-foreground px-3">VS</span>
              <span className="font-body font-medium text-foreground text-sm text-right">{match.player2Name}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default UpcomingMatchesPreview;
