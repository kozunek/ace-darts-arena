import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateLeagueStandings } from "@/lib/leagueRanking";
import { advanceBracketWinner } from "@/lib/bracketAdvancement";
import { translateError } from "@/lib/translateError";
import {
  Player, Match, League, PlayerLeagueStats, Achievement,
  achievements, BonusRules, DEFAULT_BONUS_RULES, LeaguePlatform,
} from "@/data/mockData";

interface LeagueContextType {
  players: Player[];
  matches: Match[];
  leagues: League[];
  activeLeagueId: string;
  setActiveLeagueId: (id: string) => void;
  getLeagueMatches: (leagueId: string) => Match[];
  getPlayerLeagueStats: (playerId: string, leagueId: string) => PlayerLeagueStats;
  getPlayerAllLeagueStats: (playerId: string) => { league: League; stats: PlayerLeagueStats }[];
  getPlayerAchievements: (playerId: string, leagueId: string) => Achievement[];
  getPlayerGlobalAchievements: (playerId: string) => Achievement[];
  getLeagueStandings: (leagueId: string) => (Player & { stats: PlayerLeagueStats })[];
  submitMatchResult: (matchId: string, data: MatchResultData) => void;
  updateMatchResult: (matchId: string, data: MatchResultData) => Promise<void>;
  approveMatch: (matchId: string) => void;
  rejectMatch: (matchId: string) => void;
  addMatch: (leagueId: string, player1Id: string, player2Id: string, date: string, round?: number) => void;
  approvePlayer: (playerId: string) => void;
  pendingPlayers: Player[];
  addPendingPlayer: (name: string) => void;
  addPlayer: (name: string) => void;
  addLeague: (league: Omit<League, "id">) => Promise<{ data: any; error: any }>;
  updateLeague: (id: string, data: Partial<League>) => void;
  deleteLeague: (id: string) => void;
  updatePlayer: (id: string, data: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  assignPlayerToLeague: (playerId: string, leagueId: string) => void;
  removePlayerFromLeague: (playerId: string, leagueId: string) => void;
  deleteMatch: (matchId: string) => void;
  getGlobalTonStats: () => TonLeaderEntry[];
  getLeagueTonStats: (leagueId: string) => TonLeaderEntry[];
  getPendingApprovalMatches: () => Match[];
  joinLeague: (leagueId: string) => Promise<{ error: string | null }>;
  leaveLeague: (leagueId: string) => Promise<void>;
  loading: boolean;
  refreshData: () => void;
}

export interface MatchResultData {
  score1: number;
  score2: number;
  avg1?: number;
  avg2?: number;
  oneEighties1?: number;
  oneEighties2?: number;
  highCheckout1?: number;
  highCheckout2?: number;
  ton60_1?: number;
  ton60_2?: number;
  ton80_1?: number;
  ton80_2?: number;
  tonPlus1?: number;
  tonPlus2?: number;
  ton40_1?: number;
  ton40_2?: number;
  dartsThrown1?: number;
  dartsThrown2?: number;
  checkoutAttempts1?: number;
  checkoutAttempts2?: number;
  checkoutHits1?: number;
  checkoutHits2?: number;
  first9Avg1?: number;
  first9Avg2?: number;
  nineDarters1?: number;
  nineDarters2?: number;
  autodartsLink?: string;
  screenshotUrls?: string[];
  sourcePlatform?: string;
}

export interface TonLeaderEntry {
  playerId: string;
  playerName: string;
  avatar: string;
  avatarUrl?: string | null;
  ton60: number;
  ton80: number;
  tonPlus: number;
  ton40: number;
  oneEighties: number;
  totalTons: number;
  highestCheckout: number;
  bestAvg: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  winRate: number;
  checkoutAttempts: number;
  checkoutHits: number;
  checkoutRate: number;
}

const LeagueContext = createContext<LeagueContextType | null>(null);

const TBD_PLAYER_ID = "00000000-0000-0000-0000-000000000000";

const mapDbMatch = (m: any, players: Player[]): Match => {
  const p1 = players.find(p => p.id === m.player1_id);
  const p2 = players.find(p => p.id === m.player2_id);
  const p1Name = m.player1_id === TBD_PLAYER_ID ? "TBD" : (p1?.name || "?");
  const p2Name = m.player2_id === TBD_PLAYER_ID ? "TBD" : (p2?.name || "?");
  return {
    id: m.id,
    leagueId: m.league_id,
    player1Id: m.player1_id,
    player2Id: m.player2_id,
    player1Name: p1Name,
    player2Name: p2Name,
    score1: m.score1,
    score2: m.score2,
    legsWon1: m.legs_won1,
    legsWon2: m.legs_won2,
    status: m.status as Match["status"],
    date: m.date,
    round: m.round,
    autodartsLink: m.autodarts_link,
    avg1: m.avg1 ? Number(m.avg1) : undefined,
    avg2: m.avg2 ? Number(m.avg2) : undefined,
    oneEighties1: m.one_eighties1,
    oneEighties2: m.one_eighties2,
    highCheckout1: m.high_checkout1,
    highCheckout2: m.high_checkout2,
    ton60_1: m.ton60_1,
    ton60_2: m.ton60_2,
    ton80_1: m.ton80_1,
    ton80_2: m.ton80_2,
    tonPlus1: m.ton_plus1,
    tonPlus2: m.ton_plus2,
    ton40_1: m.ton40_1,
    ton40_2: m.ton40_2,
    dartsThrown1: m.darts_thrown1,
    dartsThrown2: m.darts_thrown2,
    checkoutAttempts1: m.checkout_attempts1,
    checkoutAttempts2: m.checkout_attempts2,
    checkoutHits1: m.checkout_hits1,
    checkoutHits2: m.checkout_hits2,
    bracketRound: m.bracket_round,
    bracketPosition: m.bracket_position,
    groupName: m.group_name,
    first9Avg1: m.first_9_avg1 ? Number(m.first_9_avg1) : undefined,
    first9Avg2: m.first_9_avg2 ? Number(m.first_9_avg2) : undefined,
    confirmedDate: m.confirmed_date ?? null,
    screenshotUrls: m.screenshot_urls ?? [],
    sourcePlatform: m.source_platform ?? 'autodarts',
  };
};

// ─── BONUS POINTS SYSTEM (configurable per league) ───

const calcMatchBonusPoints = (
  isP1: boolean,
  m: Match,
  myScore: number,
  oppScore: number,
  isWinner: boolean,
  rules: BonusRules
): number => {
  let bonus = 0;
  const my180 = isP1 ? (m.oneEighties1 ?? 0) : (m.oneEighties2 ?? 0);
  const myHC = isP1 ? (m.highCheckout1 ?? 0) : (m.highCheckout2 ?? 0);
  const myAvg = isP1 ? (m.avg1 ?? 0) : (m.avg2 ?? 0);

  bonus += my180 * rules.per180;
  if (myHC >= 100) bonus += rules.checkout100;
  if (myHC >= 150) bonus += rules.checkout150;
  if (myAvg >= 90) bonus += rules.avg90;
  if (myAvg >= 100) bonus += rules.avg100;
  if (!isWinner && myScore < oppScore && (oppScore - myScore) === 1) bonus += rules.closeLoss;
  if (isWinner && oppScore === 0) bonus += rules.cleanSweep;

  return bonus;
};

const calcStats = (playerId: string, leagueId: string, matches: Match[], rules: BonusRules = DEFAULT_BONUS_RULES): PlayerLeagueStats => {
  const completed = matches.filter(
    (m) => m.leagueId === leagueId && m.status === "completed" && (m.player1Id === playerId || m.player2Id === playerId)
  );

  let wins = 0, losses = 0, legsWon = 0, legsLost = 0, oneEighties = 0;
  let highestCheckout = 0, bestAvg = 0, totalDarts = 0;
  let ton60 = 0, ton80 = 0, tonPlus = 0, ton40 = 0;
  let checkoutAttempts = 0, checkoutHits = 0;
  let bestFirst9Avg = 0;
  let basePoints = 0, bonusPoints = 0;
  const avgValues: number[] = [];
  const form: ("W" | "L")[] = [];

  completed.forEach((m) => {
    const isP1 = m.player1Id === playerId;
    const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
    const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
    const myLegs = isP1 ? (m.legsWon1 ?? m.score1 ?? 0) : (m.legsWon2 ?? m.score2 ?? 0);
    const oppLegs = isP1 ? (m.legsWon2 ?? m.score2 ?? 0) : (m.legsWon1 ?? m.score1 ?? 0);

    legsWon += myLegs;
    legsLost += oppLegs;
    oneEighties += isP1 ? (m.oneEighties1 ?? 0) : (m.oneEighties2 ?? 0);
    const hc = isP1 ? (m.highCheckout1 ?? 0) : (m.highCheckout2 ?? 0);
    if (hc > highestCheckout) highestCheckout = hc;
    const myAvg = isP1 ? (m.avg1 ?? 0) : (m.avg2 ?? 0);
    if (myAvg > 0) { avgValues.push(myAvg); if (myAvg > bestAvg) bestAvg = myAvg; }
    totalDarts += isP1 ? (m.dartsThrown1 ?? 0) : (m.dartsThrown2 ?? 0);
    ton60 += isP1 ? (m.ton60_1 ?? 0) : (m.ton60_2 ?? 0);
    ton80 += isP1 ? (m.ton80_1 ?? 0) : (m.ton80_2 ?? 0);
    tonPlus += isP1 ? (m.tonPlus1 ?? 0) : (m.tonPlus2 ?? 0);
    ton40 += isP1 ? (m.ton40_1 ?? 0) : (m.ton40_2 ?? 0);
    checkoutAttempts += isP1 ? (m.checkoutAttempts1 ?? 0) : (m.checkoutAttempts2 ?? 0);
    checkoutHits += isP1 ? (m.checkoutHits1 ?? 0) : (m.checkoutHits2 ?? 0);
    const myFirst9 = isP1 ? (m.first9Avg1 ?? 0) : (m.first9Avg2 ?? 0);
    if (myFirst9 > bestFirst9Avg) bestFirst9Avg = myFirst9;

    const isWinner = myScore > oppScore;
    if (isWinner) { wins++; form.push("W"); basePoints += rules.win; }
    else { losses++; form.push("L"); }

    bonusPoints += calcMatchBonusPoints(isP1, m, myScore, oppScore, isWinner, rules);
  });

  const avg = avgValues.length > 0 ? Math.round((avgValues.reduce((a, b) => a + b, 0) / avgValues.length) * 10) / 10 : 0;
  const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;
  const checkoutRate = checkoutAttempts > 0 ? Math.round((checkoutHits / checkoutAttempts) * 100) : 0;

  return {
    playerId, leagueId,
    wins, losses,
    points: basePoints + bonusPoints,
    basePoints,
    bonusPoints,
    legsWon, legsLost, avg,
    highestCheckout, oneEighties,
    form: form,
    badges: [],
    matchesPlayed: completed.length,
    bestAvg: Math.round(bestAvg * 10) / 10,
    totalDartsThrown: totalDarts,
    ton60, ton80, tonPlus, ton40,
    winRate,
    checkoutAttempts,
    checkoutHits,
    checkoutRate,
    bestFirst9Avg: Math.round(bestFirst9Avg * 10) / 10,
  };
};

export const LeagueProvider = ({ children }: { children: ReactNode }) => {
  const [matchList, setMatchList] = useState<Match[]>([]);
  const [playerList, setPlayerList] = useState<Player[]>([]);
  const [leagueList, setLeagueList] = useState<League[]>([]);
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Parallel fetches for speed
    const [leaguesRes, playersRes, plRes, nicksRes] = await Promise.all([
      supabase.from("leagues").select("id,name,season,description,is_active,format,max_legs,league_type,bonus_rules,registration_open,meetings_per_pair,registration_deadline,platform,third_place_match,lucky_loser,max_players,exclusive_platform").order("created_at"),
      supabase.from("players_public" as any).select("id,name,avatar,approved,avatar_url,user_id").order("name"),
      supabase.from("player_leagues").select("player_id,league_id"),
      supabase.from("players").select("id,autodarts_user_id,dartcounter_id,dartsmind_id"),
    ]);
    const leaguesData = leaguesRes.data;
    const leagues: League[] = (leaguesData || []).map((l: any) => ({
      id: l.id, name: l.name, season: l.season, description: l.description,
      is_active: l.is_active, format: l.format, max_legs: l.max_legs,
      league_type: l.league_type || "league",
      bonus_rules: { ...DEFAULT_BONUS_RULES, ...(l.bonus_rules || {}) } as BonusRules,
      registration_open: l.registration_open ?? false,
      meetings_per_pair: l.meetings_per_pair ?? 1,
      registration_deadline: l.registration_deadline ?? null,
      platform: (l as any).platform ?? "autodarts",
      third_place_match: l.third_place_match ?? false,
      lucky_loser: l.lucky_loser ?? false,
      max_players: (l as any).max_players ?? null,
      exclusive_platform: (l as any).exclusive_platform ?? false,
    }));
    setLeagueList(leagues);
    if (leagues.length > 0 && !activeLeagueId) {
      setActiveLeagueId(leagues.find(l => l.is_active)?.id || leagues[0].id);
    }

    const playerLeagues = plRes.data || [];
    const nicksMap = new Map((nicksRes.data || []).map((n: any) => [n.id, n]));

    const allPlayers: Player[] = (playersRes.data || []).map((p: any) => {
      const nicks = nicksMap.get(p.id);
      return {
      id: p.id, name: p.name, avatar: p.avatar, approved: p.approved,
      phone: p.phone ?? null, discord: p.discord ?? null,
      avatar_url: p.avatar_url ?? null,
      user_id: p.user_id ?? null,
      autodarts_user_id: nicks?.autodarts_user_id ?? null,
      dartcounter_id: nicks?.dartcounter_id ?? null,
      dartsmind_id: nicks?.dartsmind_id ?? null,
      leagueIds: playerLeagues.filter((pl: any) => pl.player_id === p.id).map((pl: any) => pl.league_id),
    }});
    const approved = allPlayers.filter(p => p.approved && p.id !== TBD_PLAYER_ID);
    const pending = allPlayers.filter(p => !p.approved);
    setPlayerList(approved);
    setPendingPlayers(pending);

    // Fetch matches for all leagues
    const allLeagueIds = leagues.map(l => l.id);
    let allMatchesData: any[] = [];
    
    // Fetch in batches to avoid hitting row limits
    for (let i = 0; i < allLeagueIds.length; i += 10) {
      const batch = allLeagueIds.slice(i, i + 10);
      const { data } = await supabase.from("matches")
        .select("id,league_id,player1_id,player2_id,score1,score2,legs_won1,legs_won2,status,date,round,autodarts_link,avg1,avg2,one_eighties1,one_eighties2,high_checkout1,high_checkout2,ton60_1,ton60_2,ton80_1,ton80_2,ton_plus1,ton_plus2,ton40_1,ton40_2,darts_thrown1,darts_thrown2,checkout_attempts1,checkout_attempts2,checkout_hits1,checkout_hits2,bracket_round,bracket_position,group_name,first_9_avg1,first_9_avg2,confirmed_date,screenshot_urls,source_platform,is_walkover,nine_darters1,nine_darters2,avg_until_170_1,avg_until_170_2")
        .in("league_id", batch)
        .order("date", { ascending: false })
        .limit(1000);
      if (data) allMatchesData = allMatchesData.concat(data);
    }
    
    const matchesData = allMatchesData;
    setMatchList((matchesData || []).map((m: any) => mapDbMatch(m, allPlayers)));

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, []);

  // Debounced realtime subscription — avoid excessive refetches at scale
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => fetchData(), 2000);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const refreshData = useCallback(() => { fetchData(); }, [fetchData]);

  const getLeagueMatches = useCallback((leagueId: string) => matchList.filter((m) => m.leagueId === leagueId), [matchList]);

  const getLeagueRules = useCallback((leagueId: string): BonusRules => {
    const league = leagueList.find(l => l.id === leagueId);
    return league?.bonus_rules ?? DEFAULT_BONUS_RULES;
  }, [leagueList]);

  const getPlayerLeagueStats = useCallback((playerId: string, leagueId: string) => calcStats(playerId, leagueId, matchList, getLeagueRules(leagueId)), [matchList, getLeagueRules]);

  const getPlayerAllLeagueStats = useCallback((playerId: string) => {
    return leagueList.filter(l => {
      return matchList.some(m => m.leagueId === l.id && (m.player1Id === playerId || m.player2Id === playerId));
    }).map(league => ({ league, stats: calcStats(playerId, league.id, matchList, league.bonus_rules) }));
  }, [matchList, leagueList]);

  const getPlayerAchievements = useCallback((playerId: string, leagueId: string) => {
    const stats = calcStats(playerId, leagueId, matchList, getLeagueRules(leagueId));
    return achievements.filter((a) => a.condition(stats));
  }, [matchList, getLeagueRules]);

  // Global achievements - computed across ALL leagues
  const calcGlobalStats = useCallback((playerId: string): PlayerLeagueStats => {
    const completed = matchList.filter(
      (m) => m.status === "completed" && (m.player1Id === playerId || m.player2Id === playerId)
    );
    let wins = 0, losses = 0, legsWon = 0, legsLost = 0, oneEighties = 0;
    let highestCheckout = 0, bestAvg = 0, totalDarts = 0;
    let ton60 = 0, ton80 = 0, tonPlus = 0, ton40 = 0;
    let checkoutAttempts = 0, checkoutHits = 0;
    let bestFirst9Avg = 0;
    const avgValues: number[] = [];
    const form: ("W" | "L")[] = [];

    completed.forEach((m) => {
      const isP1 = m.player1Id === playerId;
      const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
      const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
      const myLegs = isP1 ? (m.legsWon1 ?? m.score1 ?? 0) : (m.legsWon2 ?? m.score2 ?? 0);
      const oppLegs = isP1 ? (m.legsWon2 ?? m.score2 ?? 0) : (m.legsWon1 ?? m.score1 ?? 0);
      legsWon += myLegs; legsLost += oppLegs;
      oneEighties += isP1 ? (m.oneEighties1 ?? 0) : (m.oneEighties2 ?? 0);
      const hc = isP1 ? (m.highCheckout1 ?? 0) : (m.highCheckout2 ?? 0);
      if (hc > highestCheckout) highestCheckout = hc;
      const myAvg = isP1 ? (m.avg1 ?? 0) : (m.avg2 ?? 0);
      if (myAvg > 0) { avgValues.push(myAvg); if (myAvg > bestAvg) bestAvg = myAvg; }
      totalDarts += isP1 ? (m.dartsThrown1 ?? 0) : (m.dartsThrown2 ?? 0);
      ton60 += isP1 ? (m.ton60_1 ?? 0) : (m.ton60_2 ?? 0);
      ton80 += isP1 ? (m.ton80_1 ?? 0) : (m.ton80_2 ?? 0);
      tonPlus += isP1 ? (m.tonPlus1 ?? 0) : (m.tonPlus2 ?? 0);
      ton40 += isP1 ? (m.ton40_1 ?? 0) : (m.ton40_2 ?? 0);
      checkoutAttempts += isP1 ? (m.checkoutAttempts1 ?? 0) : (m.checkoutAttempts2 ?? 0);
      checkoutHits += isP1 ? (m.checkoutHits1 ?? 0) : (m.checkoutHits2 ?? 0);
      const myFirst9 = isP1 ? (m.first9Avg1 ?? 0) : (m.first9Avg2 ?? 0);
      if (myFirst9 > bestFirst9Avg) bestFirst9Avg = myFirst9;
      if (myScore > oppScore) { wins++; form.push("W"); } else { losses++; form.push("L"); }
    });

    const avg = avgValues.length > 0 ? Math.round((avgValues.reduce((a, b) => a + b, 0) / avgValues.length) * 10) / 10 : 0;
    const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;
    const checkoutRate = checkoutAttempts > 0 ? Math.round((checkoutHits / checkoutAttempts) * 100) : 0;

    return {
      playerId, leagueId: "global",
      wins, losses, points: 0, basePoints: 0, bonusPoints: 0,
      legsWon, legsLost, avg, highestCheckout, oneEighties,
      form, badges: [], matchesPlayed: completed.length,
      bestAvg: Math.round(bestAvg * 10) / 10, totalDartsThrown: totalDarts,
      ton60, ton80, tonPlus, ton40, winRate,
      checkoutAttempts, checkoutHits, checkoutRate,
      bestFirst9Avg: Math.round(bestFirst9Avg * 10) / 10,
    };
  }, [matchList]);

  const getPlayerGlobalAchievements = useCallback((playerId: string) => {
    const globalStats = calcGlobalStats(playerId);
    return achievements.filter((a) => a.condition(globalStats));
  }, [calcGlobalStats]);

  const getLeagueStandings = useCallback((leagueId: string) => {
    const rules = getLeagueRules(leagueId);
    const leaguePlayers = playerList.filter((p) => p.approved && p.id !== TBD_PLAYER_ID && matchList.some(
      (m) => m.leagueId === leagueId && (m.player1Id === p.id || m.player2Id === p.id)
    ));
    const entries = leaguePlayers.map((p) => ({ ...p, stats: calcStats(p.id, leagueId, matchList, rules) }));
    return calculateLeagueStandings(entries, matchList, leagueId);
  }, [matchList, playerList, getLeagueRules]);

  const submitMatchResult = useCallback(async (matchId: string, data: MatchResultData) => {
    await supabase.from("matches").update({
      score1: data.score1, score2: data.score2,
      legs_won1: data.score1, legs_won2: data.score2,
      status: "pending_approval",
      is_walkover: false,
      avg1: data.avg1, avg2: data.avg2,
      one_eighties1: data.oneEighties1 ?? 0, one_eighties2: data.oneEighties2 ?? 0,
      high_checkout1: data.highCheckout1 ?? 0, high_checkout2: data.highCheckout2 ?? 0,
      ton40_1: data.ton40_1 ?? 0, ton40_2: data.ton40_2 ?? 0,
      ton60_1: data.ton60_1 ?? 0, ton60_2: data.ton60_2 ?? 0,
      ton80_1: data.ton80_1 ?? 0, ton80_2: data.ton80_2 ?? 0,
      ton_plus1: data.tonPlus1 ?? 0, ton_plus2: data.tonPlus2 ?? 0,
      darts_thrown1: data.dartsThrown1 ?? 0, darts_thrown2: data.dartsThrown2 ?? 0,
      checkout_attempts1: data.checkoutAttempts1 ?? 0,
      checkout_attempts2: data.checkoutAttempts2 ?? 0,
      checkout_hits1: data.checkoutHits1 ?? 0,
      checkout_hits2: data.checkoutHits2 ?? 0,
      first_9_avg1: data.first9Avg1 ?? null,
      first_9_avg2: data.first9Avg2 ?? null,
      nine_darters1: data.nineDarters1 ?? 0,
      nine_darters2: data.nineDarters2 ?? 0,
      autodarts_link: data.autodartsLink,
      screenshot_urls: data.screenshotUrls ?? [],
      source_platform: data.sourcePlatform ?? 'autodarts',
    } as any).eq("id", matchId);

    setMatchList((prev) =>
      prev.map((m) =>
        m.id === matchId ? {
          ...m,
          ...data,
          legsWon1: data.score1,
          legsWon2: data.score2,
          status: "pending_approval" as const,
        } : m
      )
    );

    // Discord webhook — match pending
    try {
      const match = matchList.find(m => m.id === matchId);
      if (match) {
        const league = leagueList.find(l => l.id === match.leagueId);
        await supabase.functions.invoke("discord-webhook", {
          body: {
            action: "send_match_pending",
            player1_name: match.player1Name,
            player2_name: match.player2Name,
            score1: data.score1,
            score2: data.score2,
            league_name: league?.name || "Liga",
            league_id: match.leagueId,
          },
        });
      }
    } catch (e) { console.error("Discord webhook error:", e); }
  }, [matchList, leagueList]);

  const updateMatchResult = useCallback(async (matchId: string, data: MatchResultData) => {
    await supabase.from("matches").update({
      score1: data.score1, score2: data.score2,
      legs_won1: data.score1, legs_won2: data.score2,
      is_walkover: false,
      avg1: data.avg1, avg2: data.avg2,
      one_eighties1: data.oneEighties1 ?? 0, one_eighties2: data.oneEighties2 ?? 0,
      high_checkout1: data.highCheckout1 ?? 0, high_checkout2: data.highCheckout2 ?? 0,
      ton60_1: data.ton60_1 ?? 0, ton60_2: data.ton60_2 ?? 0,
      ton80_1: data.ton80_1 ?? 0, ton80_2: data.ton80_2 ?? 0,
      ton_plus1: data.tonPlus1 ?? 0, ton_plus2: data.tonPlus2 ?? 0,
      ton40_1: data.ton40_1 ?? 0, ton40_2: data.ton40_2 ?? 0,
      darts_thrown1: data.dartsThrown1 ?? 0, darts_thrown2: data.dartsThrown2 ?? 0,
      checkout_attempts1: data.checkoutAttempts1 ?? 0, checkout_attempts2: data.checkoutAttempts2 ?? 0,
      checkout_hits1: data.checkoutHits1 ?? 0, checkout_hits2: data.checkoutHits2 ?? 0,
      first_9_avg1: data.first9Avg1 ?? null, first_9_avg2: data.first9Avg2 ?? null,
      nine_darters1: data.nineDarters1 ?? 0, nine_darters2: data.nineDarters2 ?? 0,
      autodarts_link: data.autodartsLink,
    }).eq("id", matchId);

    setMatchList((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, ...data, legsWon1: data.score1, legsWon2: data.score2 } : m
      )
    );
  }, []);

  const approveMatch = useCallback(async (matchId: string) => {
    const match = matchList.find(m => m.id === matchId);
    await supabase.from("matches").update({ status: "completed", is_walkover: false }).eq("id", matchId);
    // Audit log
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("match_audit_log").insert({
        match_id: matchId,
        user_id: user.id,
        action: "approve",
        old_data: match ? { status: match.status, score1: match.score1, score2: match.score2 } : null,
        new_data: { status: "completed" },
      });
      
      // Send to Discord webhook
      try {
        await supabase.functions.invoke("discord-webhook", {
          body: { action: "send_match_result", match_data: { match_id: matchId } },
        });
      } catch (e) {
        console.error("Discord webhook error:", e);
      }
    }
    // Update local state first so calcGlobalStats works with new data
    const updatedMatches = matchList.map((m) => m.id === matchId ? { ...m, status: "completed" as const } : m);
    setMatchList(updatedMatches);

    // Award global achievements for both players
    if (match) {
      const playerIds = [match.player1Id, match.player2Id].filter(id => id !== TBD_PLAYER_ID);
      for (const pid of playerIds) {
        try {
          // Calc global stats with updated matches
          const completed = updatedMatches.filter(
            (m) => m.status === "completed" && (m.player1Id === pid || m.player2Id === pid)
          );
          let wins = 0, losses = 0, legsWon = 0, legsLost = 0, oneEighties = 0;
          let highestCheckout = 0, bestAvg = 0, totalDarts = 0;
          let ton60 = 0, ton80 = 0, tonPlus = 0, ton40 = 0;
          let checkoutAttempts = 0, checkoutHits = 0, bestFirst9Avg = 0;
          const avgValues: number[] = [];
          completed.forEach((m) => {
            const isP1 = m.player1Id === pid;
            const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
            const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
            legsWon += isP1 ? (m.legsWon1 ?? m.score1 ?? 0) : (m.legsWon2 ?? m.score2 ?? 0);
            legsLost += isP1 ? (m.legsWon2 ?? m.score2 ?? 0) : (m.legsWon1 ?? m.score1 ?? 0);
            oneEighties += isP1 ? (m.oneEighties1 ?? 0) : (m.oneEighties2 ?? 0);
            const hc = isP1 ? (m.highCheckout1 ?? 0) : (m.highCheckout2 ?? 0);
            if (hc > highestCheckout) highestCheckout = hc;
            const myAvg = isP1 ? (m.avg1 ?? 0) : (m.avg2 ?? 0);
            if (myAvg > 0) { avgValues.push(myAvg); if (myAvg > bestAvg) bestAvg = myAvg; }
            totalDarts += isP1 ? (m.dartsThrown1 ?? 0) : (m.dartsThrown2 ?? 0);
            ton60 += isP1 ? (m.ton60_1 ?? 0) : (m.ton60_2 ?? 0);
            ton80 += isP1 ? (m.ton80_1 ?? 0) : (m.ton80_2 ?? 0);
            tonPlus += isP1 ? (m.tonPlus1 ?? 0) : (m.tonPlus2 ?? 0);
            ton40 += isP1 ? (m.ton40_1 ?? 0) : (m.ton40_2 ?? 0);
            checkoutAttempts += isP1 ? (m.checkoutAttempts1 ?? 0) : (m.checkoutAttempts2 ?? 0);
            checkoutHits += isP1 ? (m.checkoutHits1 ?? 0) : (m.checkoutHits2 ?? 0);
            const f9 = isP1 ? (m.first9Avg1 ?? 0) : (m.first9Avg2 ?? 0);
            if (f9 > bestFirst9Avg) bestFirst9Avg = f9;
            if (myScore > oppScore) wins++; else losses++;
          });
          const avg = avgValues.length > 0 ? Math.round((avgValues.reduce((a, b) => a + b, 0) / avgValues.length) * 10) / 10 : 0;
          const globalStats: PlayerLeagueStats = {
            playerId: pid, leagueId: "global", wins, losses, points: 0, basePoints: 0, bonusPoints: 0,
            legsWon, legsLost, avg, highestCheckout, oneEighties,
            form: [], badges: [], matchesPlayed: completed.length,
            bestAvg: Math.round(bestAvg * 10) / 10, totalDartsThrown: totalDarts,
            ton60, ton80, tonPlus, ton40,
            winRate: completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0,
            checkoutAttempts, checkoutHits,
            checkoutRate: checkoutAttempts > 0 ? Math.round((checkoutHits / checkoutAttempts) * 100) : 0,
            bestFirst9Avg: Math.round(bestFirst9Avg * 10) / 10,
          };

          const earned = achievements.filter(a => a.condition(globalStats));
          // Get already-stored achievements
          const { data: existing } = await supabase
            .from("player_achievements" as any)
            .select("achievement_id")
            .eq("player_id", pid);
          const existingIds = new Set((existing || []).map((e: any) => e.achievement_id));
          const newAchievements = earned.filter(a => !existingIds.has(a.id));

          if (newAchievements.length > 0) {
            // Insert new achievements
            await supabase.from("player_achievements" as any).insert(
              newAchievements.map(a => ({ player_id: pid, achievement_id: a.id }))
            );
            // Find player's user_id for notifications
            const player = playerList.find(p => p.id === pid);
            if (player) {
              const { data: playerRow } = await supabase
                .from("players")
                .select("user_id")
                .eq("id", pid)
                .maybeSingle();
              if (playerRow?.user_id) {
                // Create notifications for each new achievement
                await supabase.from("notifications").insert(
                  newAchievements.map(a => ({
                    user_id: playerRow.user_id,
                    title: `${a.icon} Nowe osiągnięcie!`,
                    message: `Zdobyto: ${a.name} — ${a.description}`,
                    type: "achievement",
                    link: "/achievements",
                  }))
                );
              }
            }
          }
        } catch (e) {
          console.error("Achievement awarding error:", e);
        }
      }
    }

    // Auto-advance bracket winner to next round
    if (match?.bracketRound && match.score1 != null && match.score2 != null) {
      const winnerId = (match.score1 ?? 0) > (match.score2 ?? 0) ? match.player1Id : match.player2Id;
      const winnerName = (match.score1 ?? 0) > (match.score2 ?? 0) ? match.player1Name : match.player2Name;
      const loserId = (match.score1 ?? 0) > (match.score2 ?? 0) ? match.player2Id : match.player1Id;
      try {
        const result = await advanceBracketWinner(matchId, match.leagueId, winnerId, winnerName, loserId);
        if (result.advanced) {
          console.log(`[Bracket] Advanced ${winnerName} to next round`);
          setTimeout(() => fetchData(), 500);
        }
      } catch (e) {
        console.error("Bracket advancement error:", e);
      }
    }
  }, [matchList, playerList, fetchData]);

  const rejectMatch = useCallback(async (matchId: string) => {
    const match = matchList.find(m => m.id === matchId);
    // Reset match back to upcoming, clear stats
    await supabase.from("matches").update({
      status: "upcoming",
      score1: null, score2: null, legs_won1: null, legs_won2: null,
      avg1: null, avg2: null,
      one_eighties1: 0, one_eighties2: 0,
      high_checkout1: 0, high_checkout2: 0,
      ton40_1: 0, ton40_2: 0, ton60_1: 0, ton60_2: 0,
      ton80_1: 0, ton80_2: 0, ton_plus1: 0, ton_plus2: 0,
      darts_thrown1: 0, darts_thrown2: 0,
      checkout_attempts1: 0, checkout_attempts2: 0,
      checkout_hits1: 0, checkout_hits2: 0,
      first_9_avg1: null, first_9_avg2: null,
      
      autodarts_link: null,
    }).eq("id", matchId);

    // Audit log
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("match_audit_log").insert({
        match_id: matchId,
        user_id: user.id,
        action: "reject",
        old_data: match ? { status: match.status, score1: match.score1, score2: match.score2 } : null,
        new_data: { status: "upcoming" },
      });
    }

    // Discord webhook — match rejected
    try {
      if (match) {
        const league = leagueList.find(l => l.id === match.leagueId);
        await supabase.functions.invoke("discord-webhook", {
          body: {
            action: "send_match_rejected",
            player1_name: match.player1Name,
            player2_name: match.player2Name,
            score1: match.score1,
            score2: match.score2,
            league_name: league?.name || "Liga",
            league_id: match.leagueId,
          },
        });
      }
    } catch (e) { console.error("Discord webhook error:", e); }

    setMatchList((prev) => prev.map((m) => m.id === matchId ? {
      ...m, status: "upcoming" as const,
      score1: undefined, score2: undefined, legsWon1: undefined, legsWon2: undefined,
      avg1: undefined, avg2: undefined,
      oneEighties1: 0, oneEighties2: 0, highCheckout1: 0, highCheckout2: 0,
      ton40_1: 0, ton40_2: 0, ton60_1: 0, ton60_2: 0, ton80_1: 0, ton80_2: 0,
      tonPlus1: 0, tonPlus2: 0, dartsThrown1: 0, dartsThrown2: 0,
      checkoutAttempts1: 0, checkoutAttempts2: 0, checkoutHits1: 0, checkoutHits2: 0,
      first9Avg1: undefined, first9Avg2: undefined,
      avgUntil170_1: undefined, avgUntil170_2: undefined,
      autodartsLink: undefined,
    } : m));
  }, [matchList, leagueList]);

  const getPendingApprovalMatches = useCallback(() => {
    return matchList.filter(m => m.status === "pending_approval");
  }, [matchList]);

  const addMatch = useCallback(async (leagueId: string, player1Id: string, player2Id: string, date: string, round?: number) => {
    const { data } = await supabase.from("matches").insert({
      league_id: leagueId, player1_id: player1Id, player2_id: player2Id,
      date, round, status: "upcoming",
    }).select().single();

    if (data) {
      setMatchList((prev) => [mapDbMatch(data, playerList), ...prev]);
    }
  }, [playerList]);

  const deleteMatch = useCallback(async (matchId: string) => {
    await supabase.from("matches").delete().eq("id", matchId);
    setMatchList((prev) => prev.filter((m) => m.id !== matchId));
  }, []);

  const addPendingPlayer = useCallback(async (name: string) => {
    const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const { data } = await supabase.from("players").insert({ name, avatar: initials, approved: false }).select().single();
    if (data) {
      setPendingPlayers((prev) => [...prev, { id: data.id, name: data.name, avatar: data.avatar, approved: false }]);
    }
  }, []);

  const addPlayer = useCallback(async (name: string) => {
    const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const { data, error } = await supabase.from("players").insert({ name, avatar: initials, approved: true }).select().single();
    if (data) {
      setPlayerList((prev) => [...prev, { id: data.id, name: data.name, avatar: data.avatar, approved: true, leagueIds: [] }]);
    }
    return { data, error };
  }, []);

  const approvePlayer = useCallback(async (playerId: string) => {
    await supabase.from("players").update({ approved: true }).eq("id", playerId);
    let playerName = "";
    setPendingPlayers((prev) => {
      const player = prev.find((p) => p.id === playerId);
      if (player) {
        playerName = player.name;
        setPlayerList((bp) => [...bp, { ...player, approved: true, leagueIds: [] }]);
      }
      return prev.filter((p) => p.id !== playerId);
    });
    // Discord webhook — player approved
    if (playerName) {
      try {
        await supabase.functions.invoke("discord-webhook", {
          body: { action: "send_player_approved", player_name: playerName },
        });
      } catch (e) { console.error("Discord webhook error:", e); }
    }
  }, []);

  const addLeague = useCallback(async (league: Omit<League, "id">) => {
    const { data, error } = await supabase.from("leagues").insert({
      name: league.name, season: league.season, description: league.description,
      format: league.format, max_legs: league.max_legs, is_active: league.is_active,
      league_type: league.league_type || "league",
      bonus_rules: league.bonus_rules as any,
      registration_open: league.registration_open ?? false,
      registration_deadline: league.registration_deadline ?? null,
      meetings_per_pair: league.meetings_per_pair ?? 1,
      platform: league.platform ?? "autodarts",
      third_place_match: league.third_place_match ?? false,
      lucky_loser: league.lucky_loser ?? false,
      max_players: league.max_players ?? null,
      exclusive_platform: league.exclusive_platform ?? false,
    } as any).select().single();
    if (data) {
      const newLeague: League = {
        id: data.id, name: data.name, season: data.season, description: data.description,
        format: data.format, max_legs: data.max_legs, is_active: data.is_active,
        league_type: (data.league_type as League["league_type"]) || "league",
        bonus_rules: { ...DEFAULT_BONUS_RULES, ...((data as any).bonus_rules || {}) } as BonusRules,
        registration_open: (data as any).registration_open ?? false,
        meetings_per_pair: (data as any).meetings_per_pair ?? 1,
        platform: (data as any).platform ?? "autodarts",
        third_place_match: (data as any).third_place_match ?? false,
        lucky_loser: (data as any).lucky_loser ?? false,
        max_players: (data as any).max_players ?? null,
        exclusive_platform: (data as any).exclusive_platform ?? false,
      };
      setLeagueList((prev) => [...prev, newLeague]);
      if (!activeLeagueId) setActiveLeagueId(data.id);
      // Discord webhook — league created
      try {
        await supabase.functions.invoke("discord-webhook", {
          body: { action: "send_league_created", league_name: data.name, season: data.season, format: data.format, description: data.description },
        });
      } catch (e) { console.error("Discord webhook error:", e); }
    }
    return { data, error };
  }, [activeLeagueId]);

  const updateLeague = useCallback(async (id: string, data: Partial<League>) => {
    const dbData: any = { ...data };
    if (data.bonus_rules) dbData.bonus_rules = data.bonus_rules;
    await supabase.from("leagues").update(dbData).eq("id", id);
    setLeagueList((prev) => prev.map((l) => l.id === id ? { ...l, ...data } : l));
  }, []);

  const deleteLeague = useCallback(async (id: string) => {
    // Delete related matches and player_leagues first
    await supabase.from("matches").delete().eq("league_id", id);
    await supabase.from("player_leagues").delete().eq("league_id", id);
    await supabase.from("leagues").delete().eq("id", id);
    setLeagueList((prev) => prev.filter((l) => l.id !== id));
    setMatchList((prev) => prev.filter((m) => m.leagueId !== id));
  }, []);

  const updatePlayer = useCallback(async (id: string, data: Partial<Player>) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.discord !== undefined) updateData.discord = data.discord;
    await supabase.from("players").update(updateData).eq("id", id);
    setPlayerList((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
  }, []);

  const deletePlayer = useCallback(async (id: string) => {
    await supabase.from("player_leagues").delete().eq("player_id", id);
    await supabase.from("players").delete().eq("id", id);
    setPlayerList((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const assignPlayerToLeague = useCallback(async (playerId: string, leagueId: string) => {
    const { error } = await supabase.from("player_leagues").insert({ player_id: playerId, league_id: leagueId });
    if (!error) {
      setPlayerList((prev) => prev.map((p) => {
        if (p.id === playerId) {
          const ids = p.leagueIds || [];
          if (!ids.includes(leagueId)) return { ...p, leagueIds: [...ids, leagueId] };
        }
        return p;
      }));
      // Discord webhook — league registration
      try {
        const player = playerList.find(p => p.id === playerId);
        const league = leagueList.find(l => l.id === leagueId);
        if (player && league) {
          await supabase.functions.invoke("discord-webhook", {
            body: { action: "send_league_registration", player_name: player.name, league_name: league.name, league_id: leagueId },
          });
        }
      } catch (e) { console.error("Discord webhook error:", e); }
    }
  }, [playerList, leagueList]);

  const removePlayerFromLeague = useCallback(async (playerId: string, leagueId: string) => {
    await supabase.from("player_leagues").delete().eq("player_id", playerId).eq("league_id", leagueId);
    setPlayerList((prev) => prev.map((p) => {
      if (p.id === playerId) {
        return { ...p, leagueIds: (p.leagueIds || []).filter((id) => id !== leagueId) };
      }
      return p;
    }));
    // Discord webhook — league unregistration
    try {
      const player = playerList.find(p => p.id === playerId);
      const league = leagueList.find(l => l.id === leagueId);
      if (player && league) {
        await supabase.functions.invoke("discord-webhook", {
          body: { action: "send_league_unregistration", player_name: player.name, league_name: league.name, league_id: leagueId },
        });
      }
    } catch (e) { console.error("Discord webhook error:", e); }
  }, [playerList, leagueList]);

  // Ton stats with win rate data
  const calcTonStats = useCallback((filterLeagueId?: string): TonLeaderEntry[] => {
    const filtered = filterLeagueId ? matchList.filter(m => m.leagueId === filterLeagueId && m.status === "completed") : matchList.filter(m => m.status === "completed");
    const playerMap = new Map<string, TonLeaderEntry>();

    filtered.forEach((m) => {
      [
      { id: m.player1Id, name: m.player1Name, t60: m.ton60_1 ?? 0, t80: m.ton80_1 ?? 0, tp: m.tonPlus1 ?? 0, t40: m.ton40_1 ?? 0, e: m.oneEighties1 ?? 0, hc: m.highCheckout1 ?? 0, avg: m.avg1 ?? 0, score: m.score1 ?? 0, oppScore: m.score2 ?? 0, attempts: m.checkoutAttempts1 ?? 0, hits: m.checkoutHits1 ?? 0 },
        { id: m.player2Id, name: m.player2Name, t60: m.ton60_2 ?? 0, t80: m.ton80_2 ?? 0, tp: m.tonPlus2 ?? 0, t40: m.ton40_2 ?? 0, e: m.oneEighties2 ?? 0, hc: m.highCheckout2 ?? 0, avg: m.avg2 ?? 0, score: m.score2 ?? 0, oppScore: m.score1 ?? 0, attempts: m.checkoutAttempts2 ?? 0, hits: m.checkoutHits2 ?? 0 },
      ].forEach(({ id, name, t60, t80, tp, t40, e, hc, avg, score, oppScore, attempts, hits }) => {
        const existing = playerMap.get(id);
        const player = playerList.find(p => p.id === id);
        const won = score > oppScore ? 1 : 0;
        const lost = score < oppScore ? 1 : 0;
        if (existing) {
          existing.ton60 += t60; existing.ton80 += t80; existing.tonPlus += tp; existing.ton40 += t40;
          existing.oneEighties += e; existing.totalTons += t60 + t80 + tp + t40 + e;
          if (hc > existing.highestCheckout) existing.highestCheckout = hc;
          if (avg > existing.bestAvg) existing.bestAvg = avg;
          existing.wins += won; existing.losses += lost; existing.matchesPlayed += 1;
          existing.checkoutAttempts += attempts;
          existing.checkoutHits += hits;
          existing.checkoutRate = existing.checkoutAttempts > 0 ? Math.round((existing.checkoutHits / existing.checkoutAttempts) * 100) : 0;
          existing.winRate = existing.matchesPlayed > 0 ? Math.round((existing.wins / existing.matchesPlayed) * 100) : 0;
        } else {
          playerMap.set(id, {
            playerId: id, playerName: name,
            avatar: player?.avatar || name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
            avatarUrl: player?.avatar_url ?? null,
            ton60: t60, ton80: t80, tonPlus: tp, ton40: t40,
            oneEighties: e, totalTons: t60 + t80 + tp + t40 + e,
            highestCheckout: hc, bestAvg: avg,
            wins: won, losses: lost, matchesPlayed: 1,
            winRate: won ? 100 : 0,
            checkoutAttempts: attempts,
            checkoutHits: hits,
            checkoutRate: attempts > 0 ? Math.round((hits / attempts) * 100) : 0,
          });
        }
      });
    });

    return Array.from(playerMap.values()).sort((a, b) => b.totalTons - a.totalTons);
  }, [matchList, playerList]);

  const getGlobalTonStats = useCallback(() => calcTonStats(), [calcTonStats]);
  const getLeagueTonStats = useCallback((leagueId: string) => calcTonStats(leagueId), [calcTonStats]);

  const joinLeague = useCallback(async (leagueId: string): Promise<{ error: string | null }> => {
    // Find the player linked to current auth user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Musisz być zalogowany." };

    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!player) return { error: "Nie znaleziono konta gracza." };

    // Check if already joined
    const { data: existing } = await supabase
      .from("player_leagues")
      .select("id")
      .eq("player_id", player.id)
      .eq("league_id", leagueId)
      .maybeSingle();

    if (existing) return { error: "Już jesteś zapisany do tej ligi." };

    // Find the target league
    const targetLeague = leagueList.find(l => l.id === leagueId);

    // Check max_players limit
    if (targetLeague?.max_players) {
      const { count } = await supabase
        .from("player_leagues")
        .select("id", { count: "exact", head: true })
        .eq("league_id", leagueId);
      if (count !== null && count >= targetLeague.max_players) {
        return { error: `Liga jest pełna (${targetLeague.max_players}/${targetLeague.max_players} graczy).` };
      }
    }

    // Check exclusive_platform — player can't play in 2 leagues on the same platform
    if (targetLeague?.exclusive_platform && targetLeague.platform) {
      const { data: playerLeagues } = await supabase
        .from("player_leagues")
        .select("league_id")
        .eq("player_id", player.id);
      if (playerLeagues) {
        const samePlatformLeague = playerLeagues.find(pl => {
          const otherLeague = leagueList.find(l => l.id === pl.league_id);
          return otherLeague && otherLeague.platform === targetLeague.platform && otherLeague.is_active && otherLeague.id !== leagueId;
        });
        if (samePlatformLeague) {
          const otherLeague = leagueList.find(l => l.id === samePlatformLeague.league_id);
          return { error: `Już grasz w lidze na platformie ${targetLeague.platform} (${otherLeague?.name}). Nie możesz grać w dwóch ligach na tej samej platformie.` };
        }
      }
    }

    const { error } = await supabase
      .from("player_leagues")
      .insert({ player_id: player.id, league_id: leagueId });

    if (error) return { error: translateError(error.message) };

    // Update local state
    setPlayerList((prev) => prev.map((p) =>
      p.id === player.id
        ? { ...p, leagueIds: [...(p.leagueIds || []), leagueId] }
        : p
    ));

    return { error: null };
  }, [leagueList]);

  const leaveLeague = useCallback(async (leagueId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!player) return;

    await supabase
      .from("player_leagues")
      .delete()
      .eq("player_id", player.id)
      .eq("league_id", leagueId);

    setPlayerList((prev) => prev.map((p) =>
      p.id === player.id
        ? { ...p, leagueIds: (p.leagueIds || []).filter((id) => id !== leagueId) }
        : p
    ));
  }, []);

  return (
    <LeagueContext.Provider value={{
      players: playerList, matches: matchList, leagues: leagueList,
      activeLeagueId, setActiveLeagueId,
      getLeagueMatches, getPlayerLeagueStats, getPlayerAllLeagueStats,
      getPlayerAchievements, getPlayerGlobalAchievements, getLeagueStandings,
      submitMatchResult, updateMatchResult, approveMatch, rejectMatch,
      addMatch, approvePlayer, pendingPlayers, addPendingPlayer, addPlayer,
      addLeague, updateLeague, deleteLeague,
      updatePlayer, deletePlayer, assignPlayerToLeague, removePlayerFromLeague,
      deleteMatch,
      getGlobalTonStats, getLeagueTonStats, getPendingApprovalMatches,
      joinLeague, leaveLeague,
      loading, refreshData,
    }}>
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeague = () => {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague must be used within LeagueProvider");
  return ctx;
};
