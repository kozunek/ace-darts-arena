import { useLeague } from "@/contexts/LeagueContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import LeagueTable from "@/components/LeagueTable";
import BracketView from "@/components/BracketView";
import GroupBracketView from "@/components/GroupBracketView";
import UpcomingMatchesPreview from "@/components/UpcomingMatchesPreview";
import LeagueSelector from "@/components/LeagueSelector";
import OpenLeagues from "@/components/OpenLeagues";
import LeagueWinners from "@/components/LeagueWinners";
import MyNextMatchWidget from "@/components/MyNextMatchWidget";
import PageHeader from "@/components/PageHeader";
import { BookOpen } from "lucide-react";

const TablesPage = () => {
  const { activeLeagueId, leagues } = useLeague();
  const league = leagues.find(l => l.id === activeLeagueId);
  const leagueType = league?.league_type ?? "league";
  const [hasRules, setHasRules] = useState(false);

  useEffect(() => {
    if (!activeLeagueId) return;
    supabase.from("league_rules" as any).select("id").or(`league_id.eq.${activeLeagueId},is_global.eq.true`).limit(1)
      .then(({ data }) => setHasRules((data?.length ?? 0) > 0));
  }, [activeLeagueId]);

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
        {hasRules && (
          <Link to="/rules" className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-body">
            <BookOpen className="h-4 w-4" /> Regulamin rozgrywek
          </Link>
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
