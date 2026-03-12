import HeroSection from "@/components/HeroSection";
import { Link } from "react-router-dom";
import { Gamepad2, ArrowRight, Target } from "lucide-react";
import { useLeague } from "@/contexts/LeagueContext";

const Index = () => {
  const { leagues, players, matches } = useLeague();

  const activeLeagues = leagues.filter(l => l.is_active);
  const totalPlayers = players.filter(p => p.approved).length;
  const totalCompleted = matches.filter(m => m.status === "completed").length;

  return (
    <div className="min-h-screen">
      <HeroSection />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Aktywne ligi" value={activeLeagues.length} emoji="🏆" />
          <StatCard label="Graczy" value={totalPlayers} emoji="👥" />
          <StatCard label="Rozegranych meczów" value={totalCompleted} emoji="⚔️" />
          <StatCard
            label="Wielkość społeczności"
            value={totalPlayers >= 50 ? "Duża" : totalPlayers >= 20 ? "Średnia" : "Rosnąca"}
            emoji={totalPlayers >= 50 ? "🔥" : totalPlayers >= 20 ? "📈" : "🌱"}
          />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/how-to-play" className="group rounded-xl border border-border bg-card p-5 card-glow flex items-center gap-4 hover:border-primary/40 transition-colors">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-foreground">Jak grać?</div>
              <div className="text-xs text-muted-foreground font-body">Instrukcja krok po kroku dla każdej platformy</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
          <Link to="/tables" className="group rounded-xl border border-border bg-card p-5 card-glow flex items-center gap-4 hover:border-primary/40 transition-colors">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Target className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-foreground">Tabele i zapisy</div>
              <div className="text-xs text-muted-foreground font-body">Rankingi ligowe, drabinki i otwarte zapisy</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, emoji }: { label: string; value: number | string; emoji: string }) => (
  <div className="rounded-xl border border-border bg-card p-4 card-glow text-center">
    <div className="text-2xl mb-1">{emoji}</div>
    <div className="text-2xl font-display font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground font-body uppercase tracking-wider">{label}</div>
  </div>
);

export default Index;
