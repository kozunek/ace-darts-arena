import { useLeague } from "@/contexts/LeagueContext";
import LeagueTable from "@/components/LeagueTable";
import HeroSection from "@/components/HeroSection";
import UpcomingMatchesPreview from "@/components/UpcomingMatchesPreview";
import LeagueSelector from "@/components/LeagueSelector";

const Index = () => {
  const { activeLeagueId, leagues } = useLeague();
  const league = leagues.find(l => l.id === activeLeagueId);

  return (
    <div className="min-h-screen">
      <HeroSection />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <LeagueSelector />
        {league && (
          <div className="text-sm text-muted-foreground font-body">
            <span className="text-foreground font-semibold">{league.name}</span> · {league.season} — {league.description}
          </div>
        )}
        <LeagueTable />
        <UpcomingMatchesPreview />
      </div>
    </div>
  );
};

export default Index;
