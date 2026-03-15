import { useEffect, useState } from "react";
import { achievements } from "@/data/mockData";
import { Trophy, Zap } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useLeague } from "@/contexts/LeagueContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const RARITY_ORDER: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

const RARITY_STYLES: Record<string, string> = {
  common: "border-border bg-card",
  rare: "border-blue-500/30 bg-blue-500/5",
  epic: "border-purple-500/30 bg-purple-500/5",
  legendary: "border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_12px_-4px_hsl(var(--accent)/0.3)]",
};

const RARITY_BADGE: Record<string, string> = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-blue-500/15 text-blue-400",
  epic: "bg-purple-500/15 text-purple-400",
  legendary: "bg-yellow-500/15 text-yellow-400",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Zwykłe",
  rare: "Rzadkie",
  epic: "Epickie",
  legendary: "Legendarne",
};

const CATEGORIES: { prefix: string; label: string; icon: string }[] = [
  { prefix: "m", label: "Milestony meczowe", icon: "🎯" },
  { prefix: "w", label: "Zwycięstwa", icon: "🏆" },
  { prefix: "s", label: "Serie wygranych", icon: "🔥" },
  { prefix: "e", label: "180-tki", icon: "💯" },
  { prefix: "c", label: "Checkouty", icon: "🎯" },
  { prefix: "a", label: "Średnie", icon: "📊" },
  { prefix: "f", label: "Średnia z pierwszych 9 lotek", icon: "⚡" },
  { prefix: "u", label: "Średnia do 170", icon: "📊" },
  { prefix: "t", label: "Zakresy punktowe", icon: "🎪" },
  { prefix: "r", label: "Procent wygranych", icon: "📈" },
  { prefix: "l", label: "Legi", icon: "🦵" },
  { prefix: "d", label: "Rzuty (lotki)", icon: "🤖" },
  { prefix: "x", label: "Specjalne", icon: "💫" },
];

const AchievementsPage = () => {
  const { user } = useAuth();
  const { players, getPlayerGlobalAchievements } = useLeague();
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [activeRarities, setActiveRarities] = useState<Set<string>>(new Set());
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // Find current user's player and compute earned achievements
  useEffect(() => {
    if (!user) return;
    const fetchEarned = async () => {
      const { data: player } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (player) {
        const earned = getPlayerGlobalAchievements(player.id);
        setEarnedIds(new Set(earned.map(a => a.id)));
      }
    };
    fetchEarned();
  }, [user, getPlayerGlobalAchievements]);

  const toggleRarity = (r: string) => {
    setActiveRarities(prev => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
  };

  const filteredAchievements = achievements.filter(a => {
    if (activeRarities.size > 0 && !activeRarities.has(a.rarity)) return false;
    if (showOnlyMine && !earnedIds.has(a.id)) return false;
    return true;
  });

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: filteredAchievements
      .filter((a) => a.id.startsWith(cat.prefix))
      .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]),
  })).filter((g) => g.items.length > 0);

  const earnedCount = earnedIds.size;

  return (
    <div>
      <PageHeader title="Katalog Osiągnięć" subtitle={`Wszystkie ${achievements.length} osiągnięć do zdobycia.${filteredAchievements.length < achievements.length ? ` Wyświetlono: ${filteredAchievements.length}.` : ''} ${user ? `Zdobyto: ${earnedCount}/${achievements.length}` : 'Zaloguj się aby zobaczyć postęp!'}`} />
      <div className="container mx-auto px-4 py-12 space-y-12">

      {/* Rarity filter toggles */}
      <div className="rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm p-4">
        <div className="flex flex-wrap gap-3">
          {(["common", "rare", "epic", "legendary"] as const).map((r) => {
            const count = achievements.filter((a) => a.rarity === r).length;
            const isActive = activeRarities.has(r);
            return (
              <button
                key={r}
                onClick={() => toggleRarity(r)}
                className={`group relative flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-body transition-all cursor-pointer ${RARITY_STYLES[r]} ${isActive ? 'ring-2 ring-primary scale-105 shadow-lg' : 'hover:shadow-md'} ${activeRarities.size > 0 && !isActive ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <span className={`text-[10px] font-display uppercase tracking-widest px-2.5 py-1 rounded-full ${RARITY_BADGE[r]}`}>
                  {RARITY_LABELS[r]}
                </span>
                <span className="text-muted-foreground">× {count}</span>
              </button>
            );
          })}
          {user && (
            <button
              onClick={() => setShowOnlyMine(prev => !prev)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-body transition-all cursor-pointer border-secondary/30 bg-secondary/10 ${showOnlyMine ? 'ring-2 ring-secondary scale-105 shadow-lg' : 'hover:shadow-md opacity-60 hover:opacity-100'}`}
            >
              <Trophy className="h-4 w-4 text-secondary" />
              <span className="text-[10px] font-display uppercase tracking-widest text-secondary">Moje</span>
              <span className="text-muted-foreground">× {earnedCount}</span>
            </button>
          )}
          {(activeRarities.size > 0 || showOnlyMine) && (
            <button
              onClick={() => { setActiveRarities(new Set()); setShowOnlyMine(false); }}
              className="flex items-center gap-2 rounded-lg border border-border/50 px-4 py-2.5 text-xs font-body text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer hover:bg-muted/50"
            >
              ✕ Wyczyść
            </button>
          )}
        </div>
      </div>

      {grouped.map((group) => (
        <section key={group.prefix}>
          <div className="mb-6 flex items-center gap-3">
            <span className="text-2xl">{group.icon}</span>
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">{group.label}</h2>
              <p className="text-sm text-muted-foreground font-body">{group.items.filter(a => earnedIds.has(a.id)).length} z {group.items.length} zdobyto</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((a) => {
              const isEarned = earnedIds.has(a.id);
              return (
                <div
                  key={a.id}
                  className={`group/achievement rounded-2xl border p-5 transition-all duration-300 hover:scale-105 hover:-translate-y-1 ${RARITY_STYLES[a.rarity]} ${!isEarned && user ? 'opacity-50 grayscale hover:opacity-60 hover:grayscale-50' : 'hover:shadow-lg hover:border-primary/50'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-4xl p-2 rounded-lg transition-transform duration-300 ${isEarned ? 'scale-100' : 'group-hover/achievement:scale-110'}`}>
                      {a.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="font-display font-bold text-foreground flex-1">{a.name}</span>
                        {isEarned && (
                          <div className="text-lg">✓</div>
                        )}
                      </div>
                      <span className={`inline-block text-[9px] font-display uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap mb-2 ${RARITY_BADGE[a.rarity]}`}>
                        {RARITY_LABELS[a.rarity]}
                      </span>
                      <p className="text-xs text-muted-foreground font-body leading-relaxed">{a.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
    </div>
  );
};

export default AchievementsPage;
