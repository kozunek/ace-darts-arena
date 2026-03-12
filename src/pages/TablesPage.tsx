import { useLeague } from "@/contexts/LeagueContext";
import LeagueTable from "@/components/LeagueTable";
import BracketView from "@/components/BracketView";
import GroupBracketView from "@/components/GroupBracketView";
import UpcomingMatchesPreview from "@/components/UpcomingMatchesPreview";
import LeagueSelector from "@/components/LeagueSelector";
import OpenLeagues from "@/components/OpenLeagues";
import LeagueWinners from "@/components/LeagueWinners";
import MyNextMatchWidget from "@/components/MyNextMatchWidget";
import { Target } from "lucide-react";

const TablesPage = () => {
  const { activeLeagueId, leagues } = useLeague();
  const league = leagues.find(l => l.id === activeLeagueId);
  const leagueType = league?.league_type ?? "league";

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
          <Target className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Tabele</h1>
          <p className="text-muted-foreground font-body text-sm">Tabele ligowe, drabinki i zapisy</p>
        </div>
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
  );
};

export default TablesPage;
