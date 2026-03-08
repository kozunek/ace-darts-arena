import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Player, Match, players as initialPlayers, matches as initialMatches } from "@/data/mockData";

interface LeagueContextType {
  players: Player[];
  matches: Match[];
  submitMatchResult: (matchId: string, score1: number, score2: number, autodartsLink?: string) => void;
  addMatch: (player1Id: string, player2Id: string, date: string) => void;
  approvePlayer: (playerId: string) => void;
  pendingPlayers: Player[];
  addPendingPlayer: (name: string) => void;
}

const LeagueContext = createContext<LeagueContextType | null>(null);

const recalcPlayerStats = (players: Player[], matches: Match[]): Player[] => {
  return players.map((player) => {
    const completed = matches.filter(
      (m) => m.status === "completed" && (m.player1Id === player.id || m.player2Id === player.id)
    );

    let wins = 0, losses = 0, draws = 0, legsWon = 0, legsLost = 0, oneEighties = 0;
    let highestCheckout = 0;
    const avgSum: number[] = [];
    const recentForm: ("W" | "L" | "D")[] = [];

    completed.forEach((m) => {
      const isP1 = m.player1Id === player.id;
      const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
      const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
      const myLegs = isP1 ? (m.legsWon1 ?? m.score1 ?? 0) : (m.legsWon2 ?? m.score2 ?? 0);
      const oppLegs = isP1 ? (m.legsWon2 ?? m.score2 ?? 0) : (m.legsWon1 ?? m.score1 ?? 0);
      const my180 = isP1 ? (m.oneEighties1 ?? 0) : (m.oneEighties2 ?? 0);
      const myHC = isP1 ? (m.highCheckout1 ?? 0) : (m.highCheckout2 ?? 0);
      const myAvg = isP1 ? (m.avg1 ?? 0) : (m.avg2 ?? 0);

      legsWon += myLegs;
      legsLost += oppLegs;
      oneEighties += my180;
      if (myHC > highestCheckout) highestCheckout = myHC;
      if (myAvg > 0) avgSum.push(myAvg);

      if (myScore > oppScore) { wins++; recentForm.push("W"); }
      else if (myScore < oppScore) { losses++; recentForm.push("L"); }
      else { draws++; recentForm.push("D"); }
    });

    const points = wins * 3 + draws;
    const avg = avgSum.length > 0 ? avgSum.reduce((a, b) => a + b, 0) / avgSum.length : player.avg;
    const form = recentForm.slice(-5) as ("W" | "L" | "D")[];

    return {
      ...player,
      wins, losses, draws, points, legsWon, legsLost,
      oneEighties, highestCheckout: highestCheckout || player.highestCheckout,
      avg: Math.round(avg * 10) / 10,
      form: form.length > 0 ? form : player.form,
    };
  });
};

export const LeagueProvider = ({ children }: { children: ReactNode }) => {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [basePlayers, setBasePlayers] = useState<Player[]>(initialPlayers);
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);

  const players = recalcPlayerStats(basePlayers, matches);

  const submitMatchResult = useCallback((matchId: string, score1: number, score2: number, autodartsLink?: string) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              score1,
              score2,
              legsWon1: score1,
              legsWon2: score2,
              status: "completed" as const,
              autodartsLink: autodartsLink || m.autodartsLink,
            }
          : m
      )
    );
  }, []);

  const addMatch = useCallback((player1Id: string, player2Id: string, date: string) => {
    const p1 = basePlayers.find((p) => p.id === player1Id);
    const p2 = basePlayers.find((p) => p.id === player2Id);
    if (!p1 || !p2) return;

    const newMatch: Match = {
      id: `m${Date.now()}`,
      player1Id, player2Id,
      player1Name: p1.name, player2Name: p2.name,
      status: "upcoming",
      date,
    };
    setMatches((prev) => [...prev, newMatch]);
  }, [basePlayers]);

  const addPendingPlayer = useCallback((name: string) => {
    const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const newPlayer: Player = {
      id: `p${Date.now()}`,
      name, avatar: initials,
      wins: 0, losses: 0, draws: 0, points: 0,
      legsWon: 0, legsLost: 0, avg: 0,
      highestCheckout: 0, oneEighties: 0,
      form: [], badges: ["🆕 Nowy Gracz"],
      approved: false,
    };
    setPendingPlayers((prev) => [...prev, newPlayer]);
  }, []);

  const approvePlayer = useCallback((playerId: string) => {
    setPendingPlayers((prev) => {
      const player = prev.find((p) => p.id === playerId);
      if (player) {
        setBasePlayers((bp) => [...bp, { ...player, approved: true }]);
      }
      return prev.filter((p) => p.id !== playerId);
    });
  }, []);

  return (
    <LeagueContext.Provider value={{ players, matches, submitMatchResult, addMatch, approvePlayer, pendingPlayers, addPendingPlayer }}>
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeague = () => {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague must be used within LeagueProvider");
  return ctx;
};
