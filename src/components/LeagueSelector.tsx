import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

const LeagueSelector = () => {
  const { leagues, activeLeagueId, setActiveLeagueId } = useLeague();

  return (
    <div className="flex flex-wrap gap-2">
      {leagues.map((league) => (
        <Button
          key={league.id}
          variant={activeLeagueId === league.id ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveLeagueId(league.id)}
          className="font-display uppercase tracking-wider text-xs"
        >
          {!league.isActive && <span className="opacity-50 mr-1">📁</span>}
          {league.isActive && <Trophy className="h-3.5 w-3.5 mr-1" />}
          {league.name}
        </Button>
      ))}
    </div>
  );
};

export default LeagueSelector;
