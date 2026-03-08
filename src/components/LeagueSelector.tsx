import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Trophy, Archive, Play } from "lucide-react";

const LeagueSelector = () => {
  const { leagues, activeLeagueId, setActiveLeagueId } = useLeague();

  const active = leagues.filter(l => l.is_active && !l.registration_open);
  const registrationOpen = leagues.filter(l => l.registration_open);
  const closed = leagues.filter(l => !l.is_active);

  const sections: { label: string; icon: React.ReactNode; items: typeof leagues }[] = [
    { label: "W trakcie", icon: <Play className="h-3.5 w-3.5 text-secondary" />, items: active },
    { label: "Zapisy", icon: <Trophy className="h-3.5 w-3.5 text-primary" />, items: registrationOpen },
    { label: "Zakończone", icon: <Archive className="h-3.5 w-3.5 text-muted-foreground" />, items: closed },
  ].filter(s => s.items.length > 0);

  if (leagues.length === 0) return null;

  return (
    <div className="space-y-3">
      {sections.map(section => (
        <div key={section.label} className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-display uppercase tracking-[0.2em] text-muted-foreground">
            {section.icon}
            {section.label}
          </div>
          <div className="flex flex-wrap gap-2">
            {section.items.map((league) => (
              <Button
                key={league.id}
                variant={activeLeagueId === league.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveLeagueId(league.id)}
                className="font-display uppercase tracking-wider text-xs"
              >
                {league.name}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LeagueSelector;
