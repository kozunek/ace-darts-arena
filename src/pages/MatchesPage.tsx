import { useLeague } from "@/contexts/LeagueContext";
import { Calendar, Trophy, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LeagueSelector from "@/components/LeagueSelector";
import MatchReactions from "@/components/MatchReactions";
import PageHeader from "@/components/PageHeader";

const MatchesPage = () => {
  const { activeLeagueId, getLeagueMatches } = useLeague();
  const leagueMatches = getLeagueMatches(activeLeagueId);
  const completed = leagueMatches.filter((m) => m.status === "completed");
  const upcoming = leagueMatches.filter((m) => m.status === "upcoming" && m.player1Name !== "TBD" && m.player2Name !== "TBD");
  const pendingApproval = leagueMatches.filter((m) => m.status === "pending_approval");

  return (
    <div>
      <PageHeader title="Mecze" subtitle="Historia i nadchodzące mecze ligi">
        <LeagueSelector />
      </PageHeader>
      <div className="container mx-auto px-4 py-12 space-y-12">

      <section>
        <div className="mb-6 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/30 rounded-full blur-lg" />
            <Clock className="h-6 w-6 text-accent relative" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Nadchodzące</h2>
            <p className="text-sm text-muted-foreground font-body">{upcoming.length} zaplanowanych {pl.game(upcoming.length)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcoming.map((match) => (
            <div key={match.id} className="group rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/80 p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-border/30">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-body">{new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}</span>
                {match.round && <span className="text-[10px] font-display uppercase ml-auto px-2 py-1 bg-muted/50 rounded-full">Kolejka {match.round}</span>}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-body font-medium text-foreground group-hover:text-primary transition-colors">{match.player1Name}</span>
                  <span className="text-xs font-display uppercase text-muted-foreground/50 px-2">vs</span>
                  <span className="font-body font-medium text-foreground group-hover:text-primary transition-colors text-right">{match.player2Name}</span>
                </div>
              </div>
            </div>
          ))}
          {upcoming.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-body">Brak zaplanowanych meczów.</p>
            </div>
          )}
        </div>
      </section>

      {pendingApproval.length > 0 && (
        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/30 rounded-full blur-lg" />
              <AlertCircle className="h-6 w-6 text-accent relative" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Oczekujące</h2>
              <p className="text-sm text-muted-foreground font-body">{pendingApproval.length} do zatwierdzenia</p>
            </div>
          </div>
          <div className="space-y-4">
            {pendingApproval.map((match) => (
              <div key={match.id} className="group rounded-2xl border border-accent/30 bg-gradient-to-br from-card via-card to-card/80 p-6 hover:border-accent/80 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-border/30">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-body">{new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}</span>
                  {match.round && <span className="text-[10px] font-display uppercase ml-auto px-2 py-1 bg-accent/20 rounded-full text-accent">Kolejka {match.round}</span>}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-left flex-1">
                    <div className="font-body font-medium text-foreground">{match.player1Name}</div>
                  </div>
                  <div className="flex items-center gap-3 px-6">
                    <span className="text-3xl font-display font-bold text-accent">{match.score1}</span>
                    <span className="text-sm text-muted-foreground/50 font-display">:</span>
                    <span className="text-3xl font-display font-bold text-accent">{match.score2}</span>
                  </div>
                  <div className="text-right flex-1">
                    <div className="font-body font-medium text-foreground">{match.player2Name}</div>
                  </div>
                </div>
                <MatchReactions matchId={match.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-6 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-secondary/30 rounded-full blur-lg" />
            <Trophy className="h-6 w-6 text-secondary relative" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Rozegrane</h2>
            <p className="text-sm text-muted-foreground font-body">{completed.length} {pl.game(completed.length)}</p>
          </div>
        </div>
        <div className="space-y-4">
          {completed.map((match) => (
            <div key={match.id} className="group rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/80 hover:border-secondary/50 hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="font-body">{new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}</span>
                    {match.round && <span className="text-[10px] font-display uppercase px-2 py-1 bg-muted/50 rounded-full">Kolejka {match.round}</span>}
                  </div>
                  {match.autodartsLink && (
                    <a href={match.autodartsLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 text-xs font-body">
                      <ExternalLink className="h-3.5 w-3.5" /> Autodarts
                    </a>
                  )}
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  {/* Player 1 */}
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-body font-semibold text-foreground group-hover:text-primary transition-colors truncate">{match.player1Name}</div>
                    {match.avg1 != null && (
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <div className="flex justify-between gap-2">
                          <span>Śr. {match.avg1?.toFixed(1)}</span>
                          <span>180: {match.oneEighties1}</span>
                          <span>HC: {match.highCheckout1}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Score */}
                  <div className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                    <span className={`text-3xl font-display font-bold transition-colors duration-300 ${
                      (match.score1 ?? 0) > (match.score2 ?? 0) ? "text-secondary" : "text-muted-foreground"
                    }`}>{match.score1}</span>
                    <span className="text-sm text-muted-foreground/50 font-display">:</span>
                    <span className={`text-3xl font-display font-bold transition-colors duration-300 ${
                      (match.score2 ?? 0) > (match.score1 ?? 0) ? "text-secondary" : "text-muted-foreground"
                    }`}>{match.score2}</span>
                  </div>
                  
                  {/* Player 2 */}
                  <div className="text-right flex-1 min-w-0">
                    <div className="font-body font-semibold text-foreground group-hover:text-primary transition-colors truncate">{match.player2Name}</div>
                    {match.avg2 != null && (
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <div className="flex justify-between gap-2">
                          <span>Śr. {match.avg2?.toFixed(1)}</span>
                          <span>180: {match.oneEighties2}</span>
                          <span>HC: {match.highCheckout2}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-border/30 pt-4">
                  <MatchReactions matchId={match.id} />
                </div>
              </div>
            </div>
          ))}
          {completed.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-body">Brak rozegranych meczów.</p>
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
};

export default MatchesPage;
