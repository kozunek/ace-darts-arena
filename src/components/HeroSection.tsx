import { Users, Trophy, Target, Flame, Crosshair, UserCheck, Swords } from "lucide-react";
import { useLeague } from "@/contexts/LeagueContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, Gamepad2 } from "lucide-react";

const HeroSection = () => {
  const { leagues, players, matches } = useLeague();
  const totalRegistered = players.length;
  const leagueParticipants = players.filter(p => p.leagueIds && p.leagueIds.length > 0).length;
  const activeLeagues = leagues.filter(l => l.is_active);
  const totalCompleted = matches.filter(m => m.status === "completed").length;

  let total180s = 0;
  let bestCheckout = 0;
  let totalDartsThrown = 0;
  matches.forEach(m => {
    if (m.status === "completed") {
      total180s += (m.oneEighties1 ?? 0) + (m.oneEighties2 ?? 0);
      totalDartsThrown += (m.dartsThrown1 ?? 0) + (m.dartsThrown2 ?? 0);
      if (m.highCheckout1 != null && m.highCheckout1 > bestCheckout) bestCheckout = m.highCheckout1;
      if (m.highCheckout2 != null && m.highCheckout2 > bestCheckout) bestCheckout = m.highCheckout2;
    }
  });

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(0_72%_51%/0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(145_63%_42%/0.06),transparent_50%)]" />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </div>
      
      <div className="container mx-auto px-4 py-16 md:py-24 relative">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex items-center gap-3 mb-4">
            <img src="/pwa-192x192.png" alt="eDART Polska" className="h-12 w-12 rounded-full animate-pulse-glow" />
            <span className="text-xs font-display uppercase tracking-[0.3em] text-muted-foreground">Sezon 2026</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-4">
            <span className="text-foreground">e</span><span className="text-gradient">DART</span> <span className="text-primary">Polska</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg md:text-xl text-muted-foreground font-body max-w-xl mb-8">
            Polska Liga Darta. 
            Śledź wyniki, statystyki i ranking w czasie rzeczywistym.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-8">
            <StatChip icon={<UserCheck className="h-3.5 w-3.5" />} label="Zarejestrowani" value={totalRegistered.toString()} />
            <StatChip icon={<Swords className="h-3.5 w-3.5" />} label="W ligach" value={leagueParticipants.toString()} />
            <StatChip icon={<Trophy className="h-3.5 w-3.5" />} label="Lig" value={activeLeagues.length.toString()} />
            <StatChip icon={<Target className="h-3.5 w-3.5" />} label="Meczów" value={totalCompleted.toString()} />
            <StatChip icon={<Flame className="h-3.5 w-3.5" />} label="180-tek" value={total180s > 0 ? total180s.toString() : "—"} />
            <StatChip icon={<Crosshair className="h-3.5 w-3.5" />} label="Checkout" value={bestCheckout > 0 ? bestCheckout.toString() : "—"} />
            <StatChip icon={<Target className="h-3.5 w-3.5" />} label="Rzutów" value={totalDartsThrown > 0 ? formatNumber(totalDartsThrown) : "—"} />
            <StatChip icon={<Users className="h-3.5 w-3.5" />} label="Społeczność" value={totalRegistered > 50 ? "Duża" : totalRegistered > 20 ? "Średnia" : "Rosnąca"} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex flex-wrap gap-3">
            <Link to="/login">
              <Button variant="hero" size="lg">
                <UserPlus className="h-4 w-4 mr-2" /> Dołącz do ligi
              </Button>
            </Link>
            <Link to="/how-to-play">
              <Button variant="outline" size="lg" className="font-display uppercase tracking-wider">
                <Gamepad2 className="h-4 w-4 mr-2" /> Jak to działa?
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const formatNumber = (n: number) => {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
};

const StatChip = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center gap-1 bg-muted/50 rounded-lg px-2 py-2.5 border border-border backdrop-blur-sm text-center">
    <span className="text-primary">{icon}</span>
    <div className="text-lg font-display font-bold text-foreground leading-none">{value}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">{label}</div>
  </motion.div>
);

export default HeroSection;
