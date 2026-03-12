import { useLeague } from "@/contexts/LeagueContext";
import LeagueTable from "@/components/LeagueTable";
import BracketView from "@/components/BracketView";
import GroupBracketView from "@/components/GroupBracketView";
import UpcomingMatchesPreview from "@/components/UpcomingMatchesPreview";
import LeagueSelector from "@/components/LeagueSelector";
import OpenLeagues from "@/components/OpenLeagues";
import LeagueWinners from "@/components/LeagueWinners";
import MyNextMatchWidget from "@/components/MyNextMatchWidget";
import PageHeader from "@/components/PageHeader";

const TablesPage = () => {
  const { activeLeagueId, leagues } = useLeague();
  const league = leagues.find(l => l.id === activeLeagueId);
  const leagueType = league?.league_type ?? "league";

  return (
    <div>
      <PageHeader title="Tabele" subtitle="Tabele ligowe, drabinki i zapisy" />
      <div className="container mx-auto px-4 py-8 space-y-8">
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

export default TablesPage;
