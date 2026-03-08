import { Target, TrendingUp, Trophy } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(0_72%_51%/0.08),transparent_60%)]" />
      
      <div className="container mx-auto px-4 py-16 md:py-24 relative">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-10 w-10 text-primary animate-pulse-glow rounded-full" />
            <span className="text-xs font-display uppercase tracking-[0.3em] text-muted-foreground">
              Sezon 2026
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-4">
            <span className="text-gradient">Dart</span>
            <span className="text-foreground">Liga</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground font-body max-w-xl mb-8">
            Profesjonalna liga darta z integracją Autodarts.io. 
            Śledź wyniki, statystyki i ranking w czasie rzeczywistym.
          </p>

          <div className="flex flex-wrap gap-6">
            <StatChip icon={<Trophy className="h-4 w-4" />} label="Graczy" value="8" />
            <StatChip icon={<TrendingUp className="h-4 w-4" />} label="Rozegranych" value="48" />
            <StatChip icon={<Target className="h-4 w-4" />} label="180-tek" value="31" />
          </div>
        </div>
      </div>
    </section>
  );
};

const StatChip = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
    <span className="text-primary">{icon}</span>
    <div>
      <div className="text-xl font-display font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  </div>
);

export default HeroSection;
