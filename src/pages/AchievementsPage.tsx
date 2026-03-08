import { achievements } from "@/data/mockData";
import { Trophy, Zap } from "lucide-react";

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
  { prefix: "t", label: "Tony (Scoring)", icon: "🎪" },
  { prefix: "r", label: "Win Rate", icon: "📈" },
  { prefix: "l", label: "Legi", icon: "🦵" },
  { prefix: "d", label: "Rzuty (Darty)", icon: "🤖" },
  { prefix: "x", label: "Specjalne", icon: "💫" },
  
];

const AchievementsPage = () => {
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: achievements
      .filter((a) => a.id.startsWith(cat.prefix))
      .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" /> Katalog Osiągnięć
        </h1>
        <p className="text-muted-foreground font-body">
          Wszystkie {achievements.length} osiągnięć do zdobycia. Zdobywaj je grając w ligach!
        </p>
      </div>

      {/* Rarity legend */}
      <div className="flex flex-wrap gap-3">
        {(["common", "rare", "epic", "legendary"] as const).map((r) => {
          const count = achievements.filter((a) => a.rarity === r).length;
          return (
            <div key={r} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${RARITY_STYLES[r]}`}>
              <span className={`text-[10px] font-display uppercase tracking-widest px-2 py-0.5 rounded-full ${RARITY_BADGE[r]}`}>
                {RARITY_LABELS[r]}
              </span>
              <span className="text-muted-foreground font-body">× {count}</span>
            </div>
          );
        })}
      </div>

      {grouped.map((group) => (
        <div key={group.prefix}>
          <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="text-xl">{group.icon}</span> {group.label}
            <span className="text-xs text-muted-foreground font-body font-normal ml-1">({group.items.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-4 flex items-start gap-3 transition-all hover:scale-[1.01] ${RARITY_STYLES[a.rarity]}`}
              >
                <span className="text-3xl mt-0.5">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-foreground text-sm">{a.name}</span>
                    <span className={`text-[9px] font-display uppercase tracking-widest px-1.5 py-0.5 rounded-full whitespace-nowrap ${RARITY_BADGE[a.rarity]}`}>
                      {RARITY_LABELS[a.rarity]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AchievementsPage;
