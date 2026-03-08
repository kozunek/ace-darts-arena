import { useLeague } from "@/contexts/LeagueContext";
import { Calendar, Trophy, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LeagueSelector from "@/components/LeagueSelector";

const MatchesPage = () => {
  const { activeLeagueId, getLeagueMatches } = useLeague();
  const leagueMatches = getLeagueMatches(activeLeagueId);
  const completed = leagueMatches.filter((m) => m.status === "completed");
  const upcoming = leagueMatches.filter((m) => m.status === "upcoming");
  const pendingApproval = leagueMatches.filter((m) => m.status === "pending_approval");

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Mecze</h1>
        <p className="text-muted-foreground font-body mb-4">Historia i nadchodzące mecze ligi</p>
        <LeagueSelector />
      </div>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-accent" /> Nadchodzące ({upcoming.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcoming.map((match) => (
            <div key={match.id} className="rounded-lg border border-border bg-card p-5 card-glow">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-body">Termin: {new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
                {match.round && <span className="text-[10px] font-display uppercase">Kolejka {match.round}</span>}
                <Badge variant="outline" className="ml-auto text-accent border-accent/30 font-display text-[10px] uppercase">Zaplanowany</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body font-medium text-foreground">{match.player1Name}</span>
                <span className="text-sm font-display text-muted-foreground px-4">VS</span>
                <span className="font-body font-medium text-foreground text-right">{match.player2Name}</span>
              </div>
            </div>
          ))}
          {upcoming.length === 0 && <p className="text-muted-foreground font-body col-span-2">Brak zaplanowanych meczów.</p>}
        </div>
      </section>

      {pendingApproval.length > 0 && (
        <section>
          <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-accent" /> Oczekujące na zatwierdzenie ({pendingApproval.length})
          </h2>
          <div className="space-y-4">
            {pendingApproval.map((match) => (
              <div key={match.id} className="rounded-lg border border-accent/30 bg-card p-5 card-glow">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-body">{new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
                  {match.round && <span className="text-[10px] font-display uppercase">Kolejka {match.round}</span>}
                  <Badge variant="outline" className="ml-auto text-accent border-accent/30 font-display text-[10px] uppercase">Oczekuje</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-left flex-1">
                    <div className="font-body font-medium text-foreground">{match.player1Name}</div>
                  </div>
                  <div className="flex items-center gap-3 px-4">
                    <span className="text-3xl font-display font-bold text-accent">{match.score1}</span>
                    <span className="text-sm text-muted-foreground font-display">:</span>
                    <span className="text-3xl font-display font-bold text-accent">{match.score2}</span>
                  </div>
                  <div className="text-right flex-1">
                    <div className="font-body font-medium text-foreground">{match.player2Name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-secondary" /> Rozegrane ({completed.length})
        </h2>
        <div className="space-y-4">
          {completed.map((match) => (
            <div key={match.id} className="rounded-lg border border-border bg-card p-5 card-glow">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-body">{new Date(match.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
                {match.round && <span className="text-[10px] font-display uppercase">Kolejka {match.round}</span>}
                {match.autodartsLink && (
                  <a href={match.autodartsLink} target="_blank" rel="noopener noreferrer" className="ml-auto text-primary hover:text-primary/80 flex items-center gap-1 text-xs">
                    <ExternalLink className="h-3 w-3" /> Autodarts
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-left flex-1">
                  <div className="font-body font-medium text-foreground">{match.player1Name}</div>
                  {match.avg1 != null && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Śr. {match.avg1?.toFixed(1)} · 180: {match.oneEighties1} · HC: {match.highCheckout1}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 px-4">
                  <span className={`text-3xl font-display font-bold ${(match.score1 ?? 0) > (match.score2 ?? 0) ? "text-secondary" : "text-muted-foreground"}`}>{match.score1}</span>
                  <span className="text-sm text-muted-foreground font-display">:</span>
                  <span className={`text-3xl font-display font-bold ${(match.score2 ?? 0) > (match.score1 ?? 0) ? "text-secondary" : "text-muted-foreground"}`}>{match.score2}</span>
                </div>
                <div className="text-right flex-1">
                  <div className="font-body font-medium text-foreground">{match.player2Name}</div>
                  {match.avg2 != null && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Śr. {match.avg2?.toFixed(1)} · 180: {match.oneEighties2} · HC: {match.highCheckout2}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {completed.length === 0 && <p className="text-muted-foreground font-body">Brak rozegranych meczów.</p>}
        </div>
      </section>
    </div>
  );
};

export default MatchesPage;
