import { Match } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";

interface PlayerProgressChartProps {
  playerId: string;
  matches: Match[];
}

const PlayerProgressChart = ({ playerId, matches }: PlayerProgressChartProps) => {
  // Sort matches by date and build cumulative data
  const sorted = [...matches]
    .filter((m) => m.status === "completed" && (m.player1Id === playerId || m.player2Id === playerId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length < 2) return null;

  let cumAvgSum = 0;
  let cum180 = 0;

  const data = sorted.map((m, i) => {
    const isP1 = m.player1Id === playerId;
    const avg = isP1 ? m.avg1 : m.avg2;
    const o180 = isP1 ? m.oneEighties1 : m.oneEighties2;

    if (avg != null) cumAvgSum += avg;
    cum180 += o180 ?? 0;

    const matchAvg = avg ?? 0;
    const runningAvg = cumAvgSum / (i + 1);

    return {
      name: `#${i + 1}`,
      date: new Date(m.date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" }),
      avg: Number(matchAvg.toFixed(1)),
      runningAvg: Number(runningAvg.toFixed(1)),
      cum180,
    };
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4 card-glow mb-6">
      <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" /> Progres średniej
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
              dataKey="avg"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
              name="Średnia meczu"
            />
            <Line
              type="monotone"
              dataKey="runningAvg"
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Średnia krocząca"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 180s cumulative */}
      <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground mt-6 mb-4 flex items-center gap-2">
        🎯 180-tki (kumulatywnie)
      </h3>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="cum180"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--accent))" }}
              name="Suma 180-tek"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PlayerProgressChart;
