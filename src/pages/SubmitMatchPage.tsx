import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague, MatchResultData } from "@/contexts/LeagueContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Link2,
  Send,
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import MatchStatFields from "@/components/MatchStatFields";

type AutoPayload = Record<string, any>;

const asNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const readScore = (scoreLike: unknown): number => {
  if (typeof scoreLike === "number") return scoreLike;
  if (scoreLike && typeof scoreLike === "object") {
    const item = scoreLike as Record<string, unknown>;
    if (typeof item.legs === "number") return item.legs;
    if (typeof item.sets === "number") return item.sets;
    if (typeof item.value === "number") return item.value;
  }
  return asNumber(scoreLike, 0);
};

const STAT_LABELS: { key1: string; key2: string; label: string }[] = [
  { key1: "avg1", key2: "avg2", label: "Średnia" },
  { key1: "first_9_avg1", key2: "first_9_avg2", label: "Średnia z 9" },
  { key1: "avg_until_170_1", key2: "avg_until_170_2", label: "Śr. do 170" },
  { key1: "one_eighties1", key2: "one_eighties2", label: "180" },
  { key1: "high_checkout1", key2: "high_checkout2", label: "Najw. checkout" },
  { key1: "ton60_1", key2: "ton60_2", label: "60+" },
  { key1: "ton80_1", key2: "ton80_2", label: "100+" },
  { key1: "ton_plus1", key2: "ton_plus2", label: "140+" },
  { key1: "ton40_1", key2: "ton40_2", label: "170+" },
  { key1: "darts_thrown1", key2: "darts_thrown2", label: "Rzuty" },
  { key1: "checkout_attempts1", key2: "checkout_attempts2", label: "Checkout próby" },
  { key1: "checkout_hits1", key2: "checkout_hits2", label: "Checkout traf." },
];

const SubmitMatchPage = () => {
  const { user, profile, loading, isAdmin, isModerator } = useAuth();
  const { matches, submitMatchResult } = useLeague();
  const { toast } = useToast();

  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [autodartsLink, setAutodartsLink] = useState("");
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stats, setStats] = useState<Record<string, string>>({});
  const [fetchingAutodarts, setFetchingAutodarts] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [extensionToken, setExtensionToken] = useState<string | null>(null);
  const [tokenFresh, setTokenFresh] = useState(false);
  const [autoSubmitFromExtension, setAutoSubmitFromExtension] = useState(true);
  const processedAutoMatchRef = useRef<string | null>(null);

  // Raw preview of fetched Autodarts data
  const [rawPreview, setRawPreview] = useState<AutoPayload | null>(null);

  useEffect(() => {
    if (!user) {
      setLoadingPlayer(false);
      return;
    }
    const fetchPlayerId = async () => {
      setLoadingPlayer(true);
      const { data: me } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setMyPlayerId(me?.id ?? null);
      setLoadingPlayer(false);
    };
    fetchPlayerId();
  }, [user]);

  const canSubmitAll = isAdmin || isModerator;

  const upcomingMatches = matches.filter((m) => {
    if (m.status !== "upcoming") return false;
    if (canSubmitAll) return true;
    if (!myPlayerId) return false;
    return m.player1Id === myPlayerId || m.player2Id === myPlayerId;
  });

  const pendingMatches = matches.filter((m) => {
    if (m.status !== "pending_approval") return false;
    if (canSubmitAll) return true;
    if (!myPlayerId) return false;
    return m.player1Id === myPlayerId || m.player2Id === myPlayerId;
  });

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  // Populate form fields from payload (no swapping — data goes in as-is)
  const populateForm = useCallback((payload: AutoPayload) => {
    const scoreA = readScore(payload.score1);
    const scoreB = readScore(payload.score2);

    setScore1(String(scoreA));
    setScore2(String(scoreB));
    setShowAdvanced(true);

    setStats({
      avg1: payload.avg1 != null ? String(payload.avg1) : "",
      avg2: payload.avg2 != null ? String(payload.avg2) : "",
      first9Avg1: payload.first_9_avg1 != null ? String(payload.first_9_avg1) : "",
      first9Avg2: payload.first_9_avg2 != null ? String(payload.first_9_avg2) : "",
      avgUntil170_1: payload.avg_until_170_1 != null ? String(payload.avg_until_170_1) : "",
      avgUntil170_2: payload.avg_until_170_2 != null ? String(payload.avg_until_170_2) : "",
      oneEighties1: String(asNumber(payload.one_eighties1)),
      oneEighties2: String(asNumber(payload.one_eighties2)),
      hc1: String(asNumber(payload.high_checkout1)),
      hc2: String(asNumber(payload.high_checkout2)),
      ton60_1: String(asNumber(payload.ton60_1)),
      ton60_2: String(asNumber(payload.ton60_2)),
      ton80_1: String(asNumber(payload.ton80_1)),
      ton80_2: String(asNumber(payload.ton80_2)),
      tonPlus1: String(asNumber(payload.ton_plus1)),
      tonPlus2: String(asNumber(payload.ton_plus2)),
      ton40_1: String(asNumber(payload.ton40_1)),
      ton40_2: String(asNumber(payload.ton40_2)),
      darts1: String(asNumber(payload.darts_thrown1)),
      darts2: String(asNumber(payload.darts_thrown2)),
      checkoutAttempts1: String(asNumber(payload.checkout_attempts1)),
      checkoutAttempts2: String(asNumber(payload.checkout_attempts2)),
      checkoutHits1: String(asNumber(payload.checkout_hits1)),
      checkoutHits2: String(asNumber(payload.checkout_hits2)),
    });

    if (payload.autodarts_link) setAutodartsLink(payload.autodarts_link);
    setRawPreview(payload);
  }, []);

  const applyAutoPayload = useCallback(
    (payload: AutoPayload, allowAutoSubmit: boolean) => {
      if (!payload) return;

      const extMatchId =
        payload.match_id || payload.autodarts_link || `${payload.player1_name}-${payload.player2_name}`;
      if (allowAutoSubmit && processedAutoMatchRef.current === extMatchId) return;

      const p1 = (payload.player1_name || "").trim().toLowerCase();
      const p2 = (payload.player2_name || "").trim().toLowerCase();

      const matchedUpcoming = upcomingMatches.find((m) => {
        const m1 = m.player1Name.trim().toLowerCase();
        const m2 = m.player2Name.trim().toLowerCase();
        return (m1 === p1 && m2 === p2) || (m1 === p2 && m2 === p1);
      });

      if (matchedUpcoming) {
        setSelectedMatchId(matchedUpcoming.id);
      }

      // Just populate as-is — user can swap manually
      populateForm(payload);

      if (allowAutoSubmit && autoSubmitFromExtension && matchedUpcoming) {
        const scoreA = readScore(payload.score1);
        const scoreB = readScore(payload.score2);
        const data: MatchResultData = {
          score1: scoreA,
          score2: scoreB,
          avg1: payload.avg1 ?? undefined,
          avg2: payload.avg2 ?? undefined,
          oneEighties1: asNumber(payload.one_eighties1),
          oneEighties2: asNumber(payload.one_eighties2),
          highCheckout1: asNumber(payload.high_checkout1),
          highCheckout2: asNumber(payload.high_checkout2),
          ton60_1: asNumber(payload.ton60_1),
          ton60_2: asNumber(payload.ton60_2),
          ton80_1: asNumber(payload.ton80_1),
          ton80_2: asNumber(payload.ton80_2),
          tonPlus1: asNumber(payload.ton_plus1),
          tonPlus2: asNumber(payload.ton_plus2),
          ton40_1: asNumber(payload.ton40_1),
          ton40_2: asNumber(payload.ton40_2),
          dartsThrown1: asNumber(payload.darts_thrown1),
          dartsThrown2: asNumber(payload.darts_thrown2),
          checkoutAttempts1: asNumber(payload.checkout_attempts1),
          checkoutAttempts2: asNumber(payload.checkout_attempts2),
          checkoutHits1: asNumber(payload.checkout_hits1),
          checkoutHits2: asNumber(payload.checkout_hits2),
          first9Avg1: payload.first_9_avg1 ?? undefined,
          first9Avg2: payload.first_9_avg2 ?? undefined,
          avgUntil170_1: payload.avg_until_170_1 ?? undefined,
          avgUntil170_2: payload.avg_until_170_2 ?? undefined,
          autodartsLink: payload.autodarts_link || undefined,
        };
        submitMatchResult(matchedUpcoming.id, data);
        processedAutoMatchRef.current = extMatchId;
        toast({
          title: "✅ Auto-zgłoszenie",
          description: `Wynik ${payload.player1_name} vs ${payload.player2_name} został wysłany automatycznie.`,
        });
      }
    },
    [autoSubmitFromExtension, populateForm, submitMatchResult, toast, upcomingMatches],
  );

  const requestExtensionData = useCallback(() => {
    window.postMessage({ type: "EDART_REQUEST_TOKEN" }, "*");
    window.postMessage({ type: "EDART_REQUEST_LAST_MATCH" }, "*");
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "EDART_EXTENSION_INSTALLED") setExtensionInstalled(true);
      if (event.data?.type === "EDART_TOKEN_RESPONSE") {
        setExtensionInstalled(true);
        setExtensionToken(event.data.token || null);
        setTokenFresh(Boolean(event.data.fresh));
      }
      if (
        (event.data?.type === "EDART_LAST_MATCH_RESPONSE" ||
          event.data?.type === "EDART_LAST_MATCH_PUSH") &&
        event.data.payload
      ) {
        setExtensionInstalled(true);
        applyAutoPayload(event.data.payload, true);
      }
    };

    window.addEventListener("message", handler);
    requestExtensionData();
    const interval = window.setInterval(requestExtensionData, 8000);
    return () => {
      window.removeEventListener("message", handler);
      window.clearInterval(interval);
    };
  }, [applyAutoPayload, requestExtensionData]);

  const getAutodartsToken = useCallback(async (): Promise<string | null> => {
    if (extensionToken && tokenFresh) return extensionToken;
    return prompt(
      "🎯 Token Autodarts wymagany!\n\n" +
        "Token z rozszerzenia jest wygasły albo niedostępny.\n" +
        "1. Zaloguj się / odśwież play.autodarts.io\n" +
        "2. Kliknij ikonę rozszerzenia eDART\n" +
        "3. Skopiuj token i wklej tutaj",
    );
  }, [extensionToken, tokenFresh]);

  const handleFetchAutodarts = useCallback(async () => {
    if (!autodartsLink) return;

    const trimmedLink = autodartsLink.trim();
    const isMatchLink =
      trimmedLink.includes("autodarts.io/") || /^[a-f0-9-]{20,}$/i.test(trimmedLink);
    if (!isMatchLink) {
      toast({
        title: "Nieprawidłowy link",
        description: "Wklej link do meczu z Autodarts lub ID meczu, nie token.",
        variant: "destructive",
      });
      return;
    }

    setFetchingAutodarts(true);

    try {
      const adToken = await getAutodartsToken();
      if (!adToken) {
        toast({ title: "Anulowano", description: "Nie podano tokena Autodarts", variant: "destructive" });
        setFetchingAutodarts(false);
        return;
      }

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "fetch-autodarts-match",
        { body: { autodarts_link: trimmedLink, autodarts_token: adToken.trim() } },
      );

      if (fnError || !fnData?.success) {
        toast({
          title: "Błąd",
          description: fnData?.error || fnError?.message || "Nie udało się pobrać danych",
          variant: "destructive",
        });
        setFetchingAutodarts(false);
        return;
      }

      applyAutoPayload(fnData.data, false);
      toast({
        title: "✅ Pobrano!",
        description: `Statystyki: ${fnData.data.player1_name} vs ${fnData.data.player2_name}`,
      });
    } catch {
      toast({ title: "Błąd", description: "Nie udało się połączyć z Autodarts", variant: "destructive" });
    }

    setFetchingAutodarts(false);
  }, [autodartsLink, getAutodartsToken, toast, applyAutoPayload]);

  const resetForm = () => {
    setSelectedMatchId("");
    setScore1("");
    setScore2("");
    setAutodartsLink("");
    setStats({});
    setShowAdvanced(false);
    setRawPreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchId) {
      toast({ title: "Błąd", description: "Wybierz mecz.", variant: "destructive" });
      return;
    }

    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);

    if (isNaN(s1) || isNaN(s2)) {
      toast({ title: "Błąd", description: "Podaj prawidłowy wynik.", variant: "destructive" });
      return;
    }

    const optNum = (key: string) => (stats[key] ? parseFloat(stats[key]) : undefined);
    const attemptsP1 = optNum("checkoutAttempts1") ?? 0;
    const attemptsP2 = optNum("checkoutAttempts2") ?? 0;
    const hitsP1 = optNum("checkoutHits1") ?? 0;
    const hitsP2 = optNum("checkoutHits2") ?? 0;

    if (hitsP1 > attemptsP1 || hitsP2 > attemptsP2) {
      toast({
        title: "Błąd",
        description: "Trafione checkouty nie mogą być większe niż rzucone.",
        variant: "destructive",
      });
      return;
    }

    const data: MatchResultData = {
      score1: s1,
      score2: s2,
      avg1: optNum("avg1"),
      avg2: optNum("avg2"),
      oneEighties1: optNum("oneEighties1"),
      oneEighties2: optNum("oneEighties2"),
      highCheckout1: optNum("hc1"),
      highCheckout2: optNum("hc2"),
      ton60_1: optNum("ton60_1"),
      ton60_2: optNum("ton60_2"),
      ton80_1: optNum("ton80_1"),
      ton80_2: optNum("ton80_2"),
      tonPlus1: optNum("tonPlus1"),
      tonPlus2: optNum("tonPlus2"),
      ton40_1: optNum("ton40_1"),
      ton40_2: optNum("ton40_2"),
      dartsThrown1: optNum("darts1"),
      dartsThrown2: optNum("darts2"),
      checkoutAttempts1: attemptsP1,
      checkoutAttempts2: attemptsP2,
      checkoutHits1: hitsP1,
      checkoutHits2: hitsP2,
      first9Avg1: optNum("first9Avg1"),
      first9Avg2: optNum("first9Avg2"),
      avgUntil170_1: optNum("avgUntil170_1"),
      avgUntil170_2: optNum("avgUntil170_2"),
      autodartsLink: autodartsLink || undefined,
    };

    submitMatchResult(selectedMatchId, data);
    toast({
      title: "📋 Wynik zgłoszony!",
      description: "Wynik został wysłany do zatwierdzenia przez admina/moderatora.",
    });
    resetForm();
  };

  if (loading || loadingPlayer) return null;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane Logowanie</h1>
        <p className="text-muted-foreground font-body mb-6">Aby zgłosić wynik meczu, musisz być zalogowany.</p>
        <Link to="/login">
          <Button variant="hero" size="lg">Zaloguj się</Button>
        </Link>
      </div>
    );
  }

  if (!canSubmitAll && !myPlayerId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Brak przypisanego gracza</h1>
        <p className="text-muted-foreground font-body mb-6">
          Twoje konto nie jest jeszcze powiązane z żadnym graczem. Skontaktuj się z administratorem.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Dodaj Wynik</h1>
        <p className="text-muted-foreground font-body">
          Zalogowany jako <span className="text-foreground font-semibold">{profile?.name || user.email}</span>
          {canSubmitAll && (
            <span className="ml-2 text-xs text-primary">(Admin/Moderator — widoczne wszystkie mecze)</span>
          )}
        </p>
        <p className="text-xs text-accent font-body mt-1">
          ⚠️ Zgłoszone wyniki wymagają zatwierdzenia przez admina lub moderatora.
        </p>
      </div>

      {/* Extension status */}
      <div
        className={`rounded-lg border p-3 mb-4 flex items-center gap-3 text-sm ${
          extensionInstalled && extensionToken
            ? "border-primary/30 bg-primary/10 text-primary"
            : extensionInstalled
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-border bg-muted/30 text-muted-foreground"
        }`}
      >
        {extensionInstalled && extensionToken ? (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Rozszerzenie aktywne — token Autodarts gotowy {tokenFresh ? "✅" : "(odśwież Autodarts)"}</span>
          </>
        ) : extensionInstalled ? (
          <>
            <XCircle className="h-4 w-4 shrink-0" />
            <span>
              Rozszerzenie działa, ale brak tokena. Zaloguj się na{" "}
              <a href="https://play.autodarts.io" target="_blank" rel="noopener" className="underline">
                play.autodarts.io
              </a>
            </span>
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 shrink-0" />
            <span>Zainstaluj rozszerzenie Chrome eDART, żeby pobierać i wysyłać wynik automatycznie.</span>
          </>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-3 mb-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Auto-zgłoszenie po zakończeniu meczu z Autodarts</div>
        <Switch checked={autoSubmitFromExtension} onCheckedChange={setAutoSubmitFromExtension} />
      </div>

      {/* Pending matches */}
      {pendingMatches.length > 0 && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-5 mb-6">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" /> Oczekujące na zatwierdzenie ({pendingMatches.length})
          </h3>
          <div className="space-y-2">
            {pendingMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
                <span className="font-body text-sm text-foreground">
                  {m.player1Name} vs {m.player2Name}
                </span>
                <span className="text-sm font-display text-accent">
                  {m.score1}:{m.score2} ⏳
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingMatches.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center card-glow">
          <p className="text-muted-foreground font-body text-lg mb-2">Brak zaplanowanych meczów</p>
          <p className="text-sm text-muted-foreground">Nie ma żadnych nadchodzących meczów do zgłoszenia.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
              Wybierz mecz
            </Label>
            <div className="space-y-2">
              {upcomingMatches.map((match) => {
                const isSelected = selectedMatchId === match.id;
                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setSelectedMatchId(match.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-all ${
                      isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-body font-medium text-foreground">
                          {match.player1Name} vs {match.player2Name}
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">
                          Termin:{" "}
                          {new Date(match.date).toLocaleDateString("pl-PL", {
                            day: "numeric",
                            month: "long",
                          })}
                          {match.round && ` · Kolejka ${match.round}`}
                        </div>
                      </div>
                      {isSelected && <span className="text-xs font-display text-primary uppercase">Wybrany</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMatch && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Raw preview from Autodarts */}
              {rawPreview && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-primary uppercase tracking-wider">
                      📊 Dane z Autodarts
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-body">
                    <div className="font-display font-bold text-foreground text-sm truncate">
                      {rawPreview.player1_name}
                    </div>
                    <div className="text-muted-foreground font-display text-xs">Wynik</div>
                    <div className="font-display font-bold text-foreground text-sm truncate">
                      {rawPreview.player2_name}
                    </div>

                    <div className="text-2xl font-display font-bold text-foreground">
                      {readScore(rawPreview.score1)}
                    </div>
                    <div className="text-muted-foreground self-center">legs</div>
                    <div className="text-2xl font-display font-bold text-foreground">
                      {readScore(rawPreview.score2)}
                    </div>

                    {STAT_LABELS.map((row) => {
                      const v1 = rawPreview[row.key1];
                      const v2 = rawPreview[row.key2];
                      if (v1 == null && v2 == null) return null;
                      return (
                        <div key={row.key1} className="contents">
                          <div className="text-foreground font-display">{v1 ?? "-"}</div>
                          <div className="text-muted-foreground text-[10px]">{row.label}</div>
                          <div className="text-foreground font-display">{v2 ?? "-"}</div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center">
                    Dane z Autodarts uzupełniły formularz. Jeśli kolejność graczy się nie zgadza, kliknij „Zamień
                    strony".
                  </p>
                </div>
              )}

              {/* Score inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                    {selectedMatch.player1Name}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={score1}
                    onChange={(e) => setScore1(e.target.value)}
                    className="bg-muted/30 border-border text-center text-2xl font-display"
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                    {selectedMatch.player2Name}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={score2}
                    onChange={(e) => setScore2(e.target.value)}
                    className="bg-muted/30 border-border text-center text-2xl font-display"
                    placeholder="0"
                    required
                  />
                </div>
              </div>


              {/* Autodarts link */}
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5" /> Link Autodarts.io
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={autodartsLink}
                    onChange={(e) => setAutodartsLink(e.target.value)}
                    placeholder="https://play.autodarts.io/history/matches/..."
                    className="bg-muted/30 border-border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!autodartsLink || fetchingAutodarts}
                    onClick={handleFetchAutodarts}
                    className="shrink-0 font-display uppercase tracking-wider text-xs"
                  >
                    {fetchingAutodarts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {fetchingAutodarts ? "" : " Pobierz"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-body">
                  {extensionInstalled && extensionToken
                    ? "✅ Rozszerzenie pobiera i może wysłać wynik automatycznie"
                    : "Wklej link i kliknij Pobierz — zostaniesz poproszony o token"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-body transition-colors"
              >
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAdvanced ? "Ukryj szczegółowe statystyki" : "Dodaj szczegółowe statystyki"}
              </button>

              {showAdvanced && (
                <MatchStatFields
                  stats={stats}
                  setStats={setStats}
                  p1={selectedMatch.player1Name}
                  p2={selectedMatch.player2Name}
                />
              )}

              <Button type="submit" variant="hero" size="lg" className="w-full">
                <Send className="h-4 w-4 mr-2" /> Zgłoś Wynik (do zatwierdzenia)
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default SubmitMatchPage;
