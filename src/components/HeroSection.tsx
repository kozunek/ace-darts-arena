import { Users, Target, Crosshair, Trophy } from "lucide-react";
import { useLeague } from "@/contexts/LeagueContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const { leagues, players, matches } = useLeague();
  const totalRegistered = players.length;
  const activeLeagues = leagues.filter(l => l.is_active);
  const totalCompleted = matches.filter(m => m.status === "completed").length;

  let totalDartsThrown = 0;
  matches.forEach(m => {
    if (m.status === "completed") {
      totalDartsThrown += (m.dartsThrown1 ?? 0) + (m.dartsThrown2 ?? 0);
    }
  });

  const stats = [
    { icon: <Users className="h-6 w-6 text-primary" />, label: "Zawodnicy", value: totalRegistered.toString(), desc: "Zarejestrowanych graczy w lidze" },
    { icon: <Target className="h-6 w-6 text-primary" />, label: "Rozegrane mecze", value: totalCompleted.toString(), desc: "Meczów zakończonych w tym sezonie" },
    { icon: <Crosshair className="h-6 w-6 text-primary" />, label: "Rzutów lotką", value: totalDartsThrown > 0 ? formatNumber(totalDartsThrown) : "0", desc: "Łączna liczba rzutów w sezonie" },
    { icon: <Trophy className="h-6 w-6 text-primary" />, label: "Aktywne ligi", value: activeLeagues.length.toString(), desc: "Trwających rozgrywek w sezonie" },
  ];

  return (
    <>
      {/* ─── FULLSCREEN HERO ─── */}
      <section className="relative flex items-center" style={{ height: "calc(100vh - 5rem)" }}>
        <div className="absolute inset-0 overflow-hidden">
          <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
              <div className="w-12 h-px bg-primary mb-4" />
              <div className="mb-8">
                <span className="font-display font-light text-[11px] uppercase tracking-[0.45em] text-white/40">
                  Sezon 2026 · eDART Polska
                </span>
              </div>
            </motion.div>

            <div className="mb-6 overflow-hidden">
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="block font-display font-semibold text-[3.5rem] md:text-[5rem] lg:text-[6.25rem] leading-[0.92] tracking-tight text-white uppercase"
              >
                Polska Liga
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="block font-display font-semibold text-[3.5rem] md:text-[5rem] lg:text-[6.25rem] leading-[0.92] tracking-tight text-white uppercase"
              >
                Darta
              </motion.span>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-sm md:text-base text-white/55 font-body max-w-sm mb-6 leading-relaxed"
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
                <Button variant="hero" className="h-11 rounded-md px-8 font-display uppercase tracking-wider text-sm">
                  Dołącz do ligi
                </Button>
              </Link>
              <Link to="/how-to-play">
                <Button
                  className="h-11 rounded-md px-8 font-display uppercase tracking-wider text-sm border border-white/25 text-white bg-white/5 hover:bg-white/10 hover:border-white/40 hover:text-white transition-colors"
                >
                  Jak to działa
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── STATS SECTION ─── */}
      <section className="bg-card border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`flex items-start gap-5 px-6 py-10
                  ${i < 3 ? "lg:border-r border-border/40" : ""}
                  ${i < 2 ? "md:border-b lg:border-b-0 border-border/40" : ""}
                `}
              >
                <div className="shrink-0 w-16 h-20 rounded-[36px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                  {s.icon}
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="font-display uppercase tracking-widest text-[10px] text-muted-foreground">{s.label}</span>
                  <span className="font-display font-bold text-3xl text-foreground leading-none">{s.value}</span>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
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
