import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MatchStatFieldsProps {
  stats: Record<string, string>;
  setStats: (stats: Record<string, string>) => void;
  p1: string;
  p2: string;
}

interface StatGroup {
  title: string;
  icon: string;
  rows: { label: string; k1: string; k2: string; step?: string }[];
}

const STAT_GROUPS: StatGroup[] = [
  {
    title: "Średnie",
    icon: "📊",
    rows: [
      { label: "Średnia (3 lotki)", k1: "avg1", k2: "avg2", step: "0.01" },
      { label: "Średnia z pierwszych 9 lotek", k1: "first9Avg1", k2: "first9Avg2", step: "0.01" },
    ],
  },
  {
    title: "Wybitne osiągnięcia",
    icon: "🏆",
    rows: [
      { label: "180-tki", k1: "oneEighties1", k2: "oneEighties2" },
      { label: "9-dartery", k1: "nineDarters1", k2: "nineDarters2" },
      { label: "Najwyższy checkout", k1: "hc1", k2: "hc2" },
    ],
  },
  {
    title: "Zakresy podejść",
    icon: "🎯",
    rows: [
      { label: "60+ (60–99 pkt)", k1: "ton60_1", k2: "ton60_2" },
      { label: "100+ (100–139 pkt)", k1: "ton80_1", k2: "ton80_2" },
      { label: "140+ (140–169 pkt)", k1: "tonPlus1", k2: "tonPlus2" },
      { label: "170+ (170–180 pkt)", k1: "ton40_1", k2: "ton40_2" },
    ],
  },
  {
    title: "Rzuty i checkouty",
    icon: "✅",
    rows: [
      { label: "Rzucone lotki", k1: "darts1", k2: "darts2" },
      { label: "Próby checkoutu", k1: "checkoutAttempts1", k2: "checkoutAttempts2" },
      { label: "Trafione checkouty", k1: "checkoutHits1", k2: "checkoutHits2" },
    ],
  },
];

const MatchStatFields = ({ stats, setStats, p1, p2 }: MatchStatFieldsProps) => {
  const update = (key: string, value: string) => setStats({ ...stats, [key]: value });

  const checkoutPct = (hitsKey: string, attemptsKey: string): string | null => {
    const hits = parseFloat(stats[hitsKey] || "0");
    const attempts = parseFloat(stats[attemptsKey] || "0");
    if (attempts <= 0) return null;
    const pct = ((hits / attempts) * 100).toFixed(2);
    return `${pct}% (${hits}/${attempts})`;
  };

  const co1 = checkoutPct("checkoutHits1", "checkoutAttempts1");
  const co2 = checkoutPct("checkoutHits2", "checkoutAttempts2");

  const p1Short = p1.split(" ")[0];
  const p2Short = p2.split(" ")[0];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
      {/* Player headers */}
      <div className="grid grid-cols-[1fr_1fr] gap-3 text-center">
        <div className="text-xs font-display text-primary uppercase tracking-wider truncate">{p1Short}</div>
        <div className="text-xs font-display text-primary uppercase tracking-wider truncate">{p2Short}</div>
      </div>

      {/* Checkout % summary */}
      {(co1 || co2) && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <Label className="text-xs text-primary font-display mb-2 block uppercase tracking-wider">Checkout %</Label>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="font-display text-sm text-foreground">{co1 || "—"}</div>
            <div className="font-display text-sm text-foreground">{co2 || "—"}</div>
          </div>
        </div>
      )}

      {STAT_GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <Label className="text-xs text-muted-foreground font-display flex items-center gap-1.5 uppercase tracking-wider">
            {group.icon} {group.title}
          </Label>
          <div className="space-y-2">
            {group.rows.map((row) => (
              <div key={row.k1}>
                <Label className="text-[10px] text-muted-foreground font-body mb-0.5 block">{row.label}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number" min="0" step={row.step || "1"}
                    value={stats[row.k1] || ""}
                    onChange={(e) => update(row.k1, e.target.value)}
                    placeholder="0"
                    className="bg-muted/30 border-border text-center font-display h-9 text-sm"
                  />
                  <Input
                    type="number" min="0" step={row.step || "1"}
                    value={stats[row.k2] || ""}
                    onChange={(e) => update(row.k2, e.target.value)}
                    placeholder="0"
                    className="bg-muted/30 border-border text-center font-display h-9 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MatchStatFields;
