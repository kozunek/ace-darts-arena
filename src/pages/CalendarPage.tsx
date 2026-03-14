import { useState } from "react";
import { useLeague } from "@/contexts/LeagueContext";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LeagueSelector from "@/components/LeagueSelector";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { pl } from "@/lib/pluralize";

const DAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];
const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const CalendarPage = () => {
  const { matches, activeLeagueId, getLeagueMatches } = useLeague();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const leagueMatches = getLeagueMatches(activeLeagueId);

  const matchesByDate: Record<string, typeof leagueMatches> = {};
  leagueMatches.forEach((m) => {
    const displayDate = m.confirmedDate || m.date;
    const key = displayDate.slice(0, 10);
    if (!matchesByDate[key]) matchesByDate[key] = [];
    matchesByDate[key].push(m);
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const selectedMatches = selectedDateStr ? matchesByDate[selectedDateStr] || [] : [];

  return (
    <div>
      <PageHeader title="Kalendarz meczów" subtitle="Przeglądaj zaplanowane i rozegrane mecze">
        <LeagueSelector />
      </PageHeader>
      <div className="container mx-auto px-4 py-8 space-y-6">

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={prev}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-display font-bold text-foreground">
          {MONTHS_PL[month]} {year}
        </h2>
        <Button variant="ghost" size="sm" onClick={next}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border border-border bg-card card-glow overflow-hidden">
        <div className="grid grid-cols-7">
          {DAYS_PL.map((d) => (
            <div key={d} className="p-2 text-center text-xs font-display uppercase tracking-wider text-muted-foreground border-b border-border">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const dateStr = day
              ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              : null;
            const dayMatches = dateStr ? matchesByDate[dateStr] || [] : [];
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = day === selectedDay;
            const hasUpcoming = dayMatches.some((m) => m.status === "upcoming" && !m.confirmedDate);
            const hasCompleted = dayMatches.some((m) => m.status === "completed");
            const hasConfirmed = dayMatches.some((m) => m.status === "upcoming" && m.confirmedDate);

            return (
              <button
                key={i}
                disabled={!day}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                className={`relative p-2 min-h-[56px] md:min-h-[72px] border-b border-r border-border text-left transition-colors
                  ${!day ? "bg-muted/10" : "hover:bg-muted/20 cursor-pointer"}
                  ${isSelected ? "bg-primary/10 ring-1 ring-primary" : ""}
                  ${isToday ? "bg-accent/5" : ""}
                `}
              >
                {day && (
                  <>
                    <span className={`text-sm font-body ${isToday ? "font-bold text-primary" : "text-foreground"}`}>
                      {day}
                    </span>
                    {dayMatches.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {hasUpcoming && <span className="h-2 w-2 rounded-full bg-accent" />}
                        {hasConfirmed && <span className="h-2 w-2 rounded-full bg-primary" />}
                        {hasCompleted && <span className="h-2 w-2 rounded-full bg-secondary" />}
                        {dayMatches.length > 1 && (
                          <span className="text-[9px] text-muted-foreground font-display">{dayMatches.length}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground font-body">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Zaplanowany</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Termin ustalony</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-secondary" /> Rozegrany</span>
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <div>
          <h3 className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-3">
            {selectedDay} {MONTHS_PL[month]} {year} — {selectedMatches.length} {selectedMatches.length === 1 ? "mecz" : "meczów"}
          </h3>
          {selectedMatches.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm">Brak meczów w tym dniu.</p>
          ) : (
            <div className="space-y-2">
              {selectedMatches.map((m) => (
                <div key={m.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between card-glow">
                  <div>
                    <div className="font-body font-medium text-foreground text-sm">
                      {m.player1Name} vs {m.player2Name}
                    </div>
                    {m.round && <div className="text-xs text-muted-foreground mt-0.5">Kolejka {m.round}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.status === "completed" ? (
                      <span className="text-xl font-display font-bold text-foreground">{m.score1}:{m.score2}</span>
                    ) : m.confirmedDate ? (
                      <Badge variant="outline" className="text-primary border-primary/30 text-[10px] font-display uppercase">
                        Termin ustalony
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-accent border-accent/30 text-[10px] font-display uppercase">
                        Do rozegrania
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default CalendarPage;
