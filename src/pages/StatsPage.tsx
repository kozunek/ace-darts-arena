import { useState } from "react";
import { useLeague } from "@/contexts/LeagueContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Trophy, Target, Crown, TrendingUp, Crosshair, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeagueSelector from "@/components/LeagueSelector";

type StatsTab = "tons" | "averages" | "checkouts" | "winrate";

const StatsPage = () => {
  const { getGlobalTonStats, getLeagueTonStats, activeLeagueId, leagues } = useLeague();
  const [viewMode, setViewMode] = useState<"global" | "league">("global");
  const [activeTab, setActiveTab] = useState<StatsTab>("tons");
  
  const stats = viewMode === "global" ? getGlobalTonStats() : getLeagueTonStats(activeLeagueId);
  const activeLg = leagues.find(l => l.id === activeLeagueId);

  const tabs: { id: StatsTab; label: string; icon: React.ReactNode }[] = [
    { id: "tons", label: "Ton Scores", icon: <Target className="h-3.5 w-3.5" /> },
    { id: "averages", label: "Średnie", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "checkouts", label: "Checkouty", icon: <Crosshair className="h-3.5 w-3.5" /> },
    { id: "winrate", label: "Win Rate", icon: <Award className="h-3.5 w-3.5" /> },
  ];

  // Sort by different criteria per tab
  const sortedStats = [...stats].sort((a, b) => {
    if (activeTab === "averages") return b.bestAvg - a.bestAvg;
    if (activeTab === "checkouts") return b.highestCheckout - a.highestCheckout;
    if (activeTab === "winrate") return b.totalTons - a.totalTons; // placeholder - we don't have winrate in TonLeaderEntry
    return b.totalTons - a.totalTons;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Statystyki</h1>
              <p className="text-muted-foreground font-body text-sm">Ranking graczy — kto rzuca najlepiej?</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((tab) => (
            <Button key={tab.id} variant={activeTab === tab.id ? "default" : "outline"} size="sm" onClick={() => setActiveTab(tab.id)} className="font-display uppercase tracking-wider text-xs">
              {tab.icon} <span className="ml-1">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button variant={viewMode === "global" ? "default" : "outline"} size="sm" onClick={() => setViewMode("global")} className="font-display uppercase tracking-wider text-xs">
            <Crown className="h-3.5 w-3.5 mr-1" /> Globalnie
          </Button>
          <Button variant={viewMode === "league" ? "default" : "outline"} size="sm" onClick={() => setViewMode("league")} className="font-display uppercase tracking-wider text-xs">
            <Trophy className="h-3.5 w-3.5 mr-1" /> Per Liga
          </Button>
          {viewMode === "league" && <div className="ml-2"><LeagueSelector /></div>}
        </div>

        {viewMode === "league" && activeLg && (
          <p className="text-sm text-muted-foreground font-body mb-4">
            Wyniki dla: <span className="text-foreground font-semibold">{activeLg.name}</span> · {activeLg.season}
          </p>
        )}

        {/* Top 3 podium */}
        {sortedStats.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[sortedStats[1], sortedStats[0], sortedStats[2]].map((entry, idx) => {
              const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const heights = ["h-28", "h-36", "h-24"];
              const colors = ["text-muted-foreground", "text-accent", "text-primary/60"];
              const podiumValue = activeTab === "averages" ? entry.bestAvg.toFixed(1) : activeTab === "checkouts" ? entry.highestCheckout.toString() : `${entry.totalTons} tonów`;
              return (
                <motion.div key={entry.playerId} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.15, duration: 0.5 }} className="flex flex-col items-center">
                  <Link to={`/players/${entry.playerId}`} className="flex flex-col items-center group">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/20 border-2 ${rank === 1 ? "border-accent" : "border-border"} flex items-center justify-center text-sm md:text-base font-display font-bold text-primary group-hover:scale-110 transition-transform mb-2`}>
                      {entry.avatar}
                    </div>
                    <span className="font-body font-medium text-foreground text-xs md:text-sm text-center">{entry.playerName}</span>
                  </Link>
                  <div className={`${heights[idx]} w-full mt-3 rounded-t-lg bg-gradient-to-t from-primary/10 to-transparent border border-border/50 flex flex-col items-center justify-end pb-3`}>
                    <span className={`text-2xl md:text-3xl font-display font-bold ${colors[idx]}`}>{rank}</span>
                    <span className="text-xs text-muted-foreground font-display">{podiumValue}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <div className="rounded-lg border border-border overflow-hidden card-glow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground w-12">#</th>
                  <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Gracz</th>
                  {activeTab === "tons" && (
                    <>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-accent">T40</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-secondary">T60</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-primary">T80</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-purple-400">T+</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-destructive">180</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-foreground">Suma</th>
                    </>
                  )}
                  {activeTab === "averages" && (
                    <>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-foreground">Najl. Śr.</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Suma tonów</th>
                    </>
                  )}
                  {activeTab === "checkouts" && (
                    <>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-foreground">Najw. HC</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Najl. Śr.</th>
                    </>
                  )}
                  {activeTab === "winrate" && (
                    <>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-foreground">Tony</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">180</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Najl. Śr.</th>
                      <th className="text-center px-3 py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">HC</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((entry, index) => (
                  <motion.tr key={entry.playerId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      {index < 3 ? (
                        <span className={`text-lg font-display font-bold ${index === 0 ? "text-accent" : index === 1 ? "text-muted-foreground" : "text-primary/60"}`}>{index + 1}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground font-display">{index + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/players/${entry.playerId}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary group-hover:bg-primary/30 transition-colors">{entry.avatar}</div>
                        <span className="font-body font-medium text-foreground text-sm group-hover:text-primary transition-colors">{entry.playerName}</span>
                      </Link>
                    </td>
                    {activeTab === "tons" && (
                      <>
                        <td className="text-center px-3 py-3"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-accent/10 text-accent text-sm font-display font-bold border border-accent/20">{entry.ton40}</span></td>
                        <td className="text-center px-3 py-3"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-secondary/10 text-secondary text-sm font-display font-bold border border-secondary/20">{entry.ton60}</span></td>
                        <td className="text-center px-3 py-3"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-display font-bold border border-primary/20">{entry.ton80}</span></td>
                        <td className="text-center px-3 py-3"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-sm font-display font-bold border border-purple-500/20">{entry.tonPlus}</span></td>
                        <td className="text-center px-3 py-3"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-destructive/10 text-destructive text-sm font-display font-bold border border-destructive/20">{entry.oneEighties}</span></td>
                        <td className="text-center px-3 py-3"><span className="text-lg font-display font-bold text-foreground">{entry.totalTons}</span></td>
                      </>
                    )}
                    {activeTab === "averages" && (
                      <>
                        <td className="text-center px-3 py-3"><span className="text-lg font-display font-bold text-foreground">{entry.bestAvg > 0 ? entry.bestAvg.toFixed(1) : "—"}</span></td>
                        <td className="text-center px-3 py-3 text-sm text-muted-foreground font-body">{entry.totalTons}</td>
                      </>
                    )}
                    {activeTab === "checkouts" && (
                      <>
                        <td className="text-center px-3 py-3"><span className="text-lg font-display font-bold text-foreground">{entry.highestCheckout > 0 ? entry.highestCheckout : "—"}</span></td>
                        <td className="text-center px-3 py-3 text-sm text-muted-foreground font-body">{entry.bestAvg > 0 ? entry.bestAvg.toFixed(1) : "—"}</td>
                      </>
                    )}
                    {activeTab === "winrate" && (
                      <>
                        <td className="text-center px-3 py-3"><span className="text-lg font-display font-bold text-foreground">{entry.totalTons}</span></td>
                        <td className="text-center px-3 py-3 text-sm text-muted-foreground font-body">{entry.oneEighties}</td>
                        <td className="text-center px-3 py-3 text-sm text-muted-foreground font-body">{entry.bestAvg > 0 ? entry.bestAvg.toFixed(1) : "—"}</td>
                        <td className="text-center px-3 py-3 text-sm text-muted-foreground font-body">{entry.highestCheckout > 0 ? entry.highestCheckout : "—"}</td>
                      </>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sortedStats.length === 0 && (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-body">Brak danych statystycznych. Zagraj mecz!</p>
          </div>
        )}

        {/* Legend for tons tab */}
        {activeTab === "tons" && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
            <LegendItem label="Ton 40" desc="Rzuty 40-59 pkt" color="bg-accent/10 border-accent/20 text-accent" />
            <LegendItem label="Ton 60" desc="Rzuty 60-79 pkt" color="bg-secondary/10 border-secondary/20 text-secondary" />
            <LegendItem label="Ton 80" desc="Rzuty 80-99 pkt" color="bg-primary/10 border-primary/20 text-primary" />
            <LegendItem label="Ton+" desc="Rzuty 100+ pkt" color="bg-purple-500/10 border-purple-500/20 text-purple-400" />
            <LegendItem label="180" desc="Maksymalny wynik" color="bg-destructive/10 border-destructive/20 text-destructive" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

const LegendItem = ({ label, desc, color }: { label: string; desc: string; color: string }) => (
  <div className={`rounded-lg border p-3 ${color}`}>
    <div className="font-display font-bold text-sm">{label}</div>
    <div className="text-xs opacity-70 font-body">{desc}</div>
  </div>
);

export default StatsPage;
