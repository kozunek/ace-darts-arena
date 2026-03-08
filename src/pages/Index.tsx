import { useLeague } from "@/contexts/LeagueContext";
import LeagueTable from "@/components/LeagueTable";
import HeroSection from "@/components/HeroSection";
import UpcomingMatchesPreview from "@/components/UpcomingMatchesPreview";

const Index = () => {
  const { players } = useLeague();

  return (
    <div className="min-h-screen">
      <HeroSection />
      <div className="container mx-auto px-4 py-8 space-y-12">
        <LeagueTable players={players} />
        <UpcomingMatchesPreview />
      </div>
    </div>
  );
};

export default Index;
