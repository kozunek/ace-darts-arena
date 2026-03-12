export type LeagueType = "league" | "bracket" | "group_bracket";
export type LeaguePlatform = "autodarts" | "dartcounter" | "dartsmind" | "manual";

export interface BonusRules {
  win: number;       // punkty za wygraną (domyślnie 3)
  per180: number;    // punkty za każdą 180 (domyślnie 1)
  checkout100: number; // punkty za checkout 100+ (domyślnie 1)
  checkout150: number; // dodatkowe punkty za checkout 150+ (domyślnie 1)
  avg90: number;     // punkty za średnią 90+ (domyślnie 1)
  avg100: number;    // dodatkowe punkty za średnią 100+ (domyślnie 1)
  closeLoss: number; // punkty za przegraną różnicą 1 lega (domyślnie 1)
  cleanSweep: number; // punkty za wygraną do zera (domyślnie 1)
}

export const DEFAULT_BONUS_RULES: BonusRules = {
  win: 3, per180: 1,
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
  registration_deadline?: string | null;
  platform?: LeaguePlatform;
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
  points: number;
  basePoints: number;
  bonusPoints: number;
  legsWon: number;
  legsLost: number;
  avg: number;
  highestCheckout: number;
  oneEighties: number;
  form: ("W" | "L")[];
  badges: string[];
  matchesPlayed: number;
  bestAvg: number;
  totalDartsThrown: number;
  ton60: number;
  ton80: number;
  tonPlus: number;
  ton40: number;
  winRate: number;
  checkoutAttempts: number;
  checkoutHits: number;
  checkoutRate: number;
  bestFirst9Avg: number;
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
  ton40_1?: number;
  ton40_2?: number;
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
  confirmedDate?: string | null;
  screenshotUrls?: string[];
  sourcePlatform?: string;
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
  // ═══════════════════════════════════════════════
  // ─── MILESTONY: Mecze (m1-m14) ───
  // ═══════════════════════════════════════════════
  { id: "m1", name: "Pierwszy Mecz", description: "Rozegraj swój pierwszy mecz", icon: "🎯", rarity: "common", condition: (s) => s.matchesPlayed >= 1 },
  { id: "m2", name: "Debiutant", description: "Rozegraj 3 mecze", icon: "🌱", rarity: "common", condition: (s) => s.matchesPlayed >= 3 },
  { id: "m3", name: "Regularny Gracz", description: "Rozegraj 5 meczów", icon: "🎯", rarity: "common", condition: (s) => s.matchesPlayed >= 5 },
  { id: "m4", name: "Weteran", description: "Rozegraj 10 meczów", icon: "🎖️", rarity: "rare", condition: (s) => s.matchesPlayed >= 10 },
  { id: "m5", name: "Doświadczony", description: "Rozegraj 15 meczów", icon: "🎖️", rarity: "rare", condition: (s) => s.matchesPlayed >= 15 },
  { id: "m6", name: "Wytrwały", description: "Rozegraj 20 meczów", icon: "💪", rarity: "rare", condition: (s) => s.matchesPlayed >= 20 },
  { id: "m7", name: "Gladiator", description: "Rozegraj 25 meczów", icon: "⚔️", rarity: "epic", condition: (s) => s.matchesPlayed >= 25 },
  { id: "m8", name: "Zawodowiec", description: "Rozegraj 30 meczów", icon: "🏟️", rarity: "epic", condition: (s) => s.matchesPlayed >= 30 },
  { id: "m9", name: "Nieustraszony", description: "Rozegraj 40 meczów", icon: "🛡️", rarity: "epic", condition: (s) => s.matchesPlayed >= 40 },
  { id: "m10", name: "Legenda Ligi", description: "Rozegraj 50 meczów", icon: "👑", rarity: "legendary", condition: (s) => s.matchesPlayed >= 50 },
  { id: "m11", name: "Żelazny Gracz", description: "Rozegraj 75 meczów", icon: "🦾", rarity: "legendary", condition: (s) => s.matchesPlayed >= 75 },
  { id: "m12", name: "Setka Meczów", description: "Rozegraj 100 meczów", icon: "💯", rarity: "legendary", condition: (s) => s.matchesPlayed >= 100 },
  { id: "m13", name: "Maraton Dartsowy", description: "Rozegraj 150 meczów", icon: "🏃", rarity: "legendary", condition: (s) => s.matchesPlayed >= 150 },
  { id: "m14", name: "200 Meczów", description: "Rozegraj 200 meczów", icon: "🏛️", rarity: "legendary", condition: (s) => s.matchesPlayed >= 200 },

  // ═══════════════════════════════════════════════
  // ─── ZWYCIĘSTWA (w1-w12) ───
  // ═══════════════════════════════════════════════
  { id: "w1", name: "Pierwsze Zwycięstwo", description: "Wygraj swój pierwszy mecz", icon: "✊", rarity: "common", condition: (s) => s.wins >= 1 },
  { id: "w2", name: "3 Zwycięstwa", description: "Wygraj 3 mecze", icon: "✌️", rarity: "common", condition: (s) => s.wins >= 3 },
  { id: "w3", name: "5 Zwycięstw", description: "Wygraj 5 meczów", icon: "🏅", rarity: "common", condition: (s) => s.wins >= 5 },
  { id: "w4", name: "10 Zwycięstw", description: "Wygraj 10 meczów", icon: "🏆", rarity: "rare", condition: (s) => s.wins >= 10 },
  { id: "w5", name: "15 Zwycięstw", description: "Wygraj 15 meczów", icon: "🏆", rarity: "rare", condition: (s) => s.wins >= 15 },
  { id: "w6", name: "20 Zwycięstw", description: "Wygraj 20 meczów", icon: "🥇", rarity: "epic", condition: (s) => s.wins >= 20 },
  { id: "w7", name: "25 Zwycięstw", description: "Wygraj 25 meczów", icon: "🥇", rarity: "epic", condition: (s) => s.wins >= 25 },
  { id: "w8", name: "30 Zwycięstw", description: "Wygraj 30 meczów", icon: "🏆", rarity: "epic", condition: (s) => s.wins >= 30 },
  { id: "w9", name: "40 Zwycięstw", description: "Wygraj 40 meczów", icon: "🏆", rarity: "epic", condition: (s) => s.wins >= 40 },
  { id: "w10", name: "50 Zwycięstw", description: "Wygraj 50 meczów", icon: "🥇", rarity: "legendary", condition: (s) => s.wins >= 50 },
  { id: "w11", name: "75 Zwycięstw", description: "Wygraj 75 meczów", icon: "👑", rarity: "legendary", condition: (s) => s.wins >= 75 },
  { id: "w12", name: "100 Zwycięstw", description: "Wygraj 100 meczów", icon: "💎", rarity: "legendary", condition: (s) => s.wins >= 100 },

  // ═══════════════════════════════════════════════
  // ─── BEZ PORAŻKI (u1-u4) ───
  // ═══════════════════════════════════════════════
  { id: "u1", name: "Niepokonany 5", description: "Wygraj 5 meczów bez porażki", icon: "⚡", rarity: "epic", condition: (s) => s.wins >= 5 && s.losses === 0 },
  { id: "u2", name: "Niepokonany 10", description: "Wygraj 10 meczów bez porażki", icon: "💀", rarity: "legendary", condition: (s) => s.wins >= 10 && s.losses === 0 },
  { id: "u3", name: "Niepokonany 15", description: "Wygraj 15 meczów bez porażki", icon: "🔥", rarity: "legendary", condition: (s) => s.wins >= 15 && s.losses === 0 },
  { id: "u4", name: "Niepokonany 20", description: "Wygraj 20 meczów bez porażki", icon: "👑", rarity: "legendary", condition: (s) => s.wins >= 20 && s.losses === 0 },

  // ═══════════════════════════════════════════════
  // ─── SERIE / FORMA (s1-s6) ───
  // ═══════════════════════════════════════════════
  { id: "s1", name: "Seria 3 Wygranych", description: "Wygraj 3 mecze z rzędu", icon: "🔥", rarity: "rare", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 3; i++) { if (f[i]==="W"&&f[i+1]==="W"&&f[i+2]==="W") return true; } return false; }},
  { id: "s2", name: "Seria 5 Wygranych", description: "Wygraj 5 meczów z rzędu", icon: "🔥🔥", rarity: "epic", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 5; i++) { if (f.slice(i,i+5).every(x=>x==="W")) return true; } return false; }},
  { id: "s3", name: "Nieśmiertelny", description: "Wygraj 7 meczów z rzędu", icon: "🔥🔥🔥", rarity: "legendary", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 7; i++) { if (f.slice(i,i+7).every(x=>x==="W")) return true; } return false; }},
  { id: "s4", name: "Seria 10 Wygranych", description: "Wygraj 10 meczów z rzędu", icon: "💥", rarity: "legendary", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 10; i++) { if (f.slice(i,i+10).every(x=>x==="W")) return true; } return false; }},
  { id: "s5", name: "Seria 15 Wygranych", description: "Wygraj 15 meczów z rzędu", icon: "🌋", rarity: "legendary", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 15; i++) { if (f.slice(i,i+15).every(x=>x==="W")) return true; } return false; }},
  { id: "s6", name: "Seria 20 Wygranych", description: "Wygraj 20 meczów z rzędu", icon: "☄️", rarity: "legendary", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 20; i++) { if (f.slice(i,i+20).every(x=>x==="W")) return true; } return false; }},

  // ═══════════════════════════════════════════════
  // ─── 180-tki (e1-e11) ───
  // ═══════════════════════════════════════════════
  { id: "e1", name: "Pierwsza 180", description: "Rzuć swoją pierwszą 180-tkę", icon: "🎲", rarity: "common", condition: (s) => s.oneEighties >= 1 },
  { id: "e2", name: "180 Kolekcjoner", description: "Rzuć 3x 180", icon: "🎰", rarity: "common", condition: (s) => s.oneEighties >= 3 },
  { id: "e3", name: "180 Adept", description: "Rzuć 5x 180", icon: "🎯", rarity: "rare", condition: (s) => s.oneEighties >= 5 },
  { id: "e4", name: "180 Mistrz", description: "Rzuć 10x 180", icon: "💯", rarity: "rare", condition: (s) => s.oneEighties >= 10 },
  { id: "e5", name: "180 Ekspert", description: "Rzuć 15x 180", icon: "🎯", rarity: "epic", condition: (s) => s.oneEighties >= 15 },
  { id: "e6", name: "180 Maszyna", description: "Rzuć 20x 180", icon: "🤖", rarity: "epic", condition: (s) => s.oneEighties >= 20 },
  { id: "e7", name: "180 Bóg", description: "Rzuć 25x 180", icon: "👁️", rarity: "epic", condition: (s) => s.oneEighties >= 25 },
  { id: "e8", name: "180 Snajper", description: "Rzuć 30x 180", icon: "🎯", rarity: "epic", condition: (s) => s.oneEighties >= 30 },
  { id: "e9", name: "180 Legenda", description: "Rzuć 50x 180", icon: "🌟", rarity: "legendary", condition: (s) => s.oneEighties >= 50 },
  { id: "e10", name: "180 Imperator", description: "Rzuć 75x 180", icon: "👑", rarity: "legendary", condition: (s) => s.oneEighties >= 75 },
  { id: "e11", name: "180 Bóstwo", description: "Rzuć 100x 180", icon: "🌠", rarity: "legendary", condition: (s) => s.oneEighties >= 100 },

  // ═══════════════════════════════════════════════
  // ─── NAJWYŻSZY CHECKOUT (c1-c10) ───
  // ═══════════════════════════════════════════════
  { id: "c1", name: "Checkout 60+", description: "Zamknij lega checkoutem 60+", icon: "🎯", rarity: "common", condition: (s) => s.highestCheckout >= 60 },
  { id: "c2", name: "Checkout 80+", description: "Zamknij lega checkoutem 80+", icon: "🎯", rarity: "common", condition: (s) => s.highestCheckout >= 80 },
  { id: "c3", name: "Checkout 100+", description: "Zamknij lega checkoutem 100+", icon: "🎯", rarity: "rare", condition: (s) => s.highestCheckout >= 100 },
  { id: "c4", name: "Checkout 110+", description: "Zamknij lega checkoutem 110+", icon: "💎", rarity: "rare", condition: (s) => s.highestCheckout >= 110 },
  { id: "c5", name: "Checkout 120+", description: "Zamknij lega checkoutem 120+", icon: "💎", rarity: "epic", condition: (s) => s.highestCheckout >= 120 },
  { id: "c6", name: "Checkout 130+", description: "Zamknij lega checkoutem 130+", icon: "🔥", rarity: "epic", condition: (s) => s.highestCheckout >= 130 },
  { id: "c7", name: "Checkout 140+", description: "Zamknij lega checkoutem 140+", icon: "⚡", rarity: "epic", condition: (s) => s.highestCheckout >= 140 },
  { id: "c8", name: "Checkout 150+", description: "Zamknij lega checkoutem 150+", icon: "💎", rarity: "legendary", condition: (s) => s.highestCheckout >= 150 },
  { id: "c9", name: "Checkout 160+", description: "Zamknij lega checkoutem 160+", icon: "🌟", rarity: "legendary", condition: (s) => s.highestCheckout >= 160 },
  { id: "c10", name: "Wielka Ryba (170)", description: "Zamknij lega checkoutem 170 (Big Fish)", icon: "🐟", rarity: "legendary", condition: (s) => s.highestCheckout >= 170 },

  // ═══════════════════════════════════════════════
  // ─── SKUTECZNOŚĆ CHECKOUTÓW (cp1-cp6) ───
  // ═══════════════════════════════════════════════
  { id: "cp1", name: "Checkout 20%", description: "Skuteczność checkoutów powyżej 20%", icon: "🔧", rarity: "common", condition: (s) => s.checkoutRate >= 20 && s.checkoutAttempts >= 10 },
  { id: "cp2", name: "Checkout 30%", description: "Skuteczność checkoutów powyżej 30%", icon: "🔧", rarity: "rare", condition: (s) => s.checkoutRate >= 30 && s.checkoutAttempts >= 10 },
  { id: "cp3", name: "Checkout 40%", description: "Skuteczność checkoutów powyżej 40%", icon: "🎨", rarity: "rare", condition: (s) => s.checkoutRate >= 40 && s.checkoutAttempts >= 10 },
  { id: "cp4", name: "Checkout Artysta", description: "Skuteczność checkoutów powyżej 50%", icon: "🎨", rarity: "epic", condition: (s) => s.checkoutRate >= 50 && s.checkoutAttempts >= 10 },
  { id: "cp5", name: "Lodowy Checkout", description: "Skuteczność checkoutów powyżej 60%", icon: "❄️", rarity: "legendary", condition: (s) => s.checkoutRate >= 60 && s.checkoutAttempts >= 15 },
  { id: "cp6", name: "Checkout Bóg", description: "Skuteczność checkoutów powyżej 70%", icon: "👑", rarity: "legendary", condition: (s) => s.checkoutRate >= 70 && s.checkoutAttempts >= 20 },

  // ═══════════════════════════════════════════════
  // ─── ŚREDNIE LIGOWE (a1-a13) ───
  // ═══════════════════════════════════════════════
  { id: "a1", name: "Średnia 30+", description: "Osiągnij średnią 30 lub wyższą", icon: "📊", rarity: "common", condition: (s) => s.avg >= 30 && s.matchesPlayed >= 3 },
  { id: "a2", name: "Średnia 40+", description: "Osiągnij średnią 40 lub wyższą", icon: "📊", rarity: "common", condition: (s) => s.avg >= 40 && s.matchesPlayed >= 3 },
  { id: "a3", name: "Średnia 50+", description: "Osiągnij średnią 50 lub wyższą", icon: "📊", rarity: "common", condition: (s) => s.avg >= 50 && s.matchesPlayed >= 3 },
  { id: "a4", name: "Średnia 55+", description: "Osiągnij średnią 55 lub wyższą", icon: "📊", rarity: "common", condition: (s) => s.avg >= 55 && s.matchesPlayed >= 3 },
  { id: "a5", name: "Średnia 60+", description: "Osiągnij średnią 60 lub wyższą", icon: "📊", rarity: "common", condition: (s) => s.avg >= 60 && s.matchesPlayed >= 3 },
  { id: "a6", name: "Średnia 65+", description: "Osiągnij średnią 65 lub wyższą", icon: "📈", rarity: "rare", condition: (s) => s.avg >= 65 && s.matchesPlayed >= 3 },
  { id: "a7", name: "Średnia 70+", description: "Osiągnij średnią 70 lub wyższą", icon: "📈", rarity: "rare", condition: (s) => s.avg >= 70 && s.matchesPlayed >= 3 },
  { id: "a8", name: "Średnia 75+", description: "Osiągnij średnią 75 lub wyższą", icon: "📈", rarity: "rare", condition: (s) => s.avg >= 75 && s.matchesPlayed >= 3 },
  { id: "a9", name: "Średnia 80+", description: "Osiągnij średnią 80 lub wyższą", icon: "📈", rarity: "epic", condition: (s) => s.avg >= 80 && s.matchesPlayed >= 3 },
  { id: "a10", name: "Średnia 85+", description: "Osiągnij średnią 85 lub wyższą", icon: "🌟", rarity: "epic", condition: (s) => s.avg >= 85 && s.matchesPlayed >= 3 },
  { id: "a11", name: "Średnia 90+", description: "Osiągnij średnią 90 lub wyższą", icon: "🌟", rarity: "legendary", condition: (s) => s.avg >= 90 && s.matchesPlayed >= 3 },
  { id: "a12", name: "Średnia 95+", description: "Osiągnij średnią 95 lub wyższą", icon: "💫", rarity: "legendary", condition: (s) => s.avg >= 95 && s.matchesPlayed >= 5 },
  { id: "a13", name: "Średnia 100+", description: "Osiągnij średnią 100 lub wyższą w lidze", icon: "💫", rarity: "legendary", condition: (s) => s.avg >= 100 && s.matchesPlayed >= 5 },

  // ═══════════════════════════════════════════════
  // ─── NAJLEPSZA ŚREDNIA W MECZU (ba1-ba8) ───
  // ═══════════════════════════════════════════════
  { id: "ba1", name: "Mecz ze Średnią 50+", description: "Najlepsza średnia w meczu powyżej 50", icon: "📊", rarity: "common", condition: (s) => s.bestAvg >= 50 },
  { id: "ba2", name: "Mecz ze Średnią 60+", description: "Najlepsza średnia w meczu powyżej 60", icon: "📊", rarity: "common", condition: (s) => s.bestAvg >= 60 },
  { id: "ba3", name: "Mecz ze Średnią 70+", description: "Najlepsza średnia w meczu powyżej 70", icon: "📈", rarity: "rare", condition: (s) => s.bestAvg >= 70 },
  { id: "ba4", name: "Mecz ze Średnią 80+", description: "Najlepsza średnia w meczu powyżej 80", icon: "📈", rarity: "rare", condition: (s) => s.bestAvg >= 80 },
  { id: "ba5", name: "Perfekcjonista", description: "Najlepsza średnia w meczu powyżej 90", icon: "✨", rarity: "epic", condition: (s) => s.bestAvg >= 90 },
  { id: "ba6", name: "Maszyna do Punktów", description: "Najlepsza średnia w meczu powyżej 100", icon: "🤖", rarity: "legendary", condition: (s) => s.bestAvg >= 100 },
  { id: "ba7", name: "Kosmiczny Mecz", description: "Najlepsza średnia w meczu powyżej 110", icon: "🌌", rarity: "legendary", condition: (s) => s.bestAvg >= 110 },
  { id: "ba8", name: "Boski Mecz", description: "Najlepsza średnia w meczu powyżej 120", icon: "👑", rarity: "legendary", condition: (s) => s.bestAvg >= 120 },

  // ═══════════════════════════════════════════════
  // ─── ŚREDNIA Z PIERWSZYCH 9 RZUTÓW (f1-f11) ───
  // ═══════════════════════════════════════════════
  { id: "f1", name: "Start 40+", description: "Średnia z pierwszych 9 rzutów powyżej 40", icon: "🏃", rarity: "common", condition: (s) => s.bestFirst9Avg >= 40 },
  { id: "f2", name: "Start 50+", description: "Średnia z pierwszych 9 rzutów powyżej 50", icon: "🏃", rarity: "common", condition: (s) => s.bestFirst9Avg >= 50 },
  { id: "f3", name: "Start 60+", description: "Średnia z pierwszych 9 rzutów powyżej 60", icon: "⚡", rarity: "common", condition: (s) => s.bestFirst9Avg >= 60 },
  { id: "f4", name: "Start 70+", description: "Średnia z pierwszych 9 rzutów powyżej 70", icon: "⚡", rarity: "rare", condition: (s) => s.bestFirst9Avg >= 70 },
  { id: "f5", name: "Rakieta", description: "Średnia z pierwszych 9 rzutów powyżej 80", icon: "🚀", rarity: "rare", condition: (s) => s.bestFirst9Avg >= 80 },
  { id: "f6", name: "Start 90+", description: "Średnia z pierwszych 9 rzutów powyżej 90", icon: "🚀", rarity: "epic", condition: (s) => s.bestFirst9Avg >= 90 },
  { id: "f7", name: "Błyskawica", description: "Średnia z pierwszych 9 rzutów powyżej 100", icon: "⚡", rarity: "epic", condition: (s) => s.bestFirst9Avg >= 100 },
  { id: "f8", name: "Start 110+", description: "Średnia z pierwszych 9 rzutów powyżej 110", icon: "💫", rarity: "epic", condition: (s) => s.bestFirst9Avg >= 110 },
  { id: "f9", name: "Perfekcyjny Start", description: "Średnia z pierwszych 9 rzutów powyżej 120", icon: "💫", rarity: "legendary", condition: (s) => s.bestFirst9Avg >= 120 },
  { id: "f10", name: "Start 130+", description: "Średnia z pierwszych 9 rzutów powyżej 130", icon: "🌌", rarity: "legendary", condition: (s) => s.bestFirst9Avg >= 130 },
  { id: "f11", name: "Kosmiczny Start", description: "Średnia z pierwszych 9 rzutów powyżej 140", icon: "🌌", rarity: "legendary", condition: (s) => s.bestFirst9Avg >= 140 },

  // ═══════════════════════════════════════════════
  // ─── TONY 60+ (t60_1-t60_7) ───
  // ═══════════════════════════════════════════════
  { id: "t60_1", name: "60+ Początkujący", description: "Zbierz 5 wyników 60+", icon: "🎰", rarity: "common", condition: (s) => s.ton60 >= 5 },
  { id: "t60_2", name: "60+ Zbieracz", description: "Zbierz 10 wyników 60+", icon: "🎰", rarity: "common", condition: (s) => s.ton60 >= 10 },
  { id: "t60_3", name: "60+ Kolekcjoner", description: "Zbierz 20 wyników 60+", icon: "🎰", rarity: "rare", condition: (s) => s.ton60 >= 20 },
  { id: "t60_4", name: "60+ Mistrz", description: "Zbierz 30 wyników 60+", icon: "🎯", rarity: "rare", condition: (s) => s.ton60 >= 30 },
  { id: "t60_5", name: "60+ Ekspert", description: "Zbierz 50 wyników 60+", icon: "🎯", rarity: "epic", condition: (s) => s.ton60 >= 50 },
  { id: "t60_6", name: "60+ Maszyna", description: "Zbierz 75 wyników 60+", icon: "🤖", rarity: "epic", condition: (s) => s.ton60 >= 75 },
  { id: "t60_7", name: "60+ Legenda", description: "Zbierz 100 wyników 60+", icon: "🌟", rarity: "legendary", condition: (s) => s.ton60 >= 100 },

  // ═══════════════════════════════════════════════
  // ─── TONY 100+ (t100_1-t100_7) ───
  // ═══════════════════════════════════════════════
  { id: "t100_1", name: "100+ Początkujący", description: "Zbierz 5 wyników 100+", icon: "🃏", rarity: "common", condition: (s) => s.ton80 >= 5 },
  { id: "t100_2", name: "100+ Zbieracz", description: "Zbierz 10 wyników 100+", icon: "🃏", rarity: "rare", condition: (s) => s.ton80 >= 10 },
  { id: "t100_3", name: "100+ Kolekcjoner", description: "Zbierz 15 wyników 100+", icon: "🃏", rarity: "rare", condition: (s) => s.ton80 >= 15 },
  { id: "t100_4", name: "100+ Mistrz", description: "Zbierz 30 wyników 100+", icon: "🎯", rarity: "epic", condition: (s) => s.ton80 >= 30 },
  { id: "t100_5", name: "100+ Ekspert", description: "Zbierz 50 wyników 100+", icon: "🎯", rarity: "epic", condition: (s) => s.ton80 >= 50 },
  { id: "t100_6", name: "100+ Maszyna", description: "Zbierz 75 wyników 100+", icon: "🤖", rarity: "legendary", condition: (s) => s.ton80 >= 75 },
  { id: "t100_7", name: "100+ Legenda", description: "Zbierz 100 wyników 100+", icon: "🌟", rarity: "legendary", condition: (s) => s.ton80 >= 100 },

  // ═══════════════════════════════════════════════
  // ─── TONY 140+ (t140_1-t140_6) ───
  // ═══════════════════════════════════════════════
  { id: "t140_1", name: "140+ Łowca", description: "Rzuć 3 wyniki 140+", icon: "🎪", rarity: "common", condition: (s) => s.tonPlus >= 3 },
  { id: "t140_2", name: "140+ Zbieracz", description: "Rzuć 5 wyników 140+", icon: "🎪", rarity: "rare", condition: (s) => s.tonPlus >= 5 },
  { id: "t140_3", name: "140+ Kolekcjoner", description: "Rzuć 10 wyników 140+", icon: "🎪", rarity: "rare", condition: (s) => s.tonPlus >= 10 },
  { id: "t140_4", name: "140+ Mistrz", description: "Rzuć 20 wyników 140+", icon: "🎪", rarity: "epic", condition: (s) => s.tonPlus >= 20 },
  { id: "t140_5", name: "140+ Ekspert", description: "Rzuć 30 wyników 140+", icon: "🎪", rarity: "epic", condition: (s) => s.tonPlus >= 30 },
  { id: "t140_6", name: "140+ Legenda", description: "Rzuć 50 wyników 140+", icon: "🎪", rarity: "legendary", condition: (s) => s.tonPlus >= 50 },

  // ═══════════════════════════════════════════════
  // ─── TONY 170+ (t170_1-t170_5) ───
  // ═══════════════════════════════════════════════
  { id: "t170_1", name: "Pierwsza 170+", description: "Rzuć pierwszy wynik 170+", icon: "🎯", rarity: "rare", condition: (s) => s.ton40 >= 1 },
  { id: "t170_2", name: "170+ Kolekcjoner", description: "Rzuć 3 wyniki 170+", icon: "🎯", rarity: "epic", condition: (s) => s.ton40 >= 3 },
  { id: "t170_3", name: "170+ Ekspert", description: "Rzuć 5 wyników 170+", icon: "🎯", rarity: "epic", condition: (s) => s.ton40 >= 5 },
  { id: "t170_4", name: "170+ Mistrz", description: "Rzuć 10 wyników 170+", icon: "🎯", rarity: "legendary", condition: (s) => s.ton40 >= 10 },
  { id: "t170_5", name: "170+ Legenda", description: "Rzuć 20 wyników 170+", icon: "🌟", rarity: "legendary", condition: (s) => s.ton40 >= 20 },

  // ═══════════════════════════════════════════════
  // ─── SUMA TONÓW (tt1-tt6) ───
  // ═══════════════════════════════════════════════
  { id: "tt1", name: "10 Tonów", description: "Zbierz łącznie 10 tonów (60+100+140+170+)", icon: "💰", rarity: "common", condition: (s) => (s.ton60 + s.ton80 + s.tonPlus + s.ton40) >= 10 },
  { id: "tt2", name: "25 Tonów", description: "Zbierz łącznie 25 tonów", icon: "💰", rarity: "rare", condition: (s) => (s.ton60 + s.ton80 + s.tonPlus + s.ton40) >= 25 },
  { id: "tt3", name: "Ton Kolekcjoner", description: "Zbierz łącznie 50 tonów", icon: "💰", rarity: "epic", condition: (s) => (s.ton60 + s.ton80 + s.tonPlus + s.ton40) >= 50 },
  { id: "tt4", name: "Ton Milioner", description: "Zbierz łącznie 100 tonów", icon: "💎", rarity: "epic", condition: (s) => (s.ton60 + s.ton80 + s.tonPlus + s.ton40) >= 100 },
  { id: "tt5", name: "Ton Bogacz", description: "Zbierz łącznie 200 tonów", icon: "💎", rarity: "legendary", condition: (s) => (s.ton60 + s.ton80 + s.tonPlus + s.ton40) >= 200 },
  { id: "tt6", name: "Ton Imperator", description: "Zbierz łącznie 500 tonów", icon: "👑", rarity: "legendary", condition: (s) => (s.ton60 + s.ton80 + s.tonPlus + s.ton40) >= 500 },

  // ═══════════════════════════════════════════════
  // ─── PROCENT WYGRANYCH (r1-r9) ───
  // ═══════════════════════════════════════════════
  { id: "r1", name: "Ponad Połowa", description: "Procent wygranych powyżej 50% (min. 5 meczów)", icon: "📊", rarity: "common", condition: (s) => s.winRate > 50 && s.matchesPlayed >= 5 },
  { id: "r2", name: "Win Rate 60%", description: "Procent wygranych powyżej 60% (min. 5 meczów)", icon: "📊", rarity: "rare", condition: (s) => s.winRate >= 60 && s.matchesPlayed >= 5 },
  { id: "r3", name: "Win Rate 70%", description: "Procent wygranych powyżej 70% (min. 5 meczów)", icon: "📈", rarity: "rare", condition: (s) => s.winRate >= 70 && s.matchesPlayed >= 5 },
  { id: "r4", name: "Wysoki Procent", description: "Procent wygranych powyżej 75% (min. 5 meczów)", icon: "🏅", rarity: "epic", condition: (s) => s.winRate >= 75 && s.matchesPlayed >= 5 },
  { id: "r5", name: "Win Rate 80%", description: "Procent wygranych powyżej 80% (min. 8 meczów)", icon: "🏅", rarity: "epic", condition: (s) => s.winRate >= 80 && s.matchesPlayed >= 8 },
  { id: "r6", name: "Win Rate 85%", description: "Procent wygranych powyżej 85% (min. 8 meczów)", icon: "🏆", rarity: "epic", condition: (s) => s.winRate >= 85 && s.matchesPlayed >= 8 },
  { id: "r7", name: "Absolutny Dominat", description: "Procent wygranych powyżej 90% (min. 8 meczów)", icon: "👑", rarity: "legendary", condition: (s) => s.winRate >= 90 && s.matchesPlayed >= 8 },
  { id: "r8", name: "Win Rate 95%", description: "Procent wygranych powyżej 95% (min. 10 meczów)", icon: "💎", rarity: "legendary", condition: (s) => s.winRate >= 95 && s.matchesPlayed >= 10 },
  { id: "r9", name: "Stuprocentowy", description: "100% wygranych (min. 10 meczów)", icon: "💯", rarity: "legendary", condition: (s) => s.winRate === 100 && s.matchesPlayed >= 10 },

  // ═══════════════════════════════════════════════
  // ─── LEGI (l1-l10) ───
  // ═══════════════════════════════════════════════
  { id: "l1", name: "5 Legów", description: "Wygraj 5 legów w lidze", icon: "🦵", rarity: "common", condition: (s) => s.legsWon >= 5 },
  { id: "l2", name: "10 Legów", description: "Wygraj 10 legów w lidze", icon: "🦵", rarity: "common", condition: (s) => s.legsWon >= 10 },
  { id: "l3", name: "25 Legów", description: "Wygraj 25 legów w lidze", icon: "🦵", rarity: "common", condition: (s) => s.legsWon >= 25 },
  { id: "l4", name: "50 Legów", description: "Wygraj 50 legów w lidze", icon: "🦿", rarity: "rare", condition: (s) => s.legsWon >= 50 },
  { id: "l5", name: "75 Legów", description: "Wygraj 75 legów w lidze", icon: "🦿", rarity: "rare", condition: (s) => s.legsWon >= 75 },
  { id: "l6", name: "100 Legów", description: "Wygraj 100 legów w lidze", icon: "💪", rarity: "epic", condition: (s) => s.legsWon >= 100 },
  { id: "l7", name: "150 Legów", description: "Wygraj 150 legów w lidze", icon: "💪", rarity: "epic", condition: (s) => s.legsWon >= 150 },
  { id: "l8", name: "Maszyna do Legów", description: "Wygraj 200 legów w lidze", icon: "🦾", rarity: "legendary", condition: (s) => s.legsWon >= 200 },
  { id: "l9", name: "300 Legów", description: "Wygraj 300 legów w lidze", icon: "🦾", rarity: "legendary", condition: (s) => s.legsWon >= 300 },
  { id: "l10", name: "Leg Tysiącznik", description: "Wygraj 500 legów w lidze", icon: "🏛️", rarity: "legendary", condition: (s) => s.legsWon >= 500 },

  // ═══════════════════════════════════════════════
  // ─── DARTY (d1-d8) ───
  // ═══════════════════════════════════════════════
  { id: "d1", name: "100 Dartsów", description: "Rzuć ponad 100 dartsów", icon: "🎯", rarity: "common", condition: (s) => s.totalDartsThrown >= 100 },
  { id: "d2", name: "200 Dartsów", description: "Rzuć ponad 200 dartsów", icon: "🎯", rarity: "common", condition: (s) => s.totalDartsThrown >= 200 },
  { id: "d3", name: "500 Dartsów", description: "Rzuć ponad 500 dartsów", icon: "🤖", rarity: "rare", condition: (s) => s.totalDartsThrown >= 500 },
  { id: "d4", name: "1000 Dartsów", description: "Rzuć ponad 1000 dartsów", icon: "🔨", rarity: "rare", condition: (s) => s.totalDartsThrown >= 1000 },
  { id: "d5", name: "2000 Dartsów", description: "Rzuć ponad 2000 dartsów", icon: "🌪️", rarity: "epic", condition: (s) => s.totalDartsThrown >= 2000 },
  { id: "d6", name: "3000 Dartsów", description: "Rzuć ponad 3000 dartsów", icon: "🌪️", rarity: "epic", condition: (s) => s.totalDartsThrown >= 3000 },
  { id: "d7", name: "5000 Dartsów", description: "Rzuć ponad 5000 dartsów", icon: "🔥", rarity: "legendary", condition: (s) => s.totalDartsThrown >= 5000 },
  { id: "d8", name: "10000 Dartsów", description: "Rzuć ponad 10000 dartsów", icon: "🌠", rarity: "legendary", condition: (s) => s.totalDartsThrown >= 10000 },

  // ═══════════════════════════════════════════════
  // ─── PUNKTY LIGOWE (p1-p10) ───
  // ═══════════════════════════════════════════════
  { id: "p1", name: "Pierwszy Punkt", description: "Zdobądź pierwsze punkty w lidze", icon: "⭐", rarity: "common", condition: (s) => s.points >= 1 },
  { id: "p2", name: "5 Punktów", description: "Zdobądź 5 punktów w lidze", icon: "⭐", rarity: "common", condition: (s) => s.points >= 5 },
  { id: "p3", name: "10 Punktów", description: "Zdobądź 10 punktów w lidze", icon: "⭐", rarity: "common", condition: (s) => s.points >= 10 },
  { id: "p4", name: "15 Punktów", description: "Zdobądź 15 punktów w lidze", icon: "🌟", rarity: "rare", condition: (s) => s.points >= 15 },
  { id: "p5", name: "20 Punktów", description: "Zdobądź 20 punktów w lidze", icon: "🌟", rarity: "rare", condition: (s) => s.points >= 20 },
  { id: "p6", name: "30 Punktów", description: "Zdobądź 30 punktów w lidze", icon: "🐉", rarity: "epic", condition: (s) => s.points >= 30 },
  { id: "p7", name: "40 Punktów", description: "Zdobądź 40 punktów w lidze", icon: "🐉", rarity: "epic", condition: (s) => s.points >= 40 },
  { id: "p8", name: "50 Punktów", description: "Zdobądź 50 punktów w lidze", icon: "👹", rarity: "legendary", condition: (s) => s.points >= 50 },
  { id: "p9", name: "75 Punktów", description: "Zdobądź 75 punktów w lidze", icon: "🏛️", rarity: "legendary", condition: (s) => s.points >= 75 },
  { id: "p10", name: "100 Punktów", description: "Zdobądź 100 punktów w lidze", icon: "👑", rarity: "legendary", condition: (s) => s.points >= 100 },

  // ═══════════════════════════════════════════════
  // ─── PUNKTY BONUSOWE (b1-b6) ───
  // ═══════════════════════════════════════════════
  { id: "b1", name: "Pierwszy Bonus", description: "Zdobądź pierwszy punkt bonusowy", icon: "🎁", rarity: "common", condition: (s) => s.bonusPoints >= 1 },
  { id: "b2", name: "5 Bonusów", description: "Zdobądź 5 punktów bonusowych", icon: "🎁", rarity: "rare", condition: (s) => s.bonusPoints >= 5 },
  { id: "b3", name: "Łowca Bonusów", description: "Zdobądź 10 punktów bonusowych", icon: "💫", rarity: "rare", condition: (s) => s.bonusPoints >= 10 },
  { id: "b4", name: "Król Bonusów", description: "Zdobądź 25 punktów bonusowych", icon: "🌠", rarity: "epic", condition: (s) => s.bonusPoints >= 25 },
  { id: "b5", name: "Bonus Maniak", description: "Zdobądź 50 punktów bonusowych", icon: "✨", rarity: "legendary", condition: (s) => s.bonusPoints >= 50 },
  { id: "b6", name: "Bonus Bóg", description: "Zdobądź 100 punktów bonusowych", icon: "👑", rarity: "legendary", condition: (s) => s.bonusPoints >= 100 },

  // ═══════════════════════════════════════════════
  // ─── SPECJALNE / KOMBINACJE (x1-x31) ───
  // ═══════════════════════════════════════════════
  { id: "x1", name: "Punkty za Wszystko", description: "Zdobądź punkty bazowe i bonusowe", icon: "🎯", rarity: "common", condition: (s) => s.basePoints >= 3 && s.bonusPoints >= 1 },
  { id: "x2", name: "Debiut z Klasą", description: "Wygraj pierwszy mecz ze średnią 70+", icon: "🎩", rarity: "rare", condition: (s) => s.wins >= 1 && s.matchesPlayed === 1 && s.avg >= 70 },
  { id: "x3", name: "Snajper i Siłacz", description: "Checkout 100+ i 180-tka w jednej lidze", icon: "🎯", rarity: "rare", condition: (s) => s.highestCheckout >= 100 && s.oneEighties >= 1 },
  { id: "x4", name: "Trójca", description: "Średnia 60+, checkout 60+ i min. 3 wygrane", icon: "🔱", rarity: "rare", condition: (s) => s.avg >= 60 && s.highestCheckout >= 60 && s.wins >= 3 },
  { id: "x5", name: "Wszechstronny", description: "Tony 60+, 100+, 140+ i 170+ w jednej lidze", icon: "🌈", rarity: "rare", condition: (s) => s.ton60 >= 1 && s.ton80 >= 1 && s.tonPlus >= 1 && s.ton40 >= 1 },
  { id: "x6", name: "Ligowy Weteran", description: "Rozegraj 20 meczów i zdobądź 20 punktów", icon: "🎖️", rarity: "rare", condition: (s) => s.matchesPlayed >= 20 && s.points >= 20 },
  { id: "x7", name: "Kompletny Gracz", description: "Średnia 70+, checkout 80+ i min. 5 wygranych", icon: "🏅", rarity: "epic", condition: (s) => s.avg >= 70 && s.highestCheckout >= 80 && s.wins >= 5 },
  { id: "x8", name: "180 i CO 100+", description: "Rzuć 180 i zamknij checkoutem 100+ w jednej lidze", icon: "🎯", rarity: "epic", condition: (s) => s.oneEighties >= 1 && s.highestCheckout >= 100 },
  { id: "x9", name: "Czyste Konto", description: "Wygraj mecz bez straty lega (min. 3 legi)", icon: "🧹", rarity: "epic", condition: (s) => s.legsWon >= 3 && s.wins >= 1 },
  { id: "x10", name: "Żelazna Forma", description: "5 meczów bez porażki i średnia 60+", icon: "🛡️", rarity: "epic", condition: (s) => { const f = s.form; for (let i = 0; i <= f.length - 5; i++) { if (f.slice(i,i+5).every(x=>x==="W") && s.avg >= 60) return true; } return false; }},
  { id: "x11", name: "Mistrz Formy", description: "Średnia 80+ i procent wygranych 70%+", icon: "📈", rarity: "epic", condition: (s) => s.avg >= 80 && s.winRate >= 70 && s.matchesPlayed >= 5 },
  { id: "x12", name: "Leg Dominator", description: "Stosunek legów wygranych do przegranych 2:1 (min. 30 legów)", icon: "⚖️", rarity: "epic", condition: (s) => s.legsWon >= 30 && s.legsLost > 0 && (s.legsWon / s.legsLost) >= 2 },
  { id: "x13", name: "50 Legów + 10 Wygranych", description: "Wygraj 50 legów i 10 meczów", icon: "💪", rarity: "epic", condition: (s) => s.legsWon >= 50 && s.wins >= 10 },
  { id: "x14", name: "100 Legów + 20 Wygranych", description: "Wygraj 100 legów i 20 meczów", icon: "🦾", rarity: "legendary", condition: (s) => s.legsWon >= 100 && s.wins >= 20 },
  { id: "x15", name: "Triple Threat", description: "Średnia 70+, checkout 80+ i 5x 180", icon: "🔱", rarity: "epic", condition: (s) => s.avg >= 70 && s.highestCheckout >= 80 && s.oneEighties >= 5 },
  { id: "x16", name: "Podwójna Setka", description: "Średnia 100+ i checkout 100+ w jednej lidze", icon: "💯", rarity: "legendary", condition: (s) => s.avg >= 100 && s.highestCheckout >= 100 && s.matchesPlayed >= 3 },
  { id: "x17", name: "1000 Dartsów + Średnia 60+", description: "Rzuć 1000 dartsów ze średnią 60+", icon: "🎯", rarity: "epic", condition: (s) => s.totalDartsThrown >= 1000 && s.avg >= 60 },
  { id: "x18", name: "5000 Dartsów + 50x 180", description: "Rzuć 5000 dartsów i 50x 180", icon: "🌠", rarity: "legendary", condition: (s) => s.totalDartsThrown >= 5000 && s.oneEighties >= 50 },
  { id: "x19", name: "10 Wygranych + Średnia 80+", description: "Wygraj 10 meczów ze średnią 80+", icon: "🏆", rarity: "epic", condition: (s) => s.wins >= 10 && s.avg >= 80 },
  { id: "x20", name: "25 Wygranych + 10x 180", description: "Wygraj 25 meczów i rzuć 10x 180", icon: "🥇", rarity: "epic", condition: (s) => s.wins >= 25 && s.oneEighties >= 10 },
  { id: "x21", name: "50 Meczów + 100 Tonów", description: "Rozegraj 50 meczów i zbierz 100 tonów", icon: "🏛️", rarity: "legendary", condition: (s) => s.matchesPlayed >= 50 && (s.ton60 + s.ton80 + s.tonPlus + s.ton40) >= 100 },
  { id: "x22", name: "Średnia 90+ + 5x 180", description: "Średnia ligowa 90+ i 5x 180 w jednej lidze", icon: "💫", rarity: "legendary", condition: (s) => s.avg >= 90 && s.oneEighties >= 5 },
  { id: "x23", name: "20x 180 + CO 120+", description: "Rzuć 20x 180 i checkout 120+", icon: "🔥", rarity: "legendary", condition: (s) => s.oneEighties >= 20 && s.highestCheckout >= 120 },
  { id: "x24", name: "30 Meczów + Średnia 70+", description: "Rozegraj 30 meczów ze średnią 70+", icon: "📈", rarity: "epic", condition: (s) => s.matchesPlayed >= 30 && s.avg >= 70 },
  { id: "x25", name: "Ton Master", description: "Każdy zakres tonów min. 10 (60+, 100+, 140+, 170+)", icon: "🌈", rarity: "legendary", condition: (s) => s.ton60 >= 10 && s.ton80 >= 10 && s.tonPlus >= 10 && s.ton40 >= 10 },
  { id: "x26", name: "Elita Dartsów", description: "Średnia 85+, checkout 120+ i 10+ wygranych", icon: "💎", rarity: "legendary", condition: (s) => s.avg >= 85 && s.highestCheckout >= 120 && s.wins >= 10 },
  { id: "x27", name: "Niezniszczalny", description: "30 meczów, 70%+ wygranych i średnia 65+", icon: "🏰", rarity: "legendary", condition: (s) => s.matchesPlayed >= 30 && s.winRate >= 70 && s.avg >= 65 },
  { id: "x28", name: "Ligowy Bóg", description: "50 meczów, 80%+ wygranych, średnia 80+ i 10+ 180-tek", icon: "👑", rarity: "legendary", condition: (s) => s.matchesPlayed >= 50 && s.winRate >= 80 && s.avg >= 80 && s.oneEighties >= 10 },
  { id: "x29", name: "Perfekcyjny Start + Wygrana", description: "Średnia z first 9 powyżej 100 i wygraj mecz", icon: "🚀", rarity: "epic", condition: (s) => s.bestFirst9Avg >= 100 && s.wins >= 1 },
  { id: "x30", name: "Checkout 50% + 10 Wygranych", description: "Skuteczność checkoutów 50%+ i 10 wygranych", icon: "❄️", rarity: "legendary", condition: (s) => s.checkoutRate >= 50 && s.checkoutAttempts >= 20 && s.wins >= 10 },
  { id: "x31", name: "Absolutna Perfekcja", description: "Średnia 90+, CO 130+, 20x 180, 70%+ wygranych", icon: "🌠", rarity: "legendary", condition: (s) => s.avg >= 90 && s.highestCheckout >= 130 && s.oneEighties >= 20 && s.winRate >= 70 && s.matchesPlayed >= 10 },
];
