export interface League {
  id: string;
  name: string;
  season: string;
  description: string;
  isActive: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  approved: boolean;
}

export interface PlayerLeagueStats {
  playerId: string;
  leagueId: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  legsWon: number;
  legsLost: number;
  avg: number;
  highestCheckout: number;
  oneEighties: number;
  form: ("W" | "L" | "D")[];
  badges: string[];
  matchesPlayed: number;
  bestAvg: number;
  totalDartsThrown: number;
  ton40: number;
  ton60: number;
  ton80: number;
  tonPlus: number;
}

export interface Match {
  id: string;
  leagueId: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  score1?: number;
  score2?: number;
  legsWon1?: number;
  legsWon2?: number;
  status: "upcoming" | "completed" | "pending";
  date: string;
  round?: number;
  autodartsLink?: string;
  rawData?: object;
  oneEighties1?: number;
  oneEighties2?: number;
  highCheckout1?: number;
  highCheckout2?: number;
  avg1?: number;
  avg2?: number;
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
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: PlayerLeagueStats) => boolean;
}

export const achievements: Achievement[] = [
  { id: "a1", name: "Pierwszy Mecz", description: "Rozegraj swój pierwszy mecz", icon: "🎯", condition: (s) => s.matchesPlayed >= 1 },
  { id: "a2", name: "Seria 3 Wygranych", description: "Wygraj 3 mecze z rzędu", icon: "🔥", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 3; i++) { if (f[i]==="W"&&f[i+1]==="W"&&f[i+2]==="W") return true; } return false; }},
  { id: "a3", name: "Seria 5 Wygranych", description: "Wygraj 5 meczów z rzędu", icon: "🔥🔥", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 5; i++) { if (f.slice(i,i+5).every(x=>x==="W")) return true; } return false; }},
  { id: "a4", name: "180 Master", description: "Rzuć 10 lub więcej 180-tek w lidze", icon: "💯", condition: (s) => s.oneEighties >= 10 },
  { id: "a5", name: "Pierwsza 180", description: "Rzuć swoją pierwszą 180-tkę", icon: "🎲", condition: (s) => s.oneEighties >= 1 },
  { id: "a6", name: "Checkout Snajper", description: "Zamknij lega powyżej 100", icon: "🎯", condition: (s) => s.highestCheckout >= 100 },
  { id: "a7", name: "Wielki Checkout", description: "Zamknij lega powyżej 150", icon: "💎", condition: (s) => s.highestCheckout >= 150 },
  { id: "a8", name: "Średnia 70+", description: "Osiągnij średnią 70 lub wyższą", icon: "📊", condition: (s) => s.avg >= 70 },
  { id: "a9", name: "Średnia 80+", description: "Osiągnij średnią 80 lub wyższą", icon: "📈", condition: (s) => s.avg >= 80 },
  { id: "a10", name: "10 Zwycięstw", description: "Wygraj 10 meczów w lidze", icon: "🏆", condition: (s) => s.wins >= 10 },
  { id: "a11", name: "Niepokonany", description: "Wygraj 5 meczów bez porażki", icon: "⚡", condition: (s) => s.wins >= 5 && s.losses === 0 },
  { id: "a12", name: "Ton+ Hunter", description: "Rzuć 20 wyników powyżej 100 w lidze", icon: "🎪", condition: (s) => s.tonPlus >= 20 },
];

export const leagues: League[] = [
  { id: "l1", name: "Liga Główna", season: "Wiosna 2026", description: "Główna liga darta — rywalizacja o mistrzostwo", isActive: true },
  { id: "l2", name: "Liga Amatorska", season: "Wiosna 2026", description: "Liga dla początkujących i średnio-zaawansowanych graczy", isActive: true },
  { id: "l3", name: "Puchar Zimowy", season: "Zima 2025/26", description: "Turniej pucharowy — faza grupowa", isActive: false },
];

export const players: Player[] = [
  { id: "1", name: "Krzysztof Nowak", avatar: "KN", approved: true },
  { id: "2", name: "Anna Wiśniewska", avatar: "AW", approved: true },
  { id: "3", name: "Tomasz Kowalski", avatar: "TK", approved: true },
  { id: "4", name: "Magdalena Zielińska", avatar: "MZ", approved: true },
  { id: "5", name: "Piotr Kamiński", avatar: "PK", approved: true },
  { id: "6", name: "Ewa Dąbrowska", avatar: "ED", approved: true },
  { id: "7", name: "Marek Lewandowski", avatar: "ML", approved: true },
  { id: "8", name: "Julia Wójcik", avatar: "JW", approved: true },
];

export const matches: Match[] = [
  // Liga Główna
  { id: "m1", leagueId: "l1", player1Id: "1", player2Id: "2", player1Name: "Krzysztof Nowak", player2Name: "Anna Wiśniewska", score1: 3, score2: 1, legsWon1: 3, legsWon2: 1, status: "completed", date: "2026-03-05", round: 1, oneEighties1: 2, oneEighties2: 0, highCheckout1: 120, highCheckout2: 80, avg1: 78.2, avg2: 65.1, ton40_1: 5, ton40_2: 3, ton60_1: 3, ton60_2: 2, ton80_1: 2, ton80_2: 1, tonPlus1: 1, tonPlus2: 0, dartsThrown1: 72, dartsThrown2: 68, autodartsLink: "https://autodarts.io/matches/abc123" },
  { id: "m2", leagueId: "l1", player1Id: "3", player2Id: "4", player1Name: "Tomasz Kowalski", player2Name: "Magdalena Zielińska", score1: 3, score2: 2, legsWon1: 3, legsWon2: 2, status: "completed", date: "2026-03-04", round: 1, oneEighties1: 3, oneEighties2: 1, highCheckout1: 132, highCheckout2: 98, avg1: 71.0, avg2: 62.5, ton40_1: 4, ton40_2: 3, ton60_1: 3, ton60_2: 2, ton80_1: 1, ton80_2: 0, tonPlus1: 0, tonPlus2: 1, dartsThrown1: 85, dartsThrown2: 90 },
  { id: "m3", leagueId: "l1", player1Id: "5", player2Id: "6", player1Name: "Piotr Kamiński", player2Name: "Ewa Dąbrowska", score1: 2, score2: 3, legsWon1: 2, legsWon2: 3, status: "completed", date: "2026-03-03", round: 1, oneEighties1: 0, oneEighties2: 1, highCheckout1: 88, highCheckout2: 98, avg1: 55.3, avg2: 59.7, ton40_1: 2, ton40_2: 4, ton60_1: 1, ton60_2: 2, ton80_1: 0, ton80_2: 1, tonPlus1: 0, tonPlus2: 0, dartsThrown1: 95, dartsThrown2: 88 },
  { id: "m4", leagueId: "l1", player1Id: "1", player2Id: "3", player1Name: "Krzysztof Nowak", player2Name: "Tomasz Kowalski", status: "upcoming", date: "2026-03-10", round: 2 },
  { id: "m5", leagueId: "l1", player1Id: "2", player2Id: "5", player1Name: "Anna Wiśniewska", player2Name: "Piotr Kamiński", status: "upcoming", date: "2026-03-11", round: 2 },
  { id: "m6", leagueId: "l1", player1Id: "4", player2Id: "6", player1Name: "Magdalena Zielińska", player2Name: "Ewa Dąbrowska", status: "upcoming", date: "2026-03-12", round: 2 },
  { id: "m7", leagueId: "l1", player1Id: "7", player2Id: "8", player1Name: "Marek Lewandowski", player2Name: "Julia Wójcik", status: "upcoming", date: "2026-03-13", round: 2 },

  // Liga Amatorska
  { id: "m10", leagueId: "l2", player1Id: "5", player2Id: "7", player1Name: "Piotr Kamiński", player2Name: "Marek Lewandowski", score1: 3, score2: 0, legsWon1: 3, legsWon2: 0, status: "completed", date: "2026-03-02", round: 1, oneEighties1: 1, oneEighties2: 0, highCheckout1: 76, highCheckout2: 45, avg1: 52.1, avg2: 41.3, ton40_1: 3, ton40_2: 1, ton60_1: 1, ton60_2: 0, ton80_1: 0, ton80_2: 0, tonPlus1: 0, tonPlus2: 0, dartsThrown1: 60, dartsThrown2: 55 },
  { id: "m11", leagueId: "l2", player1Id: "6", player2Id: "8", player1Name: "Ewa Dąbrowska", player2Name: "Julia Wójcik", score1: 2, score2: 3, legsWon1: 2, legsWon2: 3, status: "completed", date: "2026-03-02", round: 1, oneEighties1: 0, oneEighties2: 0, highCheckout1: 55, highCheckout2: 68, avg1: 43.2, avg2: 48.7, ton40_1: 2, ton40_2: 3, ton60_1: 0, ton60_2: 1, ton80_1: 0, ton80_2: 0, tonPlus1: 0, tonPlus2: 0, dartsThrown1: 92, dartsThrown2: 88 },
  { id: "m12", leagueId: "l2", player1Id: "5", player2Id: "8", player1Name: "Piotr Kamiński", player2Name: "Julia Wójcik", status: "upcoming", date: "2026-03-14", round: 2 },
  { id: "m13", leagueId: "l2", player1Id: "6", player2Id: "7", player1Name: "Ewa Dąbrowska", player2Name: "Marek Lewandowski", status: "upcoming", date: "2026-03-14", round: 2 },
];
