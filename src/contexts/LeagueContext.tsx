import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Player, Match, League, PlayerLeagueStats, Achievement,
  achievements,
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
  getLeagueStandings: (leagueId: string) => (Player & { stats: PlayerLeagueStats })[];
  submitMatchResult: (matchId: string, data: MatchResultData) => void;
  approveMatch: (matchId: string) => void;
  rejectMatch: (matchId: string) => void;
  addMatch: (leagueId: string, player1Id: string, player2Id: string, date: string, round?: number) => void;
  approvePlayer: (playerId: string) => void;
  pendingPlayers: Player[];
  addPendingPlayer: (name: string) => void;
  addPlayer: (name: string) => void;
  addLeague: (league: Omit<League, "id">) => void;
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
  dartsThrown1?: number;
  dartsThrown2?: number;
  checkoutAttempts1?: number;
  checkoutAttempts2?: number;
  checkoutHits1?: number;
  checkoutHits2?: number;
  nineDarters1?: number;
  nineDarters2?: number;
  autodartsLink?: string;
}

export interface TonLeaderEntry {
  playerId: string;
  playerName: string;
  avatar: string;
  ton60: number;
  ton80: number;
  tonPlus: number;
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

const mapDbMatch = (m: any, players: Player[]): Match => {
  const p1 = players.find(p => p.id === m.player1_id);
  const p2 = players.find(p => p.id === m.player2_id);
  return {
    id: m.id,
    leagueId: m.league_id,
    player1Id: m.player1_id,
    player2Id: m.player2_id,
    player1Name: p1?.name || "?",
    player2Name: p2?.name || "?",
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
    dartsThrown1: m.darts_thrown1,
    dartsThrown2: m.darts_thrown2,
    checkoutAttempts1: m.checkout_attempts1,
    checkoutAttempts2: m.checkout_attempts2,
    checkoutHits1: m.checkout_hits1,
    checkoutHits2: m.checkout_hits2,
    bracketRound: m.bracket_round,
    bracketPosition: m.bracket_position,
    groupName: m.group_name,
    nineDarters1: m.nine_darters1,
    nineDarters2: m.nine_darters2,
  };
};

// ─── BONUS POINTS SYSTEM ───
// Base: Win = 3pts, Draw = 1pt, Loss = 0pts
// Bonus (per match, per player):
//   +1 per 180 scored
//   +3 per 9-darter
//   +1 for high checkout 100+
//   +1 extra for high checkout 150+
//   +1 for match average 90+
//   +1 extra for match average 100+
//   +1 for loser if close match (1 leg difference)
//   +1 for winner if clean sweep (opponent 0 legs)

const calcMatchBonusPoints = (
  isP1: boolean,
  m: Match,
  myScore: number,
  oppScore: number,
  isWinner: boolean
): number => {
  let bonus = 0;
  const my180 = isP1 ? (m.oneEighties1 ?? 0) : (m.oneEighties2 ?? 0);
  const myHC = isP1 ? (m.highCheckout1 ?? 0) : (m.highCheckout2 ?? 0);
  const myAvg = isP1 ? (m.avg1 ?? 0) : (m.avg2 ?? 0);
  const my9d = isP1 ? (m.nineDarters1 ?? 0) : (m.nineDarters2 ?? 0);

  // +1 per 180
  bonus += my180;
  // +3 per 9-darter
  bonus += my9d * 3;
  // High checkout bonuses
  if (myHC >= 100) bonus += 1;
  if (myHC >= 150) bonus += 1;
  // Average bonuses
  if (myAvg >= 90) bonus += 1;
  if (myAvg >= 100) bonus += 1;
  // Close loss: loser gets +1 if difference is exactly 1 leg
  if (!isWinner && myScore < oppScore && (oppScore - myScore) === 1) bonus += 1;
  // Clean sweep: winner gets +1 if opponent scored 0
  if (isWinner && oppScore === 0) bonus += 1;

  return bonus;
};

const calcStats = (playerId: string, leagueId: string, matches: Match[]): PlayerLeagueStats => {
  const completed = matches.filter(
    (m) => m.leagueId === leagueId && m.status === "completed" && (m.player1Id === playerId || m.player2Id === playerId)
  );

  let wins = 0, losses = 0, draws = 0, legsWon = 0, legsLost = 0, oneEighties = 0, nineDarters = 0;
  let highestCheckout = 0, bestAvg = 0, totalDarts = 0;
  let ton60 = 0, ton80 = 0, tonPlus = 0;
  let checkoutAttempts = 0, checkoutHits = 0;
  let basePoints = 0, bonusPoints = 0;
  const avgValues: number[] = [];
  const form: ("W" | "L" | "D")[] = [];

  completed.forEach((m) => {
    const isP1 = m.player1Id === playerId;
    const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
    const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
    const myLegs = isP1 ? (m.legsWon1 ?? m.score1 ?? 0) : (m.legsWon2 ?? m.score2 ?? 0);
    const oppLegs = isP1 ? (m.legsWon2 ?? m.score2 ?? 0) : (m.legsWon1 ?? m.score1 ?? 0);

    legsWon += myLegs;
    legsLost += oppLegs;
    oneEighties += isP1 ? (m.oneEighties1 ?? 0) : (m.oneEighties2 ?? 0);
    nineDarters += isP1 ? (m.nineDarters1 ?? 0) : (m.nineDarters2 ?? 0);
    const hc = isP1 ? (m.highCheckout1 ?? 0) : (m.highCheckout2 ?? 0);
    if (hc > highestCheckout) highestCheckout = hc;
    const myAvg = isP1 ? (m.avg1 ?? 0) : (m.avg2 ?? 0);
    if (myAvg > 0) { avgValues.push(myAvg); if (myAvg > bestAvg) bestAvg = myAvg; }
    totalDarts += isP1 ? (m.dartsThrown1 ?? 0) : (m.dartsThrown2 ?? 0);
    ton60 += isP1 ? (m.ton60_1 ?? 0) : (m.ton60_2 ?? 0);
    ton80 += isP1 ? (m.ton80_1 ?? 0) : (m.ton80_2 ?? 0);
    tonPlus += isP1 ? (m.tonPlus1 ?? 0) : (m.tonPlus2 ?? 0);
    checkoutAttempts += isP1 ? (m.checkoutAttempts1 ?? 0) : (m.checkoutAttempts2 ?? 0);
    checkoutHits += isP1 ? (m.checkoutHits1 ?? 0) : (m.checkoutHits2 ?? 0);

    const isWinner = myScore > oppScore;
    if (isWinner) { wins++; form.push("W"); basePoints += 3; }
    else if (myScore < oppScore) { losses++; form.push("L"); }
    else { draws++; form.push("D"); basePoints += 1; }

    bonusPoints += calcMatchBonusPoints(isP1, m, myScore, oppScore, isWinner);
  });

  const avg = avgValues.length > 0 ? Math.round((avgValues.reduce((a, b) => a + b, 0) / avgValues.length) * 10) / 10 : 0;
  const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;
  const checkoutRate = checkoutAttempts > 0 ? Math.round((checkoutHits / checkoutAttempts) * 100) : 0;

  return {
    playerId, leagueId,
    wins, losses, draws,
    points: basePoints + bonusPoints,
    basePoints,
    bonusPoints,
    legsWon, legsLost, avg,
    highestCheckout, oneEighties, nineDarters,
    form: form.slice(-5),
    badges: [],
    matchesPlayed: completed.length,
    bestAvg: Math.round(bestAvg * 10) / 10,
    totalDartsThrown: totalDarts,
    ton60, ton80, tonPlus,
    winRate,
    checkoutAttempts,
    checkoutHits,
    checkoutRate,
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
    const { data: leaguesData } = await supabase.from("leagues").select("*").order("created_at");
    const leagues: League[] = (leaguesData || []).map((l: any) => ({
      id: l.id, name: l.name, season: l.season, description: l.description,
      is_active: l.is_active, format: l.format, max_legs: l.max_legs,
      league_type: l.league_type || "league",
    }));
    setLeagueList(leagues);
    if (leagues.length > 0 && !activeLeagueId) {
      setActiveLeagueId(leagues.find(l => l.is_active)?.id || leagues[0].id);
    }

    const { data: playersData } = await supabase.from("players").select("*").order("name");
    const { data: plData } = await supabase.from("player_leagues").select("*");
    const playerLeagues = plData || [];

    const allPlayers: Player[] = (playersData || []).map((p: any) => ({
      id: p.id, name: p.name, avatar: p.avatar, approved: p.approved,
      leagueIds: playerLeagues.filter((pl: any) => pl.player_id === p.id).map((pl: any) => pl.league_id),
    }));
    const approved = allPlayers.filter(p => p.approved);
    const pending = allPlayers.filter(p => !p.approved);
    setPlayerList(approved);
    setPendingPlayers(pending);

    const { data: matchesData } = await supabase.from("matches").select("*").order("date", { ascending: false });
    setMatchList((matchesData || []).map((m: any) => mapDbMatch(m, allPlayers)));

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, []);

  const refreshData = useCallback(() => { fetchData(); }, [fetchData]);

  const getLeagueMatches = useCallback((leagueId: string) => matchList.filter((m) => m.leagueId === leagueId), [matchList]);

  const getPlayerLeagueStats = useCallback((playerId: string, leagueId: string) => calcStats(playerId, leagueId, matchList), [matchList]);

  const getPlayerAllLeagueStats = useCallback((playerId: string) => {
    return leagueList.filter(l => {
      return matchList.some(m => m.leagueId === l.id && (m.player1Id === playerId || m.player2Id === playerId));
    }).map(league => ({ league, stats: calcStats(playerId, league.id, matchList) }));
  }, [matchList, leagueList]);

  const getPlayerAchievements = useCallback((playerId: string, leagueId: string) => {
    const stats = calcStats(playerId, leagueId, matchList);
    return achievements.filter((a) => a.condition(stats));
  }, [matchList]);

  const getLeagueStandings = useCallback((leagueId: string) => {
    const leaguePlayers = playerList.filter((p) => p.approved && matchList.some(
      (m) => m.leagueId === leagueId && (m.player1Id === p.id || m.player2Id === p.id)
    ));
    return leaguePlayers
      .map((p) => ({ ...p, stats: calcStats(p.id, leagueId, matchList) }))
      .sort((a, b) => b.stats.points - a.stats.points || (b.stats.legsWon - b.stats.legsLost) - (a.stats.legsWon - a.stats.legsLost));
  }, [matchList, playerList]);

  const submitMatchResult = useCallback(async (matchId: string, data: MatchResultData) => {
    // Players submit results as "pending_approval" - admin/moderator must approve
    await supabase.from("matches").update({
      score1: data.score1, score2: data.score2,
      legs_won1: data.score1, legs_won2: data.score2,
      status: "pending_approval",
      avg1: data.avg1, avg2: data.avg2,
      one_eighties1: data.oneEighties1 ?? 0, one_eighties2: data.oneEighties2 ?? 0,
      high_checkout1: data.highCheckout1 ?? 0, high_checkout2: data.highCheckout2 ?? 0,
      ton40_1: 0, ton40_2: 0,
      ton60_1: data.ton60_1 ?? 0, ton60_2: data.ton60_2 ?? 0,
      ton80_1: data.ton80_1 ?? 0, ton80_2: data.ton80_2 ?? 0,
      ton_plus1: data.tonPlus1 ?? 0, ton_plus2: data.tonPlus2 ?? 0,
      darts_thrown1: data.dartsThrown1 ?? 0, darts_thrown2: data.dartsThrown2 ?? 0,
      checkout_attempts1: data.checkoutAttempts1 ?? 0,
      checkout_attempts2: data.checkoutAttempts2 ?? 0,
      checkout_hits1: data.checkoutHits1 ?? 0,
      checkout_hits2: data.checkoutHits2 ?? 0,
      autodarts_link: data.autodartsLink,
      nine_darters1: data.nineDarters1 ?? 0,
      nine_darters2: data.nineDarters2 ?? 0,
    }).eq("id", matchId);

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
  }, []);

  const approveMatch = useCallback(async (matchId: string) => {
    await supabase.from("matches").update({ status: "completed" }).eq("id", matchId);
    setMatchList((prev) => prev.map((m) => m.id === matchId ? { ...m, status: "completed" as const } : m));
  }, []);

  const rejectMatch = useCallback(async (matchId: string) => {
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
      nine_darters1: 0, nine_darters2: 0,
      autodarts_link: null,
    }).eq("id", matchId);

    setMatchList((prev) => prev.map((m) => m.id === matchId ? {
      ...m, status: "upcoming" as const,
      score1: undefined, score2: undefined, legsWon1: undefined, legsWon2: undefined,
      avg1: undefined, avg2: undefined,
      oneEighties1: 0, oneEighties2: 0, highCheckout1: 0, highCheckout2: 0,
      ton40_1: 0, ton40_2: 0, ton60_1: 0, ton60_2: 0, ton80_1: 0, ton80_2: 0,
      tonPlus1: 0, tonPlus2: 0, dartsThrown1: 0, dartsThrown2: 0,
      checkoutAttempts1: 0, checkoutAttempts2: 0, checkoutHits1: 0, checkoutHits2: 0,
      nineDarters1: 0, nineDarters2: 0,
      autodartsLink: undefined,
    } : m));
  }, []);

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
    setPendingPlayers((prev) => {
      const player = prev.find((p) => p.id === playerId);
      if (player) setPlayerList((bp) => [...bp, { ...player, approved: true, leagueIds: [] }]);
      return prev.filter((p) => p.id !== playerId);
    });
  }, []);

  const addLeague = useCallback(async (league: Omit<League, "id">) => {
    const { data, error } = await supabase.from("leagues").insert({
      name: league.name, season: league.season, description: league.description,
      format: league.format, max_legs: league.max_legs, is_active: league.is_active,
      league_type: league.league_type || "league",
    }).select().single();
    if (data) {
      const newLeague: League = {
        id: data.id, name: data.name, season: data.season, description: data.description,
        format: data.format, max_legs: data.max_legs, is_active: data.is_active,
        league_type: (data.league_type as League["league_type"]) || "league",
      };
      setLeagueList((prev) => [...prev, newLeague]);
      if (!activeLeagueId) setActiveLeagueId(data.id);
    }
    return { data, error };
  }, [activeLeagueId]);

  const updateLeague = useCallback(async (id: string, data: Partial<League>) => {
    await supabase.from("leagues").update(data).eq("id", id);
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
    await supabase.from("players").update({ name: data.name, avatar: data.avatar }).eq("id", id);
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
    }
  }, []);

  const removePlayerFromLeague = useCallback(async (playerId: string, leagueId: string) => {
    await supabase.from("player_leagues").delete().eq("player_id", playerId).eq("league_id", leagueId);
    setPlayerList((prev) => prev.map((p) => {
      if (p.id === playerId) {
        return { ...p, leagueIds: (p.leagueIds || []).filter((id) => id !== leagueId) };
      }
      return p;
    }));
  }, []);

  // Ton stats with win rate data
  const calcTonStats = useCallback((filterLeagueId?: string): TonLeaderEntry[] => {
    const filtered = filterLeagueId ? matchList.filter(m => m.leagueId === filterLeagueId && m.status === "completed") : matchList.filter(m => m.status === "completed");
    const playerMap = new Map<string, TonLeaderEntry>();

    filtered.forEach((m) => {
      [
      { id: m.player1Id, name: m.player1Name, t60: m.ton60_1 ?? 0, t80: m.ton80_1 ?? 0, tp: m.tonPlus1 ?? 0, e: m.oneEighties1 ?? 0, hc: m.highCheckout1 ?? 0, avg: m.avg1 ?? 0, score: m.score1 ?? 0, oppScore: m.score2 ?? 0, attempts: m.checkoutAttempts1 ?? 0, hits: m.checkoutHits1 ?? 0 },
        { id: m.player2Id, name: m.player2Name, t60: m.ton60_2 ?? 0, t80: m.ton80_2 ?? 0, tp: m.tonPlus2 ?? 0, e: m.oneEighties2 ?? 0, hc: m.highCheckout2 ?? 0, avg: m.avg2 ?? 0, score: m.score2 ?? 0, oppScore: m.score1 ?? 0, attempts: m.checkoutAttempts2 ?? 0, hits: m.checkoutHits2 ?? 0 },
      ].forEach(({ id, name, t60, t80, tp, e, hc, avg, score, oppScore, attempts, hits }) => {
        const existing = playerMap.get(id);
        const player = playerList.find(p => p.id === id);
        const won = score > oppScore ? 1 : 0;
        const lost = score < oppScore ? 1 : 0;
        if (existing) {
          existing.ton60 += t60; existing.ton80 += t80; existing.tonPlus += tp;
          existing.oneEighties += e; existing.totalTons += t60 + t80 + tp + e;
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
            ton60: t60, ton80: t80, tonPlus: tp,
            oneEighties: e, totalTons: t60 + t80 + tp + e,
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

  return (
    <LeagueContext.Provider value={{
      players: playerList, matches: matchList, leagues: leagueList,
      activeLeagueId, setActiveLeagueId,
      getLeagueMatches, getPlayerLeagueStats, getPlayerAllLeagueStats,
      getPlayerAchievements, getLeagueStandings,
      submitMatchResult, approveMatch, rejectMatch,
      addMatch, approvePlayer, pendingPlayers, addPendingPlayer, addPlayer,
      addLeague, updateLeague, deleteLeague,
      updatePlayer, deletePlayer, assignPlayerToLeague, removePlayerFromLeague,
      deleteMatch,
      getGlobalTonStats, getLeagueTonStats, getPendingApprovalMatches,
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
