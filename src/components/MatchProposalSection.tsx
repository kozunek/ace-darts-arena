import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Check, X, Clock, CalendarCheck, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Proposal {
  id: string;
  match_id: string;
  proposer_player_id: string;
  proposed_date: string;
  proposed_time: string | null;
  status: string;
  created_at: string;
  response_note: string | null;
}

interface Props {
  matchId: string;
  myPlayerId: string;
  opponentName: string;
  matchDeadline: string; // the date field from match (deadline)
  confirmedDate: string | null;
}

const MatchProposalSection = ({ matchId, myPlayerId, opponentName, matchDeadline, confirmedDate }: Props) => {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposedDate, setProposedDate] = useState<Date | undefined>();
  const [proposedTime, setProposedTime] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProposals = async () => {
    const { data } = await supabase
      .from("match_proposals")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });
    setProposals((data as Proposal[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProposals();
  }, [matchId]);

  const handlePropose = async () => {
    if (!proposedDate) return;
    setSubmitting(true);

    // Mark any previous pending proposals from me as 'counter'
    const myPending = proposals.filter(p => p.proposer_player_id === myPlayerId && p.status === "pending");
    for (const p of myPending) {
      await supabase.from("match_proposals").update({ status: "counter" }).eq("id", p.id);
    }

    const { error } = await supabase.from("match_proposals").insert({
      match_id: matchId,
      proposer_player_id: myPlayerId,
      proposed_date: format(proposedDate, "yyyy-MM-dd"),
      proposed_time: proposedTime || null,
    } as any);

    if (error) {
      toast({ title: "Błąd", description: "Nie udało się wysłać propozycji.", variant: "destructive" });
    } else {
      toast({ title: "📅 Propozycja wysłana!", description: `Termin: ${format(proposedDate, "d MMMM yyyy", { locale: pl })}${proposedTime ? ` o ${proposedTime}` : ""}` });
      // Discord webhook — match proposal
      try {
        await supabase.functions.invoke("discord-webhook", {
          body: {
            action: "send_match_proposal",
            proposer_name: "Gracz",
            opponent_name: opponentName || "Przeciwnik",
            proposed_date: format(proposedDate, "dd.MM.yyyy"),
            proposed_time: proposedTime || null,
          },
        });
      } catch (e) { console.error("Discord webhook error:", e); }
      setShowForm(false);
      setProposedDate(undefined);
      setProposedTime("");
    }
    setSubmitting(false);
    fetchProposals();
  };

  const handleAccept = async (proposal: Proposal) => {
    setSubmitting(true);
    const { error } = await supabase
      .from("match_proposals")
      .update({ status: "accepted" } as any)
      .eq("id", proposal.id);

    if (error) {
      toast({ title: "Błąd", description: "Nie udało się zaakceptować.", variant: "destructive" });
    } else {
      toast({ title: "✅ Termin zaakceptowany!", description: `Mecz zaplanowany na ${new Date(proposal.proposed_date).toLocaleDateString("pl-PL")}` });
      // Discord webhook — match proposal accepted
      try {
        await supabase.functions.invoke("discord-webhook", {
          body: {
            action: "send_match_proposal_accepted",
            accepter_name: accepterName || "Gracz",
            proposer_name: proposerName || "Przeciwnik",
            proposed_date: new Date(proposal.proposed_date).toLocaleDateString("pl-PL"),
            proposed_time: proposal.proposed_time || null,
          },
        });
      } catch (e) { console.error("Discord webhook error:", e); }
    }
    setSubmitting(false);
    fetchProposals();
  };

  const handleReject = async (proposal: Proposal) => {
    setSubmitting(true);
    await supabase
      .from("match_proposals")
      .update({ status: "rejected" } as any)
      .eq("id", proposal.id);
    toast({ title: "❌ Propozycja odrzucona", description: "Zaproponuj inny termin." });
    setSubmitting(false);
    fetchProposals();
  };

  const latestPending = proposals.find(p => p.status === "pending");
  const isMyProposal = latestPending?.proposer_player_id === myPlayerId;
  const hasConfirmed = confirmedDate || proposals.some(p => p.status === "accepted");
  const acceptedProposal = proposals.find(p => p.status === "accepted");

  if (loading) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/10 p-4 space-y-3">
      {/* Deadline info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
        <Clock className="h-3.5 w-3.5" />
        <span>Termin rozegrania: <strong className="text-foreground">{new Date(matchDeadline).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</strong></span>
      </div>

      {/* Confirmed date */}
      {hasConfirmed && (
        <div className="flex items-center gap-2 rounded-md bg-secondary/10 border border-secondary/30 p-3">
          <CalendarCheck className="h-4 w-4 text-secondary" />
          <span className="text-sm font-body font-semibold text-secondary">
            Ustalony termin: {new Date(confirmedDate || acceptedProposal!.proposed_date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
            {acceptedProposal?.proposed_time && ` o ${acceptedProposal.proposed_time}`}
          </span>
        </div>
      )}

      {/* Pending proposal from opponent - show accept/reject */}
      {latestPending && !isMyProposal && !hasConfirmed && (
        <div className="rounded-md bg-accent/10 border border-accent/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            <span className="text-sm font-body text-foreground">
              <strong>{opponentName}</strong> proponuje termin:{" "}
              <strong>{new Date(latestPending.proposed_date).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}</strong>
              {latestPending.proposed_time && <strong> o {latestPending.proposed_time}</strong>}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAccept(latestPending)}
              disabled={submitting}
              className="font-display text-xs uppercase tracking-wider"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Akceptuję
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(latestPending)}
              disabled={submitting}
              className="font-display text-xs uppercase tracking-wider"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Odrzuć
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                handleReject(latestPending);
                setShowForm(true);
              }}
              disabled={submitting}
              className="font-display text-xs uppercase tracking-wider"
            >
              <Send className="h-3.5 w-3.5 mr-1" /> Kontrpropozycja
            </Button>
          </div>
        </div>
      )}

      {/* Pending proposal from me - waiting */}
      {latestPending && isMyProposal && !hasConfirmed && (
        <div className="rounded-md bg-primary/10 border border-primary/30 p-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-body text-foreground">
            Twoja propozycja: <strong>{new Date(latestPending.proposed_date).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}</strong>
            {latestPending.proposed_time && <strong> o {latestPending.proposed_time}</strong>}
            {" "}— oczekuje na odpowiedź
          </span>
        </div>
      )}

      {/* Proposal form */}
      {!hasConfirmed && (
        <>
          {!showForm && !latestPending && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="font-display text-xs uppercase tracking-wider"
            >
              <Calendar className="h-3.5 w-3.5 mr-1" /> Zaproponuj termin
            </Button>
          )}

          {showForm && (
            <div className="rounded-md border border-border bg-card p-3 space-y-3">
              <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                Zaproponuj termin meczu
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[200px] justify-start text-left font-normal font-body",
                          !proposedDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {proposedDate ? format(proposedDate, "d MMMM yyyy", { locale: pl }) : "Wybierz datę"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={proposedDate}
                        onSelect={setProposedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Input
                    type="time"
                    value={proposedTime}
                    onChange={(e) => setProposedTime(e.target.value)}
                    className="w-[120px] bg-muted/30 border-border font-body"
                    placeholder="Godzina"
                  />
                </div>
                <Button
                  size="sm"
                  variant="hero"
                  onClick={handlePropose}
                  disabled={!proposedDate || submitting}
                  className="font-display text-xs uppercase tracking-wider"
                >
                  <Send className="h-3.5 w-3.5 mr-1" /> Wyślij
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  className="font-display text-xs"
                >
                  Anuluj
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* History of proposals */}
      {proposals.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">
            Historia propozycji ({proposals.length})
          </div>
          {proposals.slice(0, 5).map((p) => {
            const isMe = p.proposer_player_id === myPlayerId;
            const statusIcons: Record<string, string> = {
              pending: "⏳",
              accepted: "✅",
              rejected: "❌",
              counter: "🔄",
            };
            const statusLabels: Record<string, string> = {
              pending: "Oczekuje",
              accepted: "Zaakceptowane",
              rejected: "Odrzucone",
              counter: "Zastąpione",
            };
            return (
              <div key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                <span>{statusIcons[p.status] || "❓"}</span>
                <span className={isMe ? "text-primary" : "text-accent"}>
                  {isMe ? "Ty" : opponentName}
                </span>
                <span>→ {new Date(p.proposed_date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}</span>
                {p.proposed_time && <span>o {p.proposed_time}</span>}
                <span className="text-muted-foreground/50">({statusLabels[p.status]})</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchProposalSection;
