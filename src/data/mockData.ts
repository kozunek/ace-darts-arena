export type LeagueType = "league" | "bracket" | "group_bracket";

export interface BonusRules {
  win: number;       // points for win (default 3)
  draw: number;      // points for draw (default 1)
  per180: number;    // points per 180 scored (default 1)
  nineDarter: number; // points per 9-darter (default 3)
  checkout100: number; // points for checkout 100+ (default 1)
  checkout150: number; // extra points for checkout 150+ (default 1)
  avg90: number;     // points for avg 90+ (default 1)
  avg100: number;    // extra points for avg 100+ (default 1)
  closeLoss: number; // points for loser if 1-leg difference (default 1)
  cleanSweep: number; // points for winner if opponent 0 legs (default 1)
}

export const DEFAULT_BONUS_RULES: BonusRules = {
  win: 3, draw: 1, per180: 1, nineDarter: 3,
  checkout100: 1, checkout150: 1, avg90: 1, avg100: 1,
  closeLoss: 1, cleanSweep: 1,
};

export interface League {
  id: string;
  name: string;
  season: string;
  description: string;
  is_active: boolean;
  format?: string;
  max_legs?: number;
  league_type: LeagueType;
  bonus_rules: BonusRules;
  registration_open?: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  avatar_url?: string | null;
  approved: boolean;
  leagueIds?: string[];
  phone?: string | null;
  discord?: string | null;
}

export interface PlayerLeagueStats {
  playerId: string;
  leagueId: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  basePoints: number;
  bonusPoints: number;
  legsWon: number;
  legsLost: number;
  avg: number;
  highestCheckout: number;
  oneEighties: number;
  nineDarters: number;
  form: ("W" | "L" | "D")[];
  badges: string[];
  matchesPlayed: number;
  bestAvg: number;
  totalDartsThrown: number;
  ton60: number;
  ton80: number;
  tonPlus: number;
  winRate: number;
  checkoutAttempts: number;
  checkoutHits: number;
  checkoutRate: number;
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
  status: "upcoming" | "completed" | "pending_approval";
  date: string;
  round?: number;
  autodartsLink?: string;
  oneEighties1?: number;
  oneEighties2?: number;
  highCheckout1?: number;
  highCheckout2?: number;
  avg1?: number;
  avg2?: number;
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
  bracketRound?: string;
  bracketPosition?: number;
  groupName?: string;
  nineDarters1?: number;
  nineDarters2?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  condition: (stats: PlayerLeagueStats) => boolean;
}

// All Best of formats
export const BEST_OF_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
  value: `Best of ${i + 1}`,
  label: `Best of ${i + 1}`,
  maxLegs: i + 1,
}));

export const achievements: Achievement[] = [
  { id: "a1", name: "Pierwszy Mecz", description: "Rozegraj swój pierwszy mecz", icon: "🎯", rarity: "common", condition: (s) => s.matchesPlayed >= 1 },
  { id: "a2", name: "Seria 3 Wygranych", description: "Wygraj 3 mecze z rzędu", icon: "🔥", rarity: "rare", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 3; i++) { if (f[i]==="W"&&f[i+1]==="W"&&f[i+2]==="W") return true; } return false; }},
  { id: "a3", name: "Seria 5 Wygranych", description: "Wygraj 5 meczów z rzędu", icon: "🔥🔥", rarity: "epic", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 5; i++) { if (f.slice(i,i+5).every(x=>x==="W")) return true; } return false; }},
  { id: "a4", name: "180 Master", description: "Rzuć 10 lub więcej 180-tek w lidze", icon: "💯", rarity: "epic", condition: (s) => s.oneEighties >= 10 },
  { id: "a5", name: "Pierwsza 180", description: "Rzuć swoją pierwszą 180-tkę", icon: "🎲", rarity: "common", condition: (s) => s.oneEighties >= 1 },
  { id: "a6", name: "Checkout Snajper", description: "Zamknij lega powyżej 100", icon: "🎯", rarity: "rare", condition: (s) => s.highestCheckout >= 100 },
  { id: "a7", name: "Wielki Checkout", description: "Zamknij lega powyżej 150", icon: "💎", rarity: "legendary", condition: (s) => s.highestCheckout >= 150 },
  { id: "a8", name: "Średnia 70+", description: "Osiągnij średnią 70 lub wyższą", icon: "📊", rarity: "rare", condition: (s) => s.avg >= 70 },
  { id: "a9", name: "Średnia 80+", description: "Osiągnij średnią 80 lub wyższą", icon: "📈", rarity: "epic", condition: (s) => s.avg >= 80 },
  { id: "a10", name: "10 Zwycięstw", description: "Wygraj 10 meczów w lidze", icon: "🏆", rarity: "rare", condition: (s) => s.wins >= 10 },
  { id: "a11", name: "Niepokonany", description: "Wygraj 5 meczów bez porażki", icon: "⚡", rarity: "legendary", condition: (s) => s.wins >= 5 && s.losses === 0 },
  { id: "a12", name: "Ton+ Hunter", description: "Rzuć 20 wyników powyżej 100 w lidze", icon: "🎪", rarity: "epic", condition: (s) => s.tonPlus >= 20 },
  { id: "a13", name: "Rzucający Maszyna", description: "Rzuć ponad 500 dartsów w lidze", icon: "🤖", rarity: "rare", condition: (s) => s.totalDartsThrown >= 500 },
  { id: "a14", name: "Perfekcjonista", description: "Osiągnij najlepszą średnią powyżej 90", icon: "🌟", rarity: "legendary", condition: (s) => s.bestAvg >= 90 },
  { id: "a15", name: "Ton 80 Kolekcjoner", description: "Zbierz 15 wyników Ton 80 (80-99)", icon: "🃏", rarity: "rare", condition: (s) => s.ton80 >= 15 },
  { id: "a16", name: "Wysoki Win Rate", description: "Osiągnij win rate powyżej 75%", icon: "🏅", rarity: "epic", condition: (s) => s.winRate >= 75 && s.matchesPlayed >= 4 },
];
