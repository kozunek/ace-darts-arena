import { useState } from "react";
import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText, Users, BarChart3, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ExportPanel = () => {
  const { leagues, matches, players, getLeagueStandings, getLeagueTonStats } = useLeague();
  const { toast } = useToast();
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]?.id || "");

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📥 Eksport gotowy!", description: `Plik ${filename} został pobrany.` });
  };

  const leagueName = () => leagues.find((l) => l.id === selectedLeague)?.name || "Liga";
  const dateStr = () => new Date().toISOString().slice(0, 10);

  const exportStandings = () => {
    if (!selectedLeague) return;
    const standings = getLeagueStandings(selectedLeague);
    let csv = "Pozycja,Gracz,Mecze,Wygrane,Przegrane,Punkty,Średnia,Najlepsza śr.,180s,HC,Win%,Legi+,Legi-,Diff\n";
    standings.forEach((s, i) => {
      csv += `${i + 1},"${s.name}",${s.stats.matchesPlayed},${s.stats.wins},${s.stats.losses},${s.stats.points},${s.stats.avg},${s.stats.bestAvg},${s.stats.oneEighties},${s.stats.highestCheckout},${s.stats.winRate}%,${s.stats.legsWon},${s.stats.legsLost},${s.stats.legsWon - s.stats.legsLost}\n`;
    });
    downloadCSV(csv, `${leagueName()}_tabela_${dateStr()}.csv`);
  };

  const exportMatches = () => {
    if (!selectedLeague) return;
    const leagueMatches = matches
      .filter((m) => m.leagueId === selectedLeague && m.status === "completed")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let csv = "Data,Kolejka,Gracz1,Gracz2,Wynik,Śr.1,Śr.2,First9_1,First9_2,180s_1,180s_2,HC1,HC2,Lotki1,Lotki2,CO%_1,CO%_2\n";
    leagueMatches.forEach((m) => {
      const co1 = m.checkoutAttempts1 ? `${((m.checkoutHits1 ?? 0) / m.checkoutAttempts1 * 100).toFixed(1)}%` : "";
      const co2 = m.checkoutAttempts2 ? `${((m.checkoutHits2 ?? 0) / m.checkoutAttempts2 * 100).toFixed(1)}%` : "";
      csv += `${m.date},${m.round || ""},"${m.player1Name}","${m.player2Name}",${m.score1}-${m.score2},${m.avg1 || ""},${m.avg2 || ""},${m.first9Avg1 || ""},${m.first9Avg2 || ""},${m.oneEighties1 || 0},${m.oneEighties2 || 0},${m.highCheckout1 || 0},${m.highCheckout2 || 0},${m.dartsThrown1 || 0},${m.dartsThrown2 || 0},${co1},${co2}\n`;
    });
    downloadCSV(csv, `${leagueName()}_mecze_${dateStr()}.csv`);
  };

  const exportPlayerStats = () => {
    if (!selectedLeague) return;
    const tonStats = getLeagueTonStats(selectedLeague);
    let csv = "Gracz,Mecze,Win%,Wygrane,Przegrane,Najlepsza śr.,180s,HC,60+,100+,140+,170+,Lotki ogółem,CO%\n";
    tonStats.forEach((s) => {
      csv += `"${s.playerName}",${s.matchesPlayed},${s.winRate}%,${s.wins},${s.losses},${s.bestAvg},${s.oneEighties},${s.highestCheckout},${s.ton60},${s.ton80},${s.tonPlus},${s.ton40},${s.matchesPlayed},${s.checkoutRate}%\n`;
    });
    downloadCSV(csv, `${leagueName()}_statystyki_graczy_${dateStr()}.csv`);
  };

  const exportAllMatches = () => {
    const allCompleted = matches
      .filter((m) => m.status === "completed")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const leagueMap = new Map(leagues.map(l => [l.id, l.name]));
    let csv = "Liga,Data,Kolejka,Gracz1,Gracz2,Wynik,Śr.1,Śr.2,180s_1,180s_2,HC1,HC2\n";
    allCompleted.forEach((m) => {
      csv += `"${leagueMap.get(m.leagueId) || "?"}",${m.date},${m.round || ""},"${m.player1Name}","${m.player2Name}",${m.score1}-${m.score2},${m.avg1 || ""},${m.avg2 || ""},${m.oneEighties1 || 0},${m.oneEighties2 || 0},${m.highCheckout1 || 0},${m.highCheckout2 || 0}\n`;
    });
    downloadCSV(csv, `wszystkie_mecze_${dateStr()}.csv`);
  };

  const exportUpcoming = () => {
    if (!selectedLeague) return;
    const upcoming = matches
      .filter((m) => m.leagueId === selectedLeague && m.status === "upcoming")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let csv = "Data,Kolejka,Gracz1,Gracz2,Status,Grupa,Runda drabinki\n";
    upcoming.forEach((m) => {
      csv += `${m.date},${m.round || ""},"${m.player1Name}","${m.player2Name}",${m.status},${m.groupName || ""},${m.bracketRound || ""}\n`;
    });
    downloadCSV(csv, `${leagueName()}_nadchodzace_${dateStr()}.csv`);
  };

  const exportH2H = () => {
    if (!selectedLeague) return;
    const completed = matches.filter(m => m.leagueId === selectedLeague && m.status === "completed");
    const h2hMap = new Map<string, { wins: number; losses: number; legsFor: number; legsAgainst: number }>();
    
    completed.forEach(m => {
      const key1 = `${m.player1Name} vs ${m.player2Name}`;
      const key2 = `${m.player2Name} vs ${m.player1Name}`;
      
      if (!h2hMap.has(key1)) h2hMap.set(key1, { wins: 0, losses: 0, legsFor: 0, legsAgainst: 0 });
      const entry = h2hMap.get(key1)!;
      if ((m.score1 ?? 0) > (m.score2 ?? 0)) entry.wins++;
      else entry.losses++;
      entry.legsFor += m.score1 ?? 0;
      entry.legsAgainst += m.score2 ?? 0;
    });

    let csv = "Gracz1 vs Gracz2,Wygrane,Przegrane,Legi za,Legi przeciw\n";
    h2hMap.forEach((v, k) => {
      csv += `"${k}",${v.wins},${v.losses},${v.legsFor},${v.legsAgainst}\n`;
    });
    downloadCSV(csv, `${leagueName()}_h2h_${dateStr()}.csv`);
  };

  const exportJSON = () => {
    if (!selectedLeague) return;
    const standings = getLeagueStandings(selectedLeague);
    const leagueMatches = matches.filter(m => m.leagueId === selectedLeague);
    const league = leagues.find(l => l.id === selectedLeague);
    
    const data = {
      league: { name: league?.name, season: league?.season, format: league?.format, type: league?.league_type },
      exportDate: new Date().toISOString(),
      standings: standings.map((s, i) => ({
        position: i + 1, name: s.name, ...s.stats,
      })),
      matches: leagueMatches.map(m => ({
        date: m.date, round: m.round, player1: m.player1Name, player2: m.player2Name,
        score: `${m.score1 ?? "?"}-${m.score2 ?? "?"}`, status: m.status,
        avg1: m.avg1, avg2: m.avg2, oneEighties1: m.oneEighties1, oneEighties2: m.oneEighties2,
        highCheckout1: m.highCheckout1, highCheckout2: m.highCheckout2,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${leagueName()}_pelny_raport_${dateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📥 Eksport JSON gotowy!" });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <Download className="h-5 w-5 text-primary" /> Eksport danych
      </h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2 block">
            Wybierz ligę
          </label>
          <Select value={selectedLeague} onValueChange={setSelectedLeague}>
            <SelectTrigger className="bg-muted/30 border-border">
              <SelectValue placeholder="Wybierz ligę" />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} ({l.season})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button variant="outline" onClick={exportStandings} disabled={!selectedLeague} className="flex items-center gap-2 justify-start">
            <FileSpreadsheet className="h-4 w-4 text-secondary" />
            Tabela ligowa (CSV)
          </Button>
          <Button variant="outline" onClick={exportMatches} disabled={!selectedLeague} className="flex items-center gap-2 justify-start">
            <FileText className="h-4 w-4 text-primary" />
            Mecze rozegrane (CSV)
          </Button>
          <Button variant="outline" onClick={exportPlayerStats} disabled={!selectedLeague} className="flex items-center gap-2 justify-start">
            <Users className="h-4 w-4 text-accent" />
            Statystyki graczy (CSV)
          </Button>
          <Button variant="outline" onClick={exportUpcoming} disabled={!selectedLeague} className="flex items-center gap-2 justify-start">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Nadchodzące mecze (CSV)
          </Button>
          <Button variant="outline" onClick={exportH2H} disabled={!selectedLeague} className="flex items-center gap-2 justify-start">
            <Swords className="h-4 w-4 text-destructive" />
            Head-to-Head (CSV)
          </Button>
          <Button variant="outline" onClick={exportJSON} disabled={!selectedLeague} className="flex items-center gap-2 justify-start">
            <FileText className="h-4 w-4 text-secondary" />
            Pełny raport (JSON)
          </Button>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-display font-bold text-foreground mb-3">Eksport globalny</h3>
          <Button variant="outline" onClick={exportAllMatches} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Wszystkie mecze ze wszystkich lig (CSV)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
