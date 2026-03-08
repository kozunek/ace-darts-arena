import { Target, TrendingUp, Trophy, BarChart3 } from "lucide-react";
import { useLeague } from "@/contexts/LeagueContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const { players, matches } = useLeague();
  const totalPlayers = players.filter(p => p.approved).length;
  const totalCompleted = matches.filter(m => m.status === "completed").length;
  const total180s = matches.reduce((sum, m) => sum + (m.oneEighties1 ?? 0) + (m.oneEighties2 ?? 0), 0);

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
            <Target className="h-10 w-10 text-primary animate-pulse-glow rounded-full" />
            <span className="text-xs font-display uppercase tracking-[0.3em] text-muted-foreground">Sezon 2026</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-4">
            <span className="text-gradient">Dart</span><span className="text-foreground">Liga</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg md:text-xl text-muted-foreground font-body max-w-xl mb-8">
            Profesjonalna liga darta. 
            Śledź wyniki, statystyki i ranking w czasie rzeczywistym.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-wrap gap-4 mb-6">
            <StatChip icon={<Trophy className="h-4 w-4" />} label="Graczy" value={totalPlayers.toString()} />
            <StatChip icon={<TrendingUp className="h-4 w-4" />} label="Rozegranych" value={totalCompleted.toString()} />
            <StatChip icon={<Target className="h-4 w-4" />} label="180-tek" value={total180s.toString()} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex flex-wrap gap-3">
            <Link to="/stats">
              <Button variant="hero" size="lg">
                <BarChart3 className="h-4 w-4 mr-2" /> Statystyki
              </Button>
            </Link>
            <Link to="/matches">
              <Button variant="outline" size="lg" className="font-display uppercase tracking-wider">Mecze</Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const StatChip = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border backdrop-blur-sm">
    <span className="text-primary">{icon}</span>
    <div>
      <div className="text-xl font-display font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  </motion.div>
);

export default HeroSection;
