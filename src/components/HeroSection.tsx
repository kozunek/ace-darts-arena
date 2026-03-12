import { Users, Target, Flame, Crosshair } from "lucide-react";
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
  const totalCompleted = matches.filter(m => m.status === "completed").length;

  let total180s = 0;
  let totalDartsThrown = 0;
  matches.forEach(m => {
    if (m.status === "completed") {
      total180s += (m.oneEighties1 ?? 0) + (m.oneEighties2 ?? 0);
      totalDartsThrown += (m.dartsThrown1 ?? 0) + (m.dartsThrown2 ?? 0);
    }
  });

  const stats = [
    { icon: <Users className="h-5 w-5" />, label: "Zawodnicy", value: leagueParticipants.toString(), desc: "Zarejestrowanych graczy w lidze" },
    { icon: <Target className="h-5 w-5" />, label: "Rozegrane mecze", value: totalCompleted.toString(), desc: "Meczów zakończonych w tym sezonie" },
    { icon: <Crosshair className="h-5 w-5" />, label: "Rzutów lotką", value: totalDartsThrown > 0 ? formatNumber(totalDartsThrown) : "0", desc: "Łączna liczba rzutów w sezonie" },
    { icon: <Flame className="h-5 w-5" />, label: "Maksów 180", value: total180s.toString(), desc: "Perfekcyjnych wizyt przy tablicy" },
  ];

  return (
    <>
      {/* ─── FULLSCREEN HERO ─── */}
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center overflow-hidden">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        <div className="container mx-auto px-4 relative z-10 text-center md:text-left">
          <div className="max-w-2xl mx-auto md:mx-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="mb-6"
            >
              <div className="w-10 h-1 bg-primary mx-auto md:mx-0 mb-4" />
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
              className="text-base md:text-lg text-white/60 font-body max-w-md mx-auto md:mx-0 mb-10"
            >
              Polska liga darta rozgrywana online. Wyniki, statystyki i ranking graczy w jednym miejscu.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-3 justify-center md:justify-start"
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

      {/* ─── STATS STRIP ─── */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="py-8 md:py-10 px-4 md:px-6"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {s.icon}
                  </div>
                  <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-3xl md:text-4xl font-display font-bold text-foreground mt-2">{s.value}</div>
                <p className="text-xs text-muted-foreground font-body mt-1">{s.desc}</p>
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
