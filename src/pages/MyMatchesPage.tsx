import { useLeague } from "@/contexts/LeagueContext";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Phone, MessageCircle, Handshake, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import LeagueSelector from "@/components/LeagueSelector";
import MatchProposalSection from "@/components/MatchProposalSection";

interface PlayerContact {
  id: string;
  phone: string | null;
  discord: string | null;
}

const MyMatchesPage = () => {
  const { user } = useAuth();
  const { players, matches, activeLeagueId, getLeagueMatches } = useLeague();
  const [contacts, setContacts] = useState<Record<string, PlayerContact>>({});
  const [opponentUserIds, setOpponentUserIds] = useState<Record<string, string>>({});

  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("players")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMyPlayerId(data.id);
      });
  }, [user]);

  const leagueMatches = getLeagueMatches(activeLeagueId);
  const myUpcoming = leagueMatches.filter(
    (m) => m.status === "upcoming" && myPlayerId && (m.player1Id === myPlayerId || m.player2Id === myPlayerId)
  );

  // Fetch contact info and user_ids for opponents
  useEffect(() => {
    if (!myPlayerId || myUpcoming.length === 0) return;
    const opponentIds = myUpcoming.map((m) =>
      m.player1Id === myPlayerId ? m.player2Id : m.player1Id
    );
    const uniqueIds = [...new Set(opponentIds)];

    // Get contacts
    Promise.all(
      uniqueIds.map((id) =>
        supabase.rpc("get_opponent_contact", { opponent_player_id: id }).then(({ data }) => {
          if (data && data.length > 0) return { id, phone: data[0].phone, discord: data[0].discord };
          return { id, phone: null, discord: null };
        })
      )
    ).then((results) => {
      const map: Record<string, PlayerContact> = {};
      results.forEach((r) => { map[r.id] = { id: r.id, phone: r.phone, discord: r.discord }; });
      setContacts(map);
    });

    // Get user_ids for chat links
    supabase
      .from("players_public" as any)
      .select("id, user_id")
      .in("id", uniqueIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((p) => { if (p.user_id) map[p.id] = p.user_id; });
          setOpponentUserIds(map);
        }
      });
  }, [myPlayerId, myUpcoming.length]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane logowanie</h1>
        <p className="text-muted-foreground font-body mb-4">Zaloguj się, aby zobaczyć swoje mecze.</p>
        <Link to="/login"><Button variant="hero">Zaloguj się</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Handshake className="h-8 w-8 text-primary" /> Moje Mecze
        </h1>
        <p className="text-muted-foreground font-body mb-4">
          Twoje nadchodzące mecze — ustal termin z przeciwnikiem
        </p>
        <LeagueSelector />
      </div>

      {!myPlayerId ? (
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-center">
          <p className="text-muted-foreground font-body">Twoje konto nie jest powiązane z profilem gracza.</p>
        </div>
      ) : myUpcoming.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-center">
          <p className="text-muted-foreground font-body">Brak nadchodzących meczów w tej lidze.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myUpcoming.map((match) => {
            const isP1 = match.player1Id === myPlayerId;
            const opponentId = isP1 ? match.player2Id : match.player1Id;
            const opponentName = isP1 ? match.player2Name : match.player1Name;
            const contact = contacts[opponentId];
            const opponentUserId = opponentUserIds[opponentId];

            return (
              <div key={match.id} className="rounded-lg border border-border bg-card p-5 card-glow">
                {/* Match info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-body">
                    Termin do:{" "}
                    {new Date(match.date).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {match.round && (
                    <span className="text-[10px] font-display uppercase">Kolejka {match.round}</span>
                  )}
                  <Badge
                    variant="outline"
                    className="ml-auto text-accent border-accent/30 font-display text-[10px] uppercase"
                  >
                    Do rozegrania
                  </Badge>
                </div>

                {/* Opponent */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-display font-bold text-primary">
                    {players.find((p) => p.id === opponentId)?.avatar || "?"}
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/players/${opponentId}`}
                      className="font-body font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      vs {opponentName}
                    </Link>
                  </div>
                  {opponentUserId && (
                    <Link to={`/chat?with=${opponentUserId}`}>
                      <Button variant="outline" size="sm" className="font-display text-xs uppercase tracking-wider">
                        <MessageCircle className="h-3.5 w-3.5 mr-1" /> Czat
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Contact info */}
                {contact && (contact.phone || contact.discord) ? (
                  <div className="rounded-md bg-muted/30 border border-border p-3 flex flex-wrap gap-4">
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors font-body"
                      >
                        <Phone className="h-4 w-4 text-primary" />
                        {contact.phone}
                      </a>
                    )}
                    {contact.discord && (
                      <div className="flex items-center gap-2 text-sm text-foreground font-body">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        {contact.discord}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground font-body italic">
                    Przeciwnik nie podał jeszcze danych kontaktowych.
                  </p>
                )}

                {/* Proposal section */}
                {myPlayerId && (
                  <MatchProposalSection
                    matchId={match.id}
                    myPlayerId={myPlayerId}
                    opponentName={opponentName}
                    matchDeadline={match.date}
                    confirmedDate={match.confirmedDate ?? null}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Link to settings */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground font-body flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        <span>
          Chcesz udostępnić swój kontakt?{" "}
          <Link to="/settings" className="text-primary hover:underline font-semibold">
            Uzupełnij dane w ustawieniach
          </Link>
        </span>
      </div>
    </div>
  );
};

export default MyMatchesPage;
