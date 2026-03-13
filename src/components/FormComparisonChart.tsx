import { Match } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { BarChart3 } from "lucide-react";
import { useMemo } from "react";

interface FormComparisonChartProps {
  playerId: string;
  matches: Match[];
  allMatches: Match[];
  leagueId: string;
}

const FormComparisonChart = ({ playerId, matches, allMatches, leagueId }: FormComparisonChartProps) => {
  const data = useMemo(() => {
    const playerMatches = [...matches]
      .filter(m => m.status === "completed" && (m.player1Id === playerId || m.player2Id === playerId))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10);

    if (playerMatches.length < 2) return [];

    // Calculate league avg per round/date for comparison
    const leagueMatches = allMatches.filter(m => m.leagueId === leagueId && m.status === "completed");

    return playerMatches.map((m, i) => {
      const isP1 = m.player1Id === playerId;
      const myAvg = isP1 ? m.avg1 : m.avg2;

      // League avg: all completed matches up to this date
      const matchDate = new Date(m.date).getTime();
      const leagueMatchesUpToDate = leagueMatches.filter(lm => new Date(lm.date).getTime() <= matchDate);
      let leagueAvgSum = 0;
      let leagueAvgCount = 0;
      for (const lm of leagueMatchesUpToDate) {
        if (lm.avg1 != null) { leagueAvgSum += lm.avg1; leagueAvgCount++; }
        if (lm.avg2 != null) { leagueAvgSum += lm.avg2; leagueAvgCount++; }
      }
      const leagueAvg = leagueAvgCount > 0 ? leagueAvgSum / leagueAvgCount : 0;

      return {
        name: `#${i + 1}`,
        date: new Date(m.date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" }),
        myAvg: myAvg != null ? Number(myAvg.toFixed(1)) : null,
        leagueAvg: Number(leagueAvg.toFixed(1)),
      };
    });
  }, [playerId, matches, allMatches, leagueId]);

  if (data.length < 2) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 card-glow mb-6">
      <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4" /> Moja forma vs średnia ligi (ostatnie 10)
      </h3>
      <div className="h-48 md:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Line
              type="monotone"
              dataKey="myAvg"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
              name="Moja średnia"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="leagueAvg"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Średnia ligi"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground font-display uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-primary inline-block rounded" /> Twoja średnia
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-muted-foreground inline-block rounded border-dashed" /> Średnia ligi
        </span>
      </div>
    </div>
  );
};

export default FormComparisonChart;
