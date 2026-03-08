import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MatchStatFieldsProps {
  stats: Record<string, string>;
  setStats: (stats: Record<string, string>) => void;
  p1: string;
  p2: string;
}

const STAT_ROWS = [
  { label: "Średnia (3 darts)", k1: "avg1", k2: "avg2", step: "0.1" },
  { label: "Średnia z pierwszych 9 rzutów", k1: "first9Avg1", k2: "first9Avg2", step: "0.1" },
  { label: "Średnia do 170", k1: "avgUntil170_1", k2: "avgUntil170_2", step: "0.1" },
  { label: "180-tki", k1: "oneEighties1", k2: "oneEighties2" },
  { label: "Najw. checkout", k1: "hc1", k2: "hc2" },
  { label: "60+ (60-99)", k1: "ton60_1", k2: "ton60_2" },
  { label: "100+ (100-139)", k1: "ton80_1", k2: "ton80_2" },
  { label: "140+ (140-169)", k1: "tonPlus1", k2: "tonPlus2" },
  { label: "170+ (170-179)", k1: "ton40_1", k2: "ton40_2" },
  { label: "Rzuty (darts)", k1: "darts1", k2: "darts2" },
  { label: "Checkout próby", k1: "checkoutAttempts1", k2: "checkoutAttempts2" },
  { label: "Checkout trafione", k1: "checkoutHits1", k2: "checkoutHits2" },
];

const MatchStatFields = ({ stats, setStats, p1, p2 }: MatchStatFieldsProps) => {
  const update = (key: string, value: string) => setStats({ ...stats, [key]: value });

  // Calculate checkout percentage
  const checkoutPct = (hitsKey: string, attemptsKey: string): string | null => {
    const hits = parseFloat(stats[hitsKey] || "0");
    const attempts = parseFloat(stats[attemptsKey] || "0");
    if (attempts <= 0) return null;
    const pct = ((hits / attempts) * 100).toFixed(2);
    return `${pct}% (${hits}/${attempts})`;
  };

  const co1 = checkoutPct("checkoutHits1", "checkoutAttempts1");
  const co2 = checkoutPct("checkoutHits2", "checkoutAttempts2");

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
      {/* Checkout % summary */}
      {(co1 || co2) && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <Label className="text-xs text-primary font-display mb-2 block uppercase tracking-wider">Checkout %</Label>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="font-display text-sm text-foreground">{co1 || "—"}</div>
            <div className="font-display text-sm text-foreground">{co2 || "—"}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center mt-1">
            <div className="text-[10px] text-muted-foreground">{p1.split(" ")[0]}</div>
            <div className="text-[10px] text-muted-foreground">{p2.split(" ")[0]}</div>
          </div>
        </div>
      )}

      {STAT_ROWS.map((row) => (
        <div key={row.k1}>
          <Label className="text-xs text-muted-foreground font-body mb-1 block">{row.label}</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number" min="0" step={row.step || "1"}
              value={stats[row.k1] || ""}
              onChange={(e) => update(row.k1, e.target.value)}
              placeholder={p1.split(" ")[0]}
              className="bg-muted/30 border-border text-center font-display"
            />
            <Input
              type="number" min="0" step={row.step || "1"}
              value={stats[row.k2] || ""}
              onChange={(e) => update(row.k2, e.target.value)}
              placeholder={p2.split(" ")[0]}
              className="bg-muted/30 border-border text-center font-display"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MatchStatFields;
