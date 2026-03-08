export type LeagueType = "league" | "bracket" | "group_bracket";

export interface BonusRules {
  win: number;       // points for win (default 3)
  draw: number;      // points for draw (default 1)
  per180: number;    // points per 180 scored (default 1)
  checkout100: number; // points for checkout 100+ (default 1)
  checkout150: number; // extra points for checkout 150+ (default 1)
  avg90: number;     // points for avg 90+ (default 1)
  avg100: number;    // extra points for avg 100+ (default 1)
  closeLoss: number; // points for loser if 1-leg difference (default 1)
  cleanSweep: number; // points for winner if opponent 0 legs (default 1)
}

export const DEFAULT_BONUS_RULES: BonusRules = {
  win: 3, draw: 1, per180: 1,
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
  meetings_per_pair?: number;
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
  bestFirst9Avg: number;
  bestAvgUntil170: number;
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
  first9Avg1?: number;
  first9Avg2?: number;
  avgUntil170_1?: number;
  avgUntil170_2?: number;
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
  // ─── MILESTONES: Mecze ───
  { id: "m1", name: "Pierwszy Mecz", description: "Rozegraj swój pierwszy mecz", icon: "🎯", rarity: "common", condition: (s) => s.matchesPlayed >= 1 },
  { id: "m2", name: "Regularny Gracz", description: "Rozegraj 5 meczów", icon: "🎯", rarity: "common", condition: (s) => s.matchesPlayed >= 5 },
  { id: "m3", name: "Weteran", description: "Rozegraj 10 meczów", icon: "🎖️", rarity: "rare", condition: (s) => s.matchesPlayed >= 10 },
  { id: "m4", name: "Gladiator", description: "Rozegraj 25 meczów", icon: "⚔️", rarity: "epic", condition: (s) => s.matchesPlayed >= 25 },
  { id: "m5", name: "Legenda Ligi", description: "Rozegraj 50 meczów", icon: "👑", rarity: "legendary", condition: (s) => s.matchesPlayed >= 50 },

  // ─── ZWYCIĘSTWA ───
  { id: "w1", name: "Pierwsze Zwycięstwo", description: "Wygraj swój pierwszy mecz", icon: "✊", rarity: "common", condition: (s) => s.wins >= 1 },
  { id: "w2", name: "5 Zwycięstw", description: "Wygraj 5 meczów", icon: "🏅", rarity: "common", condition: (s) => s.wins >= 5 },
  { id: "w3", name: "10 Zwycięstw", description: "Wygraj 10 meczów", icon: "🏆", rarity: "rare", condition: (s) => s.wins >= 10 },
  { id: "w4", name: "25 Zwycięstw", description: "Wygraj 25 meczów", icon: "🏆", rarity: "epic", condition: (s) => s.wins >= 25 },
  { id: "w5", name: "Niepokonany", description: "Wygraj 5 meczów bez porażki", icon: "⚡", rarity: "legendary", condition: (s) => s.wins >= 5 && s.losses === 0 },
  { id: "w6", name: "Dominacja", description: "Wygraj 10 meczów bez porażki", icon: "💀", rarity: "legendary", condition: (s) => s.wins >= 10 && s.losses === 0 },

  // ─── SERIE (FORMA) ───
  { id: "s1", name: "Seria 3 Wygranych", description: "Wygraj 3 mecze z rzędu", icon: "🔥", rarity: "rare", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 3; i++) { if (f[i]==="W"&&f[i+1]==="W"&&f[i+2]==="W") return true; } return false; }},
  { id: "s2", name: "Seria 5 Wygranych", description: "Wygraj 5 meczów z rzędu", icon: "🔥🔥", rarity: "epic", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 5; i++) { if (f.slice(i,i+5).every(x=>x==="W")) return true; } return false; }},
  { id: "s3", name: "Nieśmiertelny", description: "Wygraj 7 meczów z rzędu", icon: "🔥🔥🔥", rarity: "legendary", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 7; i++) { if (f.slice(i,i+7).every(x=>x==="W")) return true; } return false; }},

  // ─── 180-tki ───
  { id: "e1", name: "Pierwsza 180", description: "Rzuć swoją pierwszą 180-tkę", icon: "🎲", rarity: "common", condition: (s) => s.oneEighties >= 1 },
  { id: "e2", name: "180 Adept", description: "Rzuć 5x 180", icon: "🎯", rarity: "rare", condition: (s) => s.oneEighties >= 5 },
  { id: "e3", name: "180 Master", description: "Rzuć 10x 180", icon: "💯", rarity: "epic", condition: (s) => s.oneEighties >= 10 },
  { id: "e4", name: "180 Bóg", description: "Rzuć 25x 180", icon: "👁️", rarity: "legendary", condition: (s) => s.oneEighties >= 25 },
  { id: "e5", name: "180 Legenda", description: "Rzuć 50x 180", icon: "🌟", rarity: "legendary", condition: (s) => s.oneEighties >= 50 },

  // ─── CHECKOUTY ───
  { id: "c1", name: "Checkout Snajper", description: "Zamknij lega powyżej 100", icon: "🎯", rarity: "rare", condition: (s) => s.highestCheckout >= 100 },
  { id: "c2", name: "Wielki Checkout", description: "Zamknij lega powyżej 150", icon: "💎", rarity: "legendary", condition: (s) => s.highestCheckout >= 150 },
  { id: "c3", name: "Checkout Maszyna", description: "Checkout rate powyżej 30%", icon: "🔧", rarity: "rare", condition: (s) => s.checkoutRate >= 30 && s.checkoutAttempts >= 10 },
  { id: "c4", name: "Checkout Artysta", description: "Checkout rate powyżej 50%", icon: "🎨", rarity: "epic", condition: (s) => s.checkoutRate >= 50 && s.checkoutAttempts >= 10 },
  { id: "c5", name: "Lodowy Checkout", description: "Checkout rate powyżej 60%", icon: "❄️", rarity: "legendary", condition: (s) => s.checkoutRate >= 60 && s.checkoutAttempts >= 15 },

  // ─── ŚREDNIE ───
  { id: "a1", name: "Średnia 50+", description: "Osiągnij średnią 50 lub wyższą", icon: "📊", rarity: "common", condition: (s) => s.avg >= 50 && s.matchesPlayed >= 3 },
  { id: "a2", name: "Średnia 60+", description: "Osiągnij średnią 60 lub wyższą", icon: "📊", rarity: "common", condition: (s) => s.avg >= 60 && s.matchesPlayed >= 3 },
  { id: "a3", name: "Średnia 70+", description: "Osiągnij średnią 70 lub wyższą", icon: "📈", rarity: "rare", condition: (s) => s.avg >= 70 && s.matchesPlayed >= 3 },
  { id: "a4", name: "Średnia 80+", description: "Osiągnij średnią 80 lub wyższą", icon: "📈", rarity: "epic", condition: (s) => s.avg >= 80 && s.matchesPlayed >= 3 },
  { id: "a5", name: "Średnia 90+", description: "Osiągnij średnią 90 lub wyższą", icon: "🌟", rarity: "legendary", condition: (s) => s.avg >= 90 && s.matchesPlayed >= 3 },
  { id: "a6", name: "Perfekcjonista", description: "Najlepsza średnia w meczu powyżej 90", icon: "✨", rarity: "epic", condition: (s) => s.bestAvg >= 90 },
  { id: "a7", name: "Maszyna do Punktów", description: "Najlepsza średnia w meczu powyżej 100", icon: "🤖", rarity: "legendary", condition: (s) => s.bestAvg >= 100 },

  // ─── PIERWSZA 9 ŚREDNIA ───
  { id: "f1", name: "Szybki Start", description: "Średnia z pierwszych 9 rzutów powyżej 60", icon: "⚡", rarity: "common", condition: (s) => s.bestFirst9Avg >= 60 },
  { id: "f2", name: "Rakieta", description: "Średnia z pierwszych 9 rzutów powyżej 80", icon: "🚀", rarity: "rare", condition: (s) => s.bestFirst9Avg >= 80 },
  { id: "f3", name: "Błyskawica", description: "Średnia z pierwszych 9 rzutów powyżej 100", icon: "⚡", rarity: "epic", condition: (s) => s.bestFirst9Avg >= 100 },
  { id: "f4", name: "Perfekcyjny Start", description: "Średnia z pierwszych 9 rzutów powyżej 120", icon: "💫", rarity: "legendary", condition: (s) => s.bestFirst9Avg >= 120 },

  // ─── ŚREDNIA DO 170 ───
  { id: "u1", name: "Punktująca Maszyna", description: "Średnia do 170 powyżej 60", icon: "📊", rarity: "common", condition: (s) => s.bestAvgUntil170 >= 60 },
  { id: "u2", name: "Ciężki Scorer", description: "Średnia do 170 powyżej 80", icon: "💪", rarity: "rare", condition: (s) => s.bestAvgUntil170 >= 80 },
  { id: "u3", name: "Potęga Punktów", description: "Średnia do 170 powyżej 100", icon: "🔥", rarity: "epic", condition: (s) => s.bestAvgUntil170 >= 100 },
  { id: "u4", name: "Legenda Scoringu", description: "Średnia do 170 powyżej 120", icon: "👑", rarity: "legendary", condition: (s) => s.bestAvgUntil170 >= 120 },

  // ─── TONY (SCORING) ───
  { id: "t1", name: "Ton 60 Początkujący", description: "Zbierz 10 wyników Ton 60", icon: "🎰", rarity: "common", condition: (s) => s.ton60 >= 10 },
  { id: "t2", name: "Ton 80 Kolekcjoner", description: "Zbierz 15 wyników Ton 80", icon: "🃏", rarity: "rare", condition: (s) => s.ton80 >= 15 },
  { id: "t3", name: "Ton+ Łowca", description: "Rzuć 20 wyników powyżej 100", icon: "🎪", rarity: "epic", condition: (s) => s.tonPlus >= 20 },
  { id: "t4", name: "Ton Kolekcjoner", description: "Zbierz łącznie 50 tonów (60+80+100+)", icon: "💰", rarity: "epic", condition: (s) => (s.ton60 + s.ton80 + s.tonPlus) >= 50 },
  { id: "t5", name: "Ton Milioner", description: "Zbierz łącznie 100 tonów", icon: "💎", rarity: "legendary", condition: (s) => (s.ton60 + s.ton80 + s.tonPlus) >= 100 },

  // ─── PROCENT WYGRANYCH ───
  { id: "r1", name: "Ponad Połowa", description: "Procent wygranych powyżej 50% (min. 5 meczów)", icon: "📊", rarity: "common", condition: (s) => s.winRate > 50 && s.matchesPlayed >= 5 },
  { id: "r2", name: "Wysoki Procent", description: "Procent wygranych powyżej 75% (min. 5 meczów)", icon: "🏅", rarity: "epic", condition: (s) => s.winRate >= 75 && s.matchesPlayed >= 5 },
  { id: "r3", name: "Absolutny Dominat", description: "Procent wygranych powyżej 90% (min. 8 meczów)", icon: "👑", rarity: "legendary", condition: (s) => s.winRate >= 90 && s.matchesPlayed >= 8 },

  // ─── LEGI ───
  { id: "l1", name: "10 Legów", description: "Wygraj 10 legów w lidze", icon: "🦵", rarity: "common", condition: (s) => s.legsWon >= 10 },
  { id: "l2", name: "50 Legów", description: "Wygraj 50 legów w lidze", icon: "🦿", rarity: "rare", condition: (s) => s.legsWon >= 50 },
  { id: "l3", name: "100 Legów", description: "Wygraj 100 legów w lidze", icon: "💪", rarity: "epic", condition: (s) => s.legsWon >= 100 },
  { id: "l4", name: "Maszyna do Legów", description: "Wygraj 200 legów w lidze", icon: "🦾", rarity: "legendary", condition: (s) => s.legsWon >= 200 },

  // ─── DARTY ───
  { id: "d1", name: "Rzucający Gracz", description: "Rzuć ponad 200 dartsów", icon: "🎯", rarity: "common", condition: (s) => s.totalDartsThrown >= 200 },
  { id: "d2", name: "Rzucająca Maszyna", description: "Rzuć ponad 500 dartsów", icon: "🤖", rarity: "rare", condition: (s) => s.totalDartsThrown >= 500 },
  { id: "d3", name: "Rzucający Fanatyk", description: "Rzuć ponad 1000 dartsów", icon: "🔨", rarity: "epic", condition: (s) => s.totalDartsThrown >= 1000 },
  { id: "d4", name: "Dart Maniak", description: "Rzuć ponad 2000 dartsów", icon: "🌪️", rarity: "legendary", condition: (s) => s.totalDartsThrown >= 2000 },

  // ─── SPECJALNE ───
  { id: "x1", name: "Czyste Konto", description: "Wygraj mecz bez straty lega (min. 3 legi)", icon: "🧹", rarity: "epic", condition: (s) => s.legsWon >= 3 && s.wins >= 1 },
  { id: "x2", name: "Punktowy Potwór", description: "Zdobądź ponad 30 punktów w lidze", icon: "🐉", rarity: "epic", condition: (s) => s.points >= 30 },
  { id: "x3", name: "Punktowy Tyran", description: "Zdobądź ponad 50 punktów w lidze", icon: "👹", rarity: "legendary", condition: (s) => s.points >= 50 },
  { id: "x4", name: "Łowca Bonusów", description: "Zdobądź ponad 10 punktów bonusowych", icon: "💫", rarity: "rare", condition: (s) => s.bonusPoints >= 10 },
  { id: "x5", name: "Król Bonusów", description: "Zdobądź ponad 25 punktów bonusowych", icon: "🌠", rarity: "epic", condition: (s) => s.bonusPoints >= 25 },
  { id: "x6", name: "Wieloligowiec", description: "Rozegraj mecze w 2 różnych ligach", icon: "🌍", rarity: "rare", condition: (s) => s.matchesPlayed >= 1 },
  { id: "x7", name: "Pierwszy Checkout 80+", description: "Zamknij lega checkoutem 80+", icon: "🎯", rarity: "common", condition: (s) => s.highestCheckout >= 80 },
  { id: "x8", name: "Podwójna Setka", description: "Średnia 100+ i checkout 100+ w jednej lidze", icon: "💯", rarity: "legendary", condition: (s) => s.avg >= 100 && s.highestCheckout >= 100 && s.matchesPlayed >= 3 },
  { id: "x9", name: "Kompletny Gracz", description: "Średnia 70+, checkout 80+, min. 5 wygranych", icon: "🏅", rarity: "epic", condition: (s) => s.avg >= 70 && s.highestCheckout >= 80 && s.wins >= 5 },
  { id: "x10", name: "Żelazna Forma", description: "5 meczów z rzędu bez porażki i średnia 60+", icon: "🛡️", rarity: "epic", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 5; i++) { if (f.slice(i,i+5).every(x=>x!=="L") && s.avg >= 60) return true; } return false; }},

];
