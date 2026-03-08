export interface Player {
  id: string;
  name: string;
  avatar: string;
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
  approved: boolean;
}

export interface Match {
  id: string;
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
  autodartsLink?: string;
  rawData?: object;
  oneEighties1?: number;
  oneEighties2?: number;
  highCheckout1?: number;
  highCheckout2?: number;
  avg1?: number;
  avg2?: number;
}

export const players: Player[] = [
  {
    id: "1", name: "Krzysztof Nowak", avatar: "KN", wins: 12, losses: 3, draws: 1, points: 37,
    legsWon: 48, legsLost: 22, avg: 72.4, highestCheckout: 156, oneEighties: 8,
    form: ["W", "W", "L", "W", "W"], badges: ["🎯 Snajper", "🔥 Seria 5W"], approved: true,
  },
  {
    id: "2", name: "Anna Wiśniewska", avatar: "AW", wins: 10, losses: 4, draws: 2, points: 32,
    legsWon: 42, legsLost: 28, avg: 68.1, highestCheckout: 140, oneEighties: 5,
    form: ["W", "L", "W", "W", "D"], badges: ["💎 Checkout Queen"], approved: true,
  },
  {
    id: "3", name: "Tomasz Kowalski", avatar: "TK", wins: 9, losses: 5, draws: 2, points: 29,
    legsWon: 38, legsLost: 30, avg: 65.3, highestCheckout: 132, oneEighties: 12,
    form: ["L", "W", "W", "L", "W"], badges: ["💯 180 Master"], approved: true,
  },
  {
    id: "4", name: "Magdalena Zielińska", avatar: "MZ", wins: 8, losses: 6, draws: 2, points: 26,
    legsWon: 35, legsLost: 32, avg: 61.8, highestCheckout: 120, oneEighties: 3,
    form: ["D", "W", "L", "W", "L"], badges: ["⚡ Debiutant Sezonu"], approved: true,
  },
  {
    id: "5", name: "Piotr Kamiński", avatar: "PK", wins: 7, losses: 7, draws: 2, points: 23,
    legsWon: 32, legsLost: 34, avg: 58.9, highestCheckout: 110, oneEighties: 2,
    form: ["L", "L", "W", "W", "W"], badges: [], approved: true,
  },
  {
    id: "6", name: "Ewa Dąbrowska", avatar: "ED", wins: 6, losses: 8, draws: 2, points: 20,
    legsWon: 28, legsLost: 38, avg: 55.2, highestCheckout: 98, oneEighties: 1,
    form: ["W", "L", "L", "L", "W"], badges: ["🆕 Nowy Gracz"], approved: true,
  },
  {
    id: "7", name: "Marek Lewandowski", avatar: "ML", wins: 5, losses: 9, draws: 2, points: 17,
    legsWon: 25, legsLost: 40, avg: 52.1, highestCheckout: 88, oneEighties: 0,
    form: ["L", "L", "W", "L", "L"], badges: [], approved: true,
  },
  {
    id: "8", name: "Julia Wójcik", avatar: "JW", wins: 4, losses: 10, draws: 2, points: 14,
    legsWon: 20, legsLost: 44, avg: 48.7, highestCheckout: 76, oneEighties: 0,
    form: ["L", "W", "L", "L", "L"], badges: [], approved: true,
  },
];

export const matches: Match[] = [
  {
    id: "m1", player1Id: "1", player2Id: "2", player1Name: "Krzysztof Nowak", player2Name: "Anna Wiśniewska",
    score1: 3, score2: 1, legsWon1: 3, legsWon2: 1, status: "completed", date: "2026-03-05",
    oneEighties1: 2, oneEighties2: 0, highCheckout1: 120, highCheckout2: 80, avg1: 78.2, avg2: 65.1,
    autodartsLink: "https://autodarts.io/matches/abc123",
  },
  {
    id: "m2", player1Id: "3", player2Id: "4", player1Name: "Tomasz Kowalski", player2Name: "Magdalena Zielińska",
    score1: 3, score2: 2, legsWon1: 3, legsWon2: 2, status: "completed", date: "2026-03-04",
    oneEighties1: 3, oneEighties2: 1, highCheckout1: 132, highCheckout2: 98, avg1: 71.0, avg2: 62.5,
  },
  {
    id: "m3", player1Id: "5", player2Id: "6", player1Name: "Piotr Kamiński", player2Name: "Ewa Dąbrowska",
    score1: 2, score2: 3, legsWon1: 2, legsWon2: 3, status: "completed", date: "2026-03-03",
    oneEighties1: 0, oneEighties2: 1, highCheckout1: 88, highCheckout2: 98, avg1: 55.3, avg2: 59.7,
  },
  {
    id: "m4", player1Id: "1", player2Id: "3", player1Name: "Krzysztof Nowak", player2Name: "Tomasz Kowalski",
    status: "upcoming", date: "2026-03-10",
  },
  {
    id: "m5", player1Id: "2", player2Id: "5", player1Name: "Anna Wiśniewska", player2Name: "Piotr Kamiński",
    status: "upcoming", date: "2026-03-11",
  },
  {
    id: "m6", player1Id: "4", player2Id: "6", player1Name: "Magdalena Zielińska", player2Name: "Ewa Dąbrowska",
    status: "upcoming", date: "2026-03-12",
  },
  {
    id: "m7", player1Id: "7", player2Id: "8", player1Name: "Marek Lewandowski", player2Name: "Julia Wójcik",
    status: "upcoming", date: "2026-03-13",
  },
];
