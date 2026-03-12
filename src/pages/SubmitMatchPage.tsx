import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Camera,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import MatchStatFields from "@/components/MatchStatFields";
import ScreenshotUpload from "@/components/ScreenshotUpload";
import PageHeader from "@/components/PageHeader";

type AutoPayload = Record<string, any>;
type SourcePlatform = "autodarts" | "dartcounter" | "dartsmind";

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

const STAT_LABELS: { key1: string; key2: string; label: string; format?: "checkout" }[] = [
  { key1: "avg1", key2: "avg2", label: "Średnia" },
  { key1: "first_9_avg1", key2: "first_9_avg2", label: "Średnia z 9" },
  
  { key1: "one_eighties1", key2: "one_eighties2", label: "180" },
  { key1: "high_checkout1", key2: "high_checkout2", label: "Najw. checkout" },
  { key1: "ton60_1", key2: "ton60_2", label: "60+" },
  { key1: "ton80_1", key2: "ton80_2", label: "100+" },
  { key1: "ton_plus1", key2: "ton_plus2", label: "140+" },
  { key1: "ton40_1", key2: "ton40_2", label: "170+" },
  { key1: "darts_thrown1", key2: "darts_thrown2", label: "Rzuty" },
];

const formatCheckout = (hits: number, attempts: number): string => {
  if (attempts <= 0) return "0.00% (0/0)";
  return `${((hits / attempts) * 100).toFixed(2)}% (${hits}/${attempts})`;
};

const normalizeName = (name: string): string =>
  (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

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
  const [autoSubmitLoaded, setAutoSubmitLoaded] = useState(false);
  const [savingAutoSubmit, setSavingAutoSubmit] = useState(false);
  const [autoSubmitDirty, setAutoSubmitDirty] = useState(false);
  const [sourcePlatform, setSourcePlatform] = useState<SourcePlatform>("autodarts");
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
  const processedAutoMatchRef = useRef<string | null>(null);

  // Raw preview of fetched Autodarts data
  const [rawPreview, setRawPreview] = useState<AutoPayload | null>(null);
  const [playerAutodartsMap, setPlayerAutodartsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      setLoadingPlayer(false);
      return;
    }
    const fetchPlayerId = async () => {
      setLoadingPlayer(true);
      const { data: me } = await supabase
        .from("players")
        .select("id, auto_submit_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      setMyPlayerId(me?.id ?? null);
      if (me) {
        setAutoSubmitFromExtension((me as any).auto_submit_enabled !== false);
        setAutoSubmitLoaded(true);
      }
      setLoadingPlayer(false);
    };
    fetchPlayerId();
  }, [user]);

  const canSubmitAll = isAdmin || isModerator;

  const upcomingMatches = useMemo(() => matches.filter((m) => {
    if (m.status !== "upcoming") return false;
    if (canSubmitAll) return true;
    if (!myPlayerId) return false;
    return m.player1Id === myPlayerId || m.player2Id === myPlayerId;
  }), [matches, canSubmitAll, myPlayerId]);

  const pendingMatches = useMemo(() => matches.filter((m) => {
    if (m.status !== "pending_approval") return false;
    if (canSubmitAll) return true;
    if (!myPlayerId) return false;
    return m.player1Id === myPlayerId || m.player2Id === myPlayerId;
  }), [matches, canSubmitAll, myPlayerId]);

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  useEffect(() => {
    const playerIds = Array.from(
      new Set(upcomingMatches.flatMap((m) => [m.player1Id, m.player2Id]).filter(Boolean)),
    );

    if (playerIds.length === 0) {
      setPlayerAutodartsMap({});
      return;
    }

    const loadAutoIds = async () => {
      const { data } = await supabase
        .from("players")
        .select("id, autodarts_user_id")
        .in("id", playerIds);

      const map: Record<string, string> = {};
      (data || []).forEach((row) => {
        if (row.id && row.autodarts_user_id) map[row.id] = row.autodarts_user_id;
      });
      setPlayerAutodartsMap(map);
    };

    loadAutoIds();
  }, [upcomingMatches]);

  // Populate form fields from payload exactly as returned by backend
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

  // Swap payload so player1 in payload = player1 in match
  const swapPayload = (p: AutoPayload): AutoPayload => ({
    ...p,
    score1: p.score2, score2: p.score1,
    avg1: p.avg2, avg2: p.avg1,
    first_9_avg1: p.first_9_avg2, first_9_avg2: p.first_9_avg1,
    
    one_eighties1: p.one_eighties2, one_eighties2: p.one_eighties1,
    high_checkout1: p.high_checkout2, high_checkout2: p.high_checkout1,
    ton60_1: p.ton60_2, ton60_2: p.ton60_1,
    ton80_1: p.ton80_2, ton80_2: p.ton80_1,
    ton_plus1: p.ton_plus2, ton_plus2: p.ton_plus1,
    ton40_1: p.ton40_2, ton40_2: p.ton40_1,
    darts_thrown1: p.darts_thrown2, darts_thrown2: p.darts_thrown1,
    checkout_attempts1: p.checkout_attempts2, checkout_attempts2: p.checkout_attempts1,
    checkout_hits1: p.checkout_hits2, checkout_hits2: p.checkout_hits1,
    player1_name: p.player2_name, player2_name: p.player1_name,
    player1_autodarts_id: p.player2_autodarts_id, player2_autodarts_id: p.player1_autodarts_id,
  });

  // Check if payload has meaningful stats (not just score)
  const hasStats = (p: AutoPayload): boolean => {
    return !!(p.avg1 || p.avg2 || p.darts_thrown1 || p.darts_thrown2 || 
              p.first_9_avg1 || p.first_9_avg2 || p.one_eighties1 || p.one_eighties2 ||
              p.high_checkout1 || p.high_checkout2);
  };

  // Fetch full stats from edge function when extension payload lacks stats
  const fetchFullStats = useCallback(async (matchId: string, adToken: string | null): Promise<AutoPayload | null> => {
    try {
      const body: Record<string, any> = { autodarts_link: `https://play.autodarts.io/history/matches/${matchId}` };
      if (adToken) body.autodarts_token = adToken;

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "fetch-autodarts-match",
        { body },
      );

      if (fnError || !fnData?.success) {
        console.log("[eDART] Failed to fetch full stats:", fnError?.message || fnData?.error);
        return null;
      }
      return fnData.data;
    } catch (err) {
      console.error("[eDART] Error fetching full stats:", err);
      return null;
    }
  }, []);

   const applyAutoPayload = useCallback(
    async (payload: AutoPayload, allowAutoSubmit: boolean): Promise<boolean> => {
      if (!payload) return false;

      // If payload has autodarts link/match_id but no stats, fetch full stats from server
      const autodartsMatchId = payload.match_id || payload.autodarts_link?.match(/matches\/([a-f0-9-]+)/i)?.[1];
      let enrichedPayload = payload;
      
      if (autodartsMatchId && !hasStats(payload)) {
        console.log("[eDART] Extension payload lacks stats, fetching full stats for:", autodartsMatchId);
        const fullStats = await fetchFullStats(autodartsMatchId, extensionToken);
        if (fullStats && hasStats(fullStats)) {
          // Preserve player names/IDs from original payload, use stats from full fetch
          enrichedPayload = { ...fullStats, 
            player1_name: fullStats.player1_name || payload.player1_name,
            player2_name: fullStats.player2_name || payload.player2_name,
            player1_autodarts_id: fullStats.player1_autodarts_id || payload.player1_autodarts_id,
            player2_autodarts_id: fullStats.player2_autodarts_id || payload.player2_autodarts_id,
          };
          console.log("[eDART] Full stats fetched successfully");
        }
      }

      const extMatchId =
        enrichedPayload.match_id || enrichedPayload.autodarts_link || `${enrichedPayload.player1_name}-${enrichedPayload.player2_name}`;
      if (allowAutoSubmit && processedAutoMatchRef.current === extMatchId) return;

      const p1Raw = (enrichedPayload.player1_name || "").trim();
      const p2Raw = (enrichedPayload.player2_name || "").trim();
      const p1 = normalizeName(p1Raw);
      const p2 = normalizeName(p2Raw);

      // Match to upcoming league matches (by autodarts ID first, then name fallback)
      const payloadP1Auto = (enrichedPayload.player1_autodarts_id as string | undefined) || null;
      const payloadP2Auto = (enrichedPayload.player2_autodarts_id as string | undefined) || null;

      const matchedUpcoming = upcomingMatches.find((m) => {
        // Try matching by autodarts user ID first (most reliable)
        const m1Auto = playerAutodartsMap[m.player1Id] || null;
        const m2Auto = playerAutodartsMap[m.player2Id] || null;
        if (m1Auto && m2Auto && payloadP1Auto && payloadP2Auto) {
          if ((m1Auto === payloadP1Auto && m2Auto === payloadP2Auto) ||
              (m1Auto === payloadP2Auto && m2Auto === payloadP1Auto)) return true;
        }
        // Fallback to name matching
        const m1 = normalizeName(m.player1Name);
        const m2 = normalizeName(m.player2Name);
        return (m1 === p1 && m2 === p2) || (m1 === p2 && m2 === p1);
      });

      // For FORM mapping, use selected match first if user chose one
      const targetMatch = selectedMatch ?? matchedUpcoming ?? null;

      if (!matchedUpcoming && allowAutoSubmit) {
        console.log("Auto-submit skipped: no matching league match for", p1Raw, "vs", p2Raw);
        return false;
      }

      if (targetMatch) {
        setSelectedMatchId(targetMatch.id);
      }

      // Robust swap detection + participant validation
      let finalPayload = enrichedPayload;
      if (targetMatch) {
        const m1 = normalizeName(targetMatch.player1Name);
        const m2 = normalizeName(targetMatch.player2Name);

        const targetP1Auto = playerAutodartsMap[targetMatch.player1Id] || null;
        const targetP2Auto = playerAutodartsMap[targetMatch.player2Id] || null;
        const payloadP1Auto = (enrichedPayload.player1_autodarts_id as string | undefined) || null;
        const payloadP2Auto = (enrichedPayload.player2_autodarts_id as string | undefined) || null;

        const sameByName = m1 === p1 && m2 === p2;
        const reversedByName = m1 === p2 && m2 === p1;

        let sameById = false;
        let reversedById = false;
        // Full 4-way ID match
        if (targetP1Auto && targetP2Auto && payloadP1Auto && payloadP2Auto) {
          sameById = targetP1Auto === payloadP1Auto && targetP2Auto === payloadP2Auto;
          reversedById = targetP1Auto === payloadP2Auto && targetP2Auto === payloadP1Auto;
        }

        // Partial ID match: at least one player matches by autodarts ID
        let partialSame = false;
        let partialReversed = false;
        if (!sameById && !reversedById) {
          if (targetP1Auto && payloadP1Auto && targetP1Auto === payloadP1Auto) partialSame = true;
          if (targetP2Auto && payloadP2Auto && targetP2Auto === payloadP2Auto) partialSame = true;
          if (targetP1Auto && payloadP2Auto && targetP1Auto === payloadP2Auto) partialReversed = true;
          if (targetP2Auto && payloadP1Auto && targetP2Auto === payloadP1Auto) partialReversed = true;
        }

        // Also check partial name match (contains)
        const p1MatchesM1 = m1 === p1 || (p1.length > 2 && (m1.includes(p1) || p1.includes(m1)));
        const p2MatchesM2 = m2 === p2 || (p2.length > 2 && (m2.includes(p2) || p2.includes(m2)));
        const p1MatchesM2 = m2 === p1 || (p1.length > 2 && (m2.includes(p1) || p1.includes(m2)));
        const p2MatchesM1 = m1 === p2 || (p2.length > 2 && (m1.includes(p2) || p2.includes(m1)));
        const partialNameSame = p1MatchesM1 && p2MatchesM2;
        const partialNameReversed = p1MatchesM2 && p2MatchesM1 && !partialNameSame;

        const participantMatch = sameById || reversedById || sameByName || reversedByName 
          || partialSame || partialReversed || partialNameSame || partialNameReversed;
        
        if (!participantMatch && allowAutoSubmit) {
          console.log("Auto-submit skipped: participant mismatch", { m1, m2, p1, p2, targetP1Auto, targetP2Auto, payloadP1Auto, payloadP2Auto });
          return false;
        }
        // For manual fetch, skip strict validation — user chose the match

        const shouldSwap = reversedById || partialReversed 
          || (!sameById && !partialSame && (reversedByName || partialNameReversed) && !sameByName && !partialNameSame);
        if (shouldSwap) {
          finalPayload = swapPayload(enrichedPayload);
        }
      }

      populateForm(finalPayload);

      if (allowAutoSubmit && autoSubmitFromExtension && matchedUpcoming) {
        const scoreA = readScore(finalPayload.score1);
        const scoreB = readScore(finalPayload.score2);
        const data: MatchResultData = {
          score1: scoreA,
          score2: scoreB,
          avg1: finalPayload.avg1 ?? undefined,
          avg2: finalPayload.avg2 ?? undefined,
          oneEighties1: asNumber(finalPayload.one_eighties1),
          oneEighties2: asNumber(finalPayload.one_eighties2),
          highCheckout1: asNumber(finalPayload.high_checkout1),
          highCheckout2: asNumber(finalPayload.high_checkout2),
          ton60_1: asNumber(finalPayload.ton60_1),
          ton60_2: asNumber(finalPayload.ton60_2),
          ton80_1: asNumber(finalPayload.ton80_1),
          ton80_2: asNumber(finalPayload.ton80_2),
          tonPlus1: asNumber(finalPayload.ton_plus1),
          tonPlus2: asNumber(finalPayload.ton_plus2),
          ton40_1: asNumber(finalPayload.ton40_1),
          ton40_2: asNumber(finalPayload.ton40_2),
          dartsThrown1: asNumber(finalPayload.darts_thrown1),
          dartsThrown2: asNumber(finalPayload.darts_thrown2),
          checkoutAttempts1: asNumber(finalPayload.checkout_attempts1),
          checkoutAttempts2: asNumber(finalPayload.checkout_attempts2),
          checkoutHits1: asNumber(finalPayload.checkout_hits1),
          checkoutHits2: asNumber(finalPayload.checkout_hits2),
          first9Avg1: finalPayload.first_9_avg1 ?? undefined,
          first9Avg2: finalPayload.first_9_avg2 ?? undefined,
          autodartsLink: finalPayload.autodarts_link || undefined,
        };
        submitMatchResult(matchedUpcoming.id, data);
        processedAutoMatchRef.current = extMatchId;
        toast({
          title: "✅ Auto-zgłoszenie",
          description: `Wynik ${finalPayload.player1_name} vs ${finalPayload.player2_name} został wysłany automatycznie.`,
        });
      }
      return true;
    },
    [autoSubmitFromExtension, extensionToken, fetchFullStats, playerAutodartsMap, populateForm, selectedMatch, submitMatchResult, toast, upcomingMatches],
  );

  const requestExtensionData = useCallback(() => {
    window.postMessage({ type: "EDART_REQUEST_TOKEN" }, window.location.origin);
    window.postMessage({ type: "EDART_REQUEST_LAST_MATCH" }, window.location.origin);
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Only accept messages from our own origin (includes extension content scripts)
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "EDART_EXTENSION_INSTALLED") setExtensionInstalled(true);
      if (event.data?.type === "EDART_TOKEN_RESPONSE") {
        setExtensionInstalled(true);
        setExtensionToken(event.data.token || null);
        setTokenFresh(Boolean(event.data.fresh));
      }
      // Only apply extension match data when Autodarts platform is selected
      if (
        sourcePlatform === "autodarts" &&
        (event.data?.type === "EDART_LAST_MATCH_RESPONSE" ||
          event.data?.type === "EDART_LAST_MATCH_PUSH") &&
        event.data.payload
      ) {
        setExtensionInstalled(true);
        applyAutoPayload(event.data.payload, true);
      }
    };

    window.addEventListener("message", handler);
    // Only request extension match data for Autodarts platform
    if (sourcePlatform === "autodarts") {
      requestExtensionData();
    } else {
      // Still check for extension presence (token only)
      window.postMessage({ type: "EDART_REQUEST_TOKEN" }, window.location.origin);
    }
    const interval = sourcePlatform === "autodarts"
      ? window.setInterval(requestExtensionData, 8000)
      : undefined;
    return () => {
      window.removeEventListener("message", handler);
      if (interval) window.clearInterval(interval);
    };
  }, [applyAutoPayload, requestExtensionData, sourcePlatform]);

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
          title: "Błąd pobierania danych",
          description: (fnData?.error || fnError?.message || "Nie udało się pobrać danych") +
            "\n\n⚠️ Prawdopodobnie wygasł token Autodarts. Odśwież stronę play.autodarts.io i spróbuj ponownie.",
          variant: "destructive",
        });
        setFetchingAutodarts(false);
        return;
      }

      const applied = await applyAutoPayload(fnData.data, false);
      if (applied) {
        toast({
          title: "✅ Pobrano!",
          description: `Statystyki: ${fnData.data.player1_name} vs ${fnData.data.player2_name}`,
        });
      } else {
        toast({
          title: "⚠️ Pobrano dane",
          description: "Nie udało się dopasować graczy do wybranego meczu. Statystyki zostały pobrane, ale mogą wymagać ręcznego przypisania.",
        });
        // Still populate form even if matching failed
        populateForm(fnData.data);
      }
    } catch {
      toast({
        title: "Błąd połączenia",
        description: "Nie udało się połączyć z Autodarts. Prawdopodobnie wygasł token — odśwież stronę play.autodarts.io i spróbuj ponownie.",
        variant: "destructive",
      });
    }

    setFetchingAutodarts(false);
  }, [autodartsLink, getAutodartsToken, toast, applyAutoPayload, populateForm]);

  const resetForm = () => {
    setSelectedMatchId("");
    setScore1("");
    setScore2("");
    setAutodartsLink("");
    setStats({});
    setShowAdvanced(false);
    setRawPreview(null);
    setScreenshotUrls([]);
  };

  const handleScreenshotStats = (extractedStats: Record<string, any>) => {
    if (extractedStats.screenshot_urls) {
      setScreenshotUrls(extractedStats.screenshot_urls);
    }
    
    const payload: AutoPayload = {
      player1_name: extractedStats.player1_name || "",
      player2_name: extractedStats.player2_name || "",
      score1: extractedStats.score1 ?? 0,
      score2: extractedStats.score2 ?? 0,
      avg1: extractedStats.avg1 ?? null,
      avg2: extractedStats.avg2 ?? null,
      first_9_avg1: extractedStats.first_9_avg1 ?? null,
      first_9_avg2: extractedStats.first_9_avg2 ?? null,
      one_eighties1: extractedStats.one_eighties1 ?? 0,
      one_eighties2: extractedStats.one_eighties2 ?? 0,
      high_checkout1: extractedStats.high_checkout1 ?? 0,
      high_checkout2: extractedStats.high_checkout2 ?? 0,
      checkout_attempts1: extractedStats.checkout_attempts1 ?? 0,
      checkout_attempts2: extractedStats.checkout_attempts2 ?? 0,
      checkout_hits1: extractedStats.checkout_hits1 ?? 0,
      checkout_hits2: extractedStats.checkout_hits2 ?? 0,
      darts_thrown1: extractedStats.darts_thrown1 ?? 0,
      darts_thrown2: extractedStats.darts_thrown2 ?? 0,
      ton60_1: extractedStats.ton60_1 ?? 0,
      ton60_2: extractedStats.ton60_2 ?? 0,
      ton80_1: extractedStats.ton80_1 ?? 0,
      ton80_2: extractedStats.ton80_2 ?? 0,
      ton_plus1: extractedStats.ton_plus1 ?? 0,
      ton_plus2: extractedStats.ton_plus2 ?? 0,
    };

    // AI already maps players to match context if match_context was provided
    // If matched_to_context is true, stats are already in correct order
    if (extractedStats.matched_to_context === true) {
      // AI mapped correctly — show info about mapping
      const screenP1 = extractedStats.screenshot_player1_name || "?";
      const screenP2 = extractedStats.screenshot_player2_name || "?";
      if (selectedMatch) {
        toast({
          title: "🔄 Gracze dopasowani",
          description: `Screenshot: ${screenP1} vs ${screenP2} → Formularz: ${selectedMatch.player1Name} (P1) vs ${selectedMatch.player2Name} (P2)`,
        });
      }
      populateForm(payload);
      return;
    }

    // Fallback: try client-side name matching if AI didn't match
    if (selectedMatch) {
      const p1 = normalizeName(payload.player1_name);
      const p2 = normalizeName(payload.player2_name);
      const m1 = normalizeName(selectedMatch.player1Name);
      const m2 = normalizeName(selectedMatch.player2Name);
      
      // Check for exact match, partial match (one name contains the other), or fuzzy
      const p1MatchesM1 = m1 === p1 || m1.includes(p1) || p1.includes(m1);
      const p2MatchesM2 = m2 === p2 || m2.includes(p2) || p2.includes(m2);
      const p1MatchesM2 = m2 === p1 || m2.includes(p1) || p1.includes(m2);
      const p2MatchesM1 = m1 === p2 || m1.includes(p2) || p2.includes(m1);
      
      const reversed = p1MatchesM2 && p2MatchesM1 && !p1MatchesM1;
      if (reversed) {
        toast({
          title: "🔄 Zamieniono kolejność",
          description: `Statystyki dopasowane do formularza: ${selectedMatch.player1Name} (P1) vs ${selectedMatch.player2Name} (P2)`,
        });
        populateForm(swapPayload(payload));
        return;
      }
    }

    populateForm(payload);
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
      autodartsLink: autodartsLink || undefined,
      screenshotUrls: screenshotUrls.length > 0 ? screenshotUrls : undefined,
      sourcePlatform,
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
    <div>
      <PageHeader title="Dodaj Wynik" subtitle={`Zalogowany jako ${profile?.name || user.email}${canSubmitAll ? " (Admin/Moderator)" : ""}`} />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
      <p className="text-xs text-accent font-body mb-4">
        ⚠️ Zgłoszone wyniki wymagają zatwierdzenia przez admina lub moderatora.
      </p>

      {/* Platform selector */}
      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground mb-3 block">
          Platforma
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(["autodarts", "dartcounter", "dartsmind"] as SourcePlatform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSourcePlatform(p)}
              className={`rounded-lg border p-3 text-center text-sm font-display transition-all ${
                sourcePlatform === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/30 text-muted-foreground"
              }`}
            >
              {p === "autodarts" ? "🎯 Autodarts" : p === "dartcounter" ? "📱 DartCounter" : "🧠 DartsMind"}
            </button>
          ))}
        </div>
      </div>

      {/* Extension status - only for Autodarts */}
      {sourcePlatform === "autodarts" && (
        <>
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

        </>
      )}

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

                    {/* Checkout % row */}
                    <div className="contents">
                      <div className="text-foreground font-display text-xs">
                        {formatCheckout(asNumber(rawPreview.checkout_hits1), asNumber(rawPreview.checkout_attempts1))}
                      </div>
                      <div className="text-muted-foreground text-[10px]">Checkout %</div>
                      <div className="text-foreground font-display text-xs">
                        {formatCheckout(asNumber(rawPreview.checkout_hits2), asNumber(rawPreview.checkout_attempts2))}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center">
                    Dane z {sourcePlatform === "autodarts" ? "Autodarts" : sourcePlatform === "dartcounter" ? "DartCounter" : "DartsMind"} uzupełniły formularz poniżej.
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


              {/* Screenshot upload for DartCounter/DartsMind */}
              {(sourcePlatform === "dartcounter" || sourcePlatform === "dartsmind") && (
                <ScreenshotUpload
                  onStatsExtracted={handleScreenshotStats}
                  matchId={selectedMatchId}
                  matchContext={selectedMatch ? {
                    player1_name: selectedMatch.player1Name,
                    player2_name: selectedMatch.player2Name,
                  } : undefined}
                />
              )}

              {/* Autodarts link - only for Autodarts */}
              {sourcePlatform === "autodarts" && (
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
              )}

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
    </div>
  );
};

export default SubmitMatchPage;
