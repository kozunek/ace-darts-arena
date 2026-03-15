import { Users, Target, Flame, Crosshair, Trophy, UserCheck, Swords } from "lucide-react";
import { useLeague } from "@/contexts/LeagueContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, Gamepad2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const { leagues, players, matches } = useLeague();
  const totalRegistered = players.length;
  const leagueParticipants = players.filter(p => p.leagueIds && p.leagueIds.length > 0).length;
  const activeLeagues = leagues.filter(l => l.is_active);
  const totalCompleted = matches.filter(m => m.status === "completed").length;

  let total180s = 0;
  let bestCheckout = 0;
  let totalDartsThrown = 0;
  let bestAvg = 0;
  matches.forEach(m => {
    if (m.status === "completed") {
      total180s += (m.oneEighties1 ?? 0) + (m.oneEighties2 ?? 0);
      totalDartsThrown += (m.dartsThrown1 ?? 0) + (m.dartsThrown2 ?? 0);
      if (m.highCheckout1 != null && m.highCheckout1 > bestCheckout) bestCheckout = m.highCheckout1;
      if (m.highCheckout2 != null && m.highCheckout2 > bestCheckout) bestCheckout = m.highCheckout2;
      if (m.avg1 != null && m.avg1 > bestAvg) bestAvg = m.avg1;
      if (m.avg2 != null && m.avg2 > bestAvg) bestAvg = m.avg2;
    }
  });

  const stats = [
    { icon: <UserCheck className="h-5 w-5" />, label: "Zarejestrowani", value: totalRegistered.toString(), desc: "Kont założonych na platformie" },
    { icon: <Swords className="h-5 w-5" />, label: "Gracze w ligach", value: leagueParticipants.toString(), desc: "Aktywnych uczestników rozgrywek" },
    { icon: <Trophy className="h-5 w-5" />, label: "Aktywne ligi", value: activeLeagues.length.toString(), desc: "Trwających rozgrywek w sezonie" },
    { icon: <Target className="h-5 w-5" />, label: "Rozegrane mecze", value: totalCompleted.toString(), desc: "Zakończonych spotkań w sezonie" },
    { icon: <Crosshair className="h-5 w-5" />, label: "Rzutów lotką", value: totalDartsThrown > 0 ? formatNumber(totalDartsThrown) : "0", desc: "Łączna liczba rzutów w sezonie" },
    { icon: <Flame className="h-5 w-5" />, label: "Maksów 180", value: total180s.toString(), desc: "Perfekcyjnych podejść przy tablicy" },
    { icon: <Crosshair className="h-5 w-5" />, label: "Najwyższy checkout", value: bestCheckout > 0 ? bestCheckout.toString() : "—", desc: "Rekordowe zamknięcie w sezonie" },
    { icon: <Users className="h-5 w-5" />, label: "Najwyższa średnia", value: bestAvg > 0 ? bestAvg.toFixed(1) : "—", desc: "Rekordowa średnia w meczu" },
  ];

  return (
    <>
      {/* ─── FULLSCREEN HERO ─── */}
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="mb-6">
              <div className="w-10 h-1 bg-primary mb-4" />
              <span className="text-xs font-display uppercase tracking-[0.3em] text-white/50">
                Sezon 2026 · eDART Polska
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.95] mb-6 text-white uppercase"
            >
              Polska Liga<br />Darta
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-base md:text-lg text-white/60 font-body max-w-md mb-10"
            >
              Polska liga darta rozgrywana online. Wyniki, statystyki i ranking graczy w jednym miejscu.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-3"
            >
              <Link to="/login">
                <Button variant="hero" size="lg" className="text-sm">
                  <UserPlus className="h-4 w-4 mr-2" /> Dołącz do ligi
                </Button>
              </Link>
              <Link to="/how-to-play">
                <Button
                  size="lg"
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 font-display uppercase tracking-wider text-sm"
                >
                  <Gamepad2 className="h-4 w-4 mr-2" /> Jak to działa
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── STATS GRID ─── */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="py-6 md:py-8 px-4 md:px-6 border-b border-r border-border last:border-r-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r [&:nth-child(4)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 md:[&:nth-last-child(-n+4)]:border-b-0 md:[&:nth-last-child(-n+2)]:border-b"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {s.icon}
                  </div>
                  <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground leading-tight">{s.label}</span>
                </div>
                <div className="text-2xl md:text-3xl font-display font-bold text-foreground">{s.value}</div>
                <p className="text-[11px] text-muted-foreground font-body mt-1">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

const formatNumber = (n: number) => {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
};

export default HeroSection;
