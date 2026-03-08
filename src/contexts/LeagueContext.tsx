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
  addMatch: (leagueId: string, player1Id: string, player2Id: string, date: string, round?: number) => void;
  approvePlayer: (playerId: string) => void;
  pendingPlayers: Player[];
  addPendingPlayer: (name: string) => void;
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
  loading: boolean;
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
  ton40_1?: number;
  ton40_2?: number;
  ton60_1?: number;
  ton60_2?: number;
  ton80_1?: number;
  ton80_2?: number;
  tonPlus1?: number;
  tonPlus2?: number;
  dartsThrown1?: number;
  dartsThrown2?: number;
  autodartsLink?: string;
}

export interface TonLeaderEntry {
  playerId: string;
  playerName: string;
  avatar: string;
  ton40: number;
  ton60: number;
  ton80: number;
  tonPlus: number;
  oneEighties: number;
  totalTons: number;
  highestCheckout: number;
  bestAvg: number;
}

const LeagueContext = createContext<LeagueContextType | null>(null);

// Map DB row to app Match type
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
    ton40_1: m.ton40_1,
    ton40_2: m.ton40_2,
    ton60_1: m.ton60_1,
    ton60_2: m.ton60_2,
    ton80_1: m.ton80_1,
    ton80_2: m.ton80_2,
    tonPlus1: m.ton_plus1,
    tonPlus2: m.ton_plus2,
    dartsThrown1: m.darts_thrown1,
    dartsThrown2: m.darts_thrown2,
  };
};

const calcStats = (playerId: string, leagueId: string, matches: Match[]): PlayerLeagueStats => {
  const completed = matches.filter(
    (m) => m.leagueId === leagueId && m.status === "completed" && (m.player1Id === playerId || m.player2Id === playerId)
  );

  let wins = 0, losses = 0, draws = 0, legsWon = 0, legsLost = 0, oneEighties = 0;
  let highestCheckout = 0, bestAvg = 0, totalDarts = 0;
  let ton40 = 0, ton60 = 0, ton80 = 0, tonPlus = 0;
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
    const hc = isP1 ? (m.highCheckout1 ?? 0) : (m.highCheckout2 ?? 0);
    if (hc > highestCheckout) highestCheckout = hc;
    const myAvg = isP1 ? (m.avg1 ?? 0) : (m.avg2 ?? 0);
    if (myAvg > 0) { avgValues.push(myAvg); if (myAvg > bestAvg) bestAvg = myAvg; }
    totalDarts += isP1 ? (m.dartsThrown1 ?? 0) : (m.dartsThrown2 ?? 0);
    ton40 += isP1 ? (m.ton40_1 ?? 0) : (m.ton40_2 ?? 0);
    ton60 += isP1 ? (m.ton60_1 ?? 0) : (m.ton60_2 ?? 0);
    ton80 += isP1 ? (m.ton80_1 ?? 0) : (m.ton80_2 ?? 0);
    tonPlus += isP1 ? (m.tonPlus1 ?? 0) : (m.tonPlus2 ?? 0);

    if (myScore > oppScore) { wins++; form.push("W"); }
    else if (myScore < oppScore) { losses++; form.push("L"); }
    else { draws++; form.push("D"); }
  });

  const avg = avgValues.length > 0 ? Math.round((avgValues.reduce((a, b) => a + b, 0) / avgValues.length) * 10) / 10 : 0;

  return {
    playerId, leagueId,
    wins, losses, draws,
    points: wins * 3 + draws,
    legsWon, legsLost, avg,
    highestCheckout, oneEighties,
    form: form.slice(-5),
    badges: [],
    matchesPlayed: completed.length,
    bestAvg: Math.round(bestAvg * 10) / 10,
    totalDartsThrown: totalDarts,
    ton40, ton60, ton80, tonPlus,
  };
};

export const LeagueProvider = ({ children }: { children: ReactNode }) => {
  const [matchList, setMatchList] = useState<Match[]>([]);
  const [playerList, setPlayerList] = useState<Player[]>([]);
  const [leagueList, setLeagueList] = useState<League[]>([]);
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch all data from DB
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch leagues
      const { data: leaguesData } = await supabase.from("leagues").select("*").order("created_at");
      const leagues: League[] = (leaguesData || []).map((l: any) => ({
        id: l.id, name: l.name, season: l.season, description: l.description,
        is_active: l.is_active, format: l.format, max_legs: l.max_legs,
      }));
      setLeagueList(leagues);
      if (leagues.length > 0 && !activeLeagueId) {
        setActiveLeagueId(leagues.find(l => l.is_active)?.id || leagues[0].id);
      }

      // Fetch players with their league assignments
      const { data: playersData } = await supabase.from("players").select("*").order("name");
      const { data: plData } = await supabase.from("player_leagues").select("*");
      const playerLeagues = plData || [];

      const players: Player[] = (playersData || []).map((p: any) => ({
        id: p.id, name: p.name, avatar: p.avatar, approved: p.approved,
        leagueIds: playerLeagues.filter((pl: any) => pl.player_id === p.id).map((pl: any) => pl.league_id),
      }));
      const approved = players.filter(p => p.approved);
      const pending = players.filter(p => !p.approved);
      setPlayerList(approved);
      setPendingPlayers(pending);

      // Fetch matches
      const { data: matchesData } = await supabase.from("matches").select("*").order("date", { ascending: false });
      setMatchList((matchesData || []).map((m: any) => mapDbMatch(m, players)));

      setLoading(false);
    };
    fetchData();
  }, []);

  const getLeagueMatches = useCallback((leagueId: string) => matchList.filter((m) => m.leagueId === leagueId), [matchList]);

  const getPlayerLeagueStats = useCallback((playerId: string, leagueId: string) => calcStats(playerId, leagueId, matchList), [matchList]);

  const getPlayerAllLeagueStats = useCallback((playerId: string) => {
    return leagueList.filter(l => {
      return matchList.some(m => m.leagueId === l.id && (m.player1Id === playerId || m.player2Id === playerId));
    }).map(league => ({
      league,
      stats: calcStats(playerId, league.id, matchList),
    }));
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
    await supabase.from("matches").update({
      score1: data.score1, score2: data.score2,
      legs_won1: data.score1, legs_won2: data.score2,
      status: "completed",
      avg1: data.avg1, avg2: data.avg2,
      one_eighties1: data.oneEighties1 ?? 0, one_eighties2: data.oneEighties2 ?? 0,
      high_checkout1: data.highCheckout1 ?? 0, high_checkout2: data.highCheckout2 ?? 0,
      ton40_1: data.ton40_1 ?? 0, ton40_2: data.ton40_2 ?? 0,
      ton60_1: data.ton60_1 ?? 0, ton60_2: data.ton60_2 ?? 0,
      ton80_1: data.ton80_1 ?? 0, ton80_2: data.ton80_2 ?? 0,
      ton_plus1: data.tonPlus1 ?? 0, ton_plus2: data.tonPlus2 ?? 0,
      darts_thrown1: data.dartsThrown1 ?? 0, darts_thrown2: data.dartsThrown2 ?? 0,
      autodarts_link: data.autodartsLink,
    }).eq("id", matchId);

    // Update local state
    setMatchList((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, ...data, legsWon1: data.score1, legsWon2: data.score2, status: "completed" as const } : m
      )
    );
  }, []);

  const addMatch = useCallback(async (leagueId: string, player1Id: string, player2Id: string, date: string, round?: number) => {
    const { data } = await supabase.from("matches").insert({
      league_id: leagueId, player1_id: player1Id, player2_id: player2Id,
      date, round, status: "upcoming",
    }).select().single();

    if (data) {
      const p1 = playerList.find(p => p.id === player1Id);
      const p2 = playerList.find(p => p.id === player2Id);
      setMatchList((prev) => [...prev, mapDbMatch(data, playerList)]);
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

  const approvePlayer = useCallback(async (playerId: string) => {
    await supabase.from("players").update({ approved: true }).eq("id", playerId);
    setPendingPlayers((prev) => {
      const player = prev.find((p) => p.id === playerId);
      if (player) setPlayerList((bp) => [...bp, { ...player, approved: true, leagueIds: [] }]);
      return prev.filter((p) => p.id !== playerId);
    });
  }, []);

  const addLeague = useCallback(async (league: Omit<League, "id">) => {
    const { data } = await supabase.from("leagues").insert({
      name: league.name, season: league.season, description: league.description,
      format: league.format, max_legs: league.max_legs, is_active: league.is_active,
    }).select().single();
    if (data) {
      setLeagueList((prev) => [...prev, { id: data.id, name: data.name, season: data.season, description: data.description, format: data.format, max_legs: data.max_legs, is_active: data.is_active }]);
    }
  }, []);

  const updateLeague = useCallback(async (id: string, data: Partial<League>) => {
    await supabase.from("leagues").update(data).eq("id", id);
    setLeagueList((prev) => prev.map((l) => l.id === id ? { ...l, ...data } : l));
  }, []);

  const deleteLeague = useCallback(async (id: string) => {
    await supabase.from("leagues").delete().eq("id", id);
    setLeagueList((prev) => prev.filter((l) => l.id !== id));
    setMatchList((prev) => prev.filter((m) => m.leagueId !== id));
  }, []);

  const updatePlayer = useCallback(async (id: string, data: Partial<Player>) => {
    await supabase.from("players").update({ name: data.name, avatar: data.avatar }).eq("id", id);
    setPlayerList((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
  }, []);

  const deletePlayer = useCallback(async (id: string) => {
    await supabase.from("players").delete().eq("id", id);
    setPlayerList((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const assignPlayerToLeague = useCallback(async (playerId: string, leagueId: string) => {
    await supabase.from("player_leagues").insert({ player_id: playerId, league_id: leagueId });
    setPlayerList((prev) => prev.map((p) => {
      if (p.id === playerId) {
        const ids = p.leagueIds || [];
        if (!ids.includes(leagueId)) return { ...p, leagueIds: [...ids, leagueId] };
      }
      return p;
    }));
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

  // Ton stats
  const calcTonStats = useCallback((filterLeagueId?: string): TonLeaderEntry[] => {
    const filtered = filterLeagueId ? matchList.filter(m => m.leagueId === filterLeagueId && m.status === "completed") : matchList.filter(m => m.status === "completed");
    const playerMap = new Map<string, TonLeaderEntry>();

    filtered.forEach((m) => {
      [
        { id: m.player1Id, name: m.player1Name, t40: m.ton40_1 ?? 0, t60: m.ton60_1 ?? 0, t80: m.ton80_1 ?? 0, tp: m.tonPlus1 ?? 0, e: m.oneEighties1 ?? 0, hc: m.highCheckout1 ?? 0, avg: m.avg1 ?? 0 },
        { id: m.player2Id, name: m.player2Name, t40: m.ton40_2 ?? 0, t60: m.ton60_2 ?? 0, t80: m.ton80_2 ?? 0, tp: m.tonPlus2 ?? 0, e: m.oneEighties2 ?? 0, hc: m.highCheckout2 ?? 0, avg: m.avg2 ?? 0 },
      ].forEach(({ id, name, t40, t60, t80, tp, e, hc, avg }) => {
        const existing = playerMap.get(id);
        const player = playerList.find(p => p.id === id);
        if (existing) {
          existing.ton40 += t40; existing.ton60 += t60; existing.ton80 += t80; existing.tonPlus += tp;
          existing.oneEighties += e; existing.totalTons += t40 + t60 + t80 + tp + e;
          if (hc > existing.highestCheckout) existing.highestCheckout = hc;
          if (avg > existing.bestAvg) existing.bestAvg = avg;
        } else {
          playerMap.set(id, {
            playerId: id, playerName: name,
            avatar: player?.avatar || name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
            ton40: t40, ton60: t60, ton80: t80, tonPlus: tp,
            oneEighties: e, totalTons: t40 + t60 + t80 + tp + e,
            highestCheckout: hc, bestAvg: avg,
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
      submitMatchResult, addMatch, approvePlayer, pendingPlayers, addPendingPlayer,
      addLeague, updateLeague, deleteLeague,
      updatePlayer, deletePlayer, assignPlayerToLeague, removePlayerFromLeague,
      deleteMatch,
      getGlobalTonStats, getLeagueTonStats,
      loading,
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
