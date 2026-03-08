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
  { label: "Ton 60 (60-79)", k1: "ton60_1", k2: "ton60_2" },
  { label: "Ton 80 (80-99)", k1: "ton80_1", k2: "ton80_2" },
  { label: "Ton+ (100+)", k1: "tonPlus1", k2: "tonPlus2" },
  { label: "Rzuty (darts)", k1: "darts1", k2: "darts2" },
  { label: "Checkouty rzucone", k1: "checkoutAttempts1", k2: "checkoutAttempts2" },
  { label: "Checkouty trafione", k1: "checkoutHits1", k2: "checkoutHits2" },
];

const MatchStatFields = ({ stats, setStats, p1, p2 }: MatchStatFieldsProps) => {
  const update = (key: string, value: string) => setStats({ ...stats, [key]: value });

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
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
