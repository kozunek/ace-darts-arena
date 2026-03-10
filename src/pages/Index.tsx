import { useLeague } from "@/contexts/LeagueContext";
import LeagueTable from "@/components/LeagueTable";
import BracketView from "@/components/BracketView";
import GroupBracketView from "@/components/GroupBracketView";
import HeroSection from "@/components/HeroSection";
import UpcomingMatchesPreview from "@/components/UpcomingMatchesPreview";
import LeagueSelector from "@/components/LeagueSelector";
import OpenLeagues from "@/components/OpenLeagues";
import LeagueWinners from "@/components/LeagueWinners";
import MyNextMatchWidget from "@/components/MyNextMatchWidget";
import { Link } from "react-router-dom";
import { Gamepad2, Download, ArrowRight } from "lucide-react";

const Index = () => {
  const { activeLeagueId, leagues } = useLeague();
  const league = leagues.find(l => l.id === activeLeagueId);
  const leagueType = league?.league_type ?? "league";

  return (
    <div className="min-h-screen">
      <HeroSection />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/how-to-play" className="group rounded-xl border border-border bg-card p-5 card-glow flex items-center gap-4 hover:border-primary/40 transition-colors">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-foreground">Jak grać?</div>
              <div className="text-xs text-muted-foreground font-body">Instrukcja krok po kroku dla każdej platformy</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
          <Link to="/downloads" className="group rounded-xl border border-border bg-card p-5 card-glow flex items-center gap-4 hover:border-primary/40 transition-colors">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Download className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-foreground">Pobierz wtyczkę / aplikację</div>
              <div className="text-xs text-muted-foreground font-body">Rozszerzenie Chrome/Firefox i aplikacja Android</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>

        <MyNextMatchWidget />
        <LeagueWinners />
        <OpenLeagues />
        <LeagueSelector />
        {league && (
          <div className="text-sm text-muted-foreground font-body">
            <span className="text-foreground font-semibold">{league.name}</span> · {league.season} — {league.description}
          </div>
        )}
        {leagueType === "league" && <LeagueTable />}
        {leagueType === "bracket" && <BracketView />}
        {leagueType === "group_bracket" && <GroupBracketView />}
        <UpcomingMatchesPreview />
      </div>
    </div>
  );
};

export default Index;
