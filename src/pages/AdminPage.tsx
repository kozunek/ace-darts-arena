import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague } from "@/contexts/LeagueContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserCheck, Plus, Calendar, Lock, Trash2, Edit2, Users, Trophy, Settings, Check, Clock, CheckCircle2, XCircle, UserPlus, Award, Shuffle, Brackets, Layers, Plug, ScrollText, Download, Bug, Zap, MessageCircle, Ban, AlertTriangle, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import AuditLogPanel from "@/components/AuditLogPanel";
import ExportPanel from "@/components/ExportPanel";
import ExtensionConfigPanel from "@/components/ExtensionConfigPanel";
import BugReportsPanel from "@/components/BugReportsPanel";
import AdminChatPanel from "@/components/AdminChatPanel";
import DiscordWebhookPanel from "@/components/DiscordWebhookPanel";
import RoleManagementPanel from "@/components/RoleManagementPanel";
import SelfHostConfigPanel from "@/components/SelfHostConfigPanel";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BEST_OF_OPTIONS, type LeagueType, type LeaguePlatform, type BonusRules, DEFAULT_BONUS_RULES } from "@/data/mockData";
import { generateRoundRobin, generateBracket, generateGroupStage, shuffle, getRecommendedGroups } from "@/lib/tournamentUtils";
import MatchStatFields from "@/components/MatchStatFields";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

type AdminTab = "overview" | "leagues" | "players" | "matches" | "approval" | "roles" | "integrations" | "discord" | "audit" | "export" | "bugs" | "chats";

const LEAGUE_TYPE_LABELS: Record<LeagueType, string> = {
  league: "Liga (Round-Robin)",
  bracket: "Turniej (Drabinka)",
  group_bracket: "Grupy + Drabinka",
};

const AdminPage = () => {
  const { user, isAdmin, isModerator, loading } = useAuth();
  const {
    players, matches, leagues, pendingPlayers,
    approvePlayer, addMatch, deleteMatch, addPlayer,
    addLeague, updateLeague, deleteLeague,
    updatePlayer, deletePlayer, assignPlayerToLeague, removePlayerFromLeague,
    approveMatch, rejectMatch, updateMatchResult, getPendingApprovalMatches, refreshData,
  } = useLeague();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  if (loading) return null;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane Logowanie</h1>
        <Link to="/login"><Button variant="hero" size="lg">Zaloguj się</Button></Link>
      </div>
    );
  }

  if (!isAdmin && !isModerator) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Brak Dostępu</h1>
        <p className="text-muted-foreground font-body">Tylko administrator lub moderator ma dostęp do tego panelu.</p>
      </div>
    );
  }

  const pendingApproval = getPendingApprovalMatches();

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "overview", label: "Podsumowanie", icon: <Settings className="h-4 w-4" /> },
    { id: "approval", label: `Zatwierdzanie (${pendingApproval.length})`, icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: "leagues", label: "Ligi / Turnieje", icon: <Trophy className="h-4 w-4" />, adminOnly: true },
    { id: "players", label: "Gracze", icon: <Users className="h-4 w-4" />, adminOnly: true },
    { id: "matches", label: "Mecze", icon: <Calendar className="h-4 w-4" />, adminOnly: true },
    { id: "roles", label: "Role", icon: <Award className="h-4 w-4" />, adminOnly: true },
    { id: "integrations", label: "Integracje", icon: <Plug className="h-4 w-4" />, adminOnly: true },
    { id: "discord", label: "Discord", icon: <MessageCircle className="h-4 w-4" />, adminOnly: true },
    { id: "audit", label: "Dziennik", icon: <ScrollText className="h-4 w-4" />, adminOnly: true },
    { id: "export", label: "Eksport", icon: <Download className="h-4 w-4" />, adminOnly: true },
    { id: "chats", label: "Czaty", icon: <MessageCircle className="h-4 w-4" />, adminOnly: true },
    { id: "bugs", label: "Błędy", icon: <Bug className="h-4 w-4" /> },
  ];

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  const completedCount = matches.filter((m) => m.status === "completed").length;
  const upcomingCount = matches.filter((m) => m.status === "upcoming").length;

  return (
    <div>
      <PageHeader 
        title={isAdmin ? "Panel Admina" : "Panel Moderatora"} 
        subtitle={isAdmin ? "Pełne zarządzanie ligami, turniejami, graczami i meczami" : "Zatwierdzanie wyników meczów"} 
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl">

      <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
        {visibleTabs.map((tab) => (
          <Button key={tab.id} variant={activeTab === tab.id ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(tab.id)} className="font-display uppercase tracking-wider text-xs">
            {tab.icon}
            <span className="ml-1">{tab.label}</span>
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === "overview" && <OverviewTab leagues={leagues} players={players} completedCount={completedCount} upcomingCount={upcomingCount} pendingPlayers={pendingPlayers} pendingApproval={pendingApproval} approvePlayer={approvePlayer} toast={toast} isAdmin={isAdmin} />}
          {activeTab === "approval" && <ApprovalTab pendingApproval={pendingApproval} approveMatch={approveMatch} rejectMatch={rejectMatch} updateMatchResult={updateMatchResult} toast={toast} />}
          {activeTab === "leagues" && isAdmin && <LeaguesTab leagues={leagues} players={players} addLeague={addLeague} updateLeague={updateLeague} deleteLeague={deleteLeague} addMatch={addMatch} refreshData={refreshData} assignPlayerToLeague={assignPlayerToLeague} removePlayerFromLeague={removePlayerFromLeague} toast={toast} />}
          {activeTab === "players" && isAdmin && <PlayersTab players={players} leagues={leagues} pendingPlayers={pendingPlayers} approvePlayer={approvePlayer} updatePlayer={updatePlayer} deletePlayer={deletePlayer} assignPlayerToLeague={assignPlayerToLeague} removePlayerFromLeague={removePlayerFromLeague} addPlayer={addPlayer} toast={toast} />}
          {activeTab === "matches" && isAdmin && <MatchesTab matches={matches} players={players} leagues={leagues} addMatch={addMatch} deleteMatch={deleteMatch} toast={toast} />}
          {activeTab === "roles" && isAdmin && <RoleManagementPanel />}
          {activeTab === "integrations" && isAdmin && (
            <div className="space-y-8">
              <ExtensionConfigPanel leagues={leagues} />
              <SelfHostConfigPanel />
            </div>
          )}
          {activeTab === "discord" && isAdmin && <DiscordWebhookPanel leagues={leagues} />}
          {activeTab === "audit" && isAdmin && <AuditLogPanel />}
          {activeTab === "export" && isAdmin && <ExportPanel />}
          {activeTab === "chats" && isAdmin && <AdminChatPanel />}
          {activeTab === "bugs" && <BugReportsPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─── OVERVIEW TAB ───
const OverviewTab = ({ leagues, players, completedCount, upcomingCount, pendingPlayers, pendingApproval, approvePlayer, toast, isAdmin }: any) => {
  const [autoSettings, setAutoSettings] = useState<{ id: string; auto_approve: boolean; auto_approve_manual: boolean; auto_approve_screenshot: boolean } | null>(null);
  const [savingAuto, setSavingAuto] = useState(false);

  useEffect(() => {
    supabase.from("extension_settings").select("id, auto_approve, auto_approve_manual, auto_approve_screenshot").is("league_id", null).maybeSingle().then(({ data }) => {
      if (data) setAutoSettings(data as any);
    });
  }, []);

  const toggleAutoSetting = async (key: "auto_approve" | "auto_approve_manual" | "auto_approve_screenshot", value: boolean) => {
    if (!autoSettings) return;
    const updated = { ...autoSettings, [key]: value };
    setAutoSettings(updated);
    setSavingAuto(true);
    const { error } = await supabase.from("extension_settings").update({ [key]: value, updated_at: new Date().toISOString() } as any).eq("id", autoSettings.id);
    setSavingAuto(false);
    if (error) {
      setAutoSettings(autoSettings);
      toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Zapisano ✅" });
    }
  };

  return (
  <div className="space-y-8">
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      <SummaryBox label="Ligi" value={leagues.length} icon="🏆" />
      <SummaryBox label="Graczy" value={players.filter((p: any) => p.approved).length} icon="👥" />
      <SummaryBox label="Rozegranych" value={completedCount} icon="✅" />
      <SummaryBox label="Zaplanowanych" value={upcomingCount} icon="📅" />
      <SummaryBox label="Oczekujących" value={pendingPlayers.length} icon="⏳" />
      <SummaryBox label="Do zatwierdzenia" value={pendingApproval.length} icon="📋" />
    </div>

    {/* Auto-approval quick settings */}
    {isAdmin && autoSettings && (
      <section className="rounded-lg border border-border bg-card p-6 card-glow">
        <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" /> Automatyczne zatwierdzanie wyników
        </h2>
        <p className="text-xs text-muted-foreground font-body mb-4">
          Włącz lub wyłącz automatyczne zatwierdzanie wyników dla każdej z platform zgłoszeniowych.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-body font-medium text-foreground">Autodarts (wtyczka/automatyczne)</Label>
              <p className="text-xs text-muted-foreground font-body mt-0.5">Wyniki z wtyczki Chrome zatwierdzane automatycznie</p>
            </div>
            <Switch checked={autoSettings.auto_approve} onCheckedChange={(v) => toggleAutoSetting("auto_approve", v)} />
          </div>
          <div className="border-t border-border pt-4 flex items-center justify-between">
            <div>
              <Label className="font-body font-medium text-foreground">Ręczne (z linkiem Autodarts)</Label>
              <p className="text-xs text-muted-foreground font-body mt-0.5">Wyniki przesłane ręcznie przez graczy zatwierdzane automatycznie</p>
            </div>
            <Switch checked={autoSettings.auto_approve_manual} onCheckedChange={(v) => toggleAutoSetting("auto_approve_manual", v)} />
          </div>
          <div className="border-t border-border pt-4 flex items-center justify-between">
            <div>
              <Label className="font-body font-medium text-foreground">Screenshot AI (OCR)</Label>
              <p className="text-xs text-muted-foreground font-body mt-0.5">Wyniki ze screenshotów rozpoznane przez AI zatwierdzane automatycznie</p>
            </div>
            <Switch checked={autoSettings.auto_approve_screenshot} onCheckedChange={(v) => toggleAutoSetting("auto_approve_screenshot", v)} />
          </div>
        </div>
      </section>
    )}

    {pendingApproval.length > 0 && (
      <section className="rounded-lg border border-accent/30 bg-accent/5 p-6 card-glow">
        <h2 className="text-lg font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-accent" /> Mecze do zatwierdzenia ({pendingApproval.length})
        </h2>
        <p className="text-sm text-muted-foreground mb-3">Gracze zgłosili wyniki — przejdź do zakładki "Zatwierdzanie".</p>
      </section>
    )}
    {isAdmin && pendingPlayers.length > 0 && (
      <section className="rounded-lg border border-border bg-card p-6 card-glow">
        <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-accent" /> Oczekujący gracze ({pendingPlayers.length})
        </h2>
        <div className="space-y-3">
          {pendingPlayers.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-display font-bold text-accent">{p.avatar}</div>
                <span className="font-body font-medium text-foreground text-sm">{p.name}</span>
              </div>
              <Button size="sm" variant="default" onClick={() => { approvePlayer(p.id); toast({ title: "Gracz zatwierdzony!", description: `${p.name} został dodany.` }); }}>
                <UserCheck className="h-3.5 w-3.5 mr-1" /> Zatwierdź
              </Button>
            </div>
          ))}
        </div>
      </section>
    )}
  </div>
  );
};
// ─── APPROVAL TAB ───
const ApprovalTab = ({ pendingApproval, approveMatch, rejectMatch, updateMatchResult, toast }: any) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStats, setEditStats] = useState<Record<string, string>>({});
  const [editScore1, setEditScore1] = useState("");
  const [editScore2, setEditScore2] = useState("");

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setEditScore1(String(m.score1 ?? ""));
    setEditScore2(String(m.score2 ?? ""));
    setEditStats({
      avg1: String(m.avg1 ?? ""), avg2: String(m.avg2 ?? ""),
      first9Avg1: String(m.first9Avg1 ?? ""), first9Avg2: String(m.first9Avg2 ?? ""),
      oneEighties1: String(m.oneEighties1 ?? ""), oneEighties2: String(m.oneEighties2 ?? ""),
      hc1: String(m.highCheckout1 ?? ""), hc2: String(m.highCheckout2 ?? ""),
      ton60_1: String(m.ton60_1 ?? ""), ton60_2: String(m.ton60_2 ?? ""),
      ton80_1: String(m.ton80_1 ?? ""), ton80_2: String(m.ton80_2 ?? ""),
      tonPlus1: String(m.tonPlus1 ?? ""), tonPlus2: String(m.tonPlus2 ?? ""),
      ton40_1: String(m.ton40_1 ?? ""), ton40_2: String(m.ton40_2 ?? ""),
      darts1: String(m.dartsThrown1 ?? ""), darts2: String(m.dartsThrown2 ?? ""),
      checkoutAttempts1: String(m.checkoutAttempts1 ?? ""), checkoutAttempts2: String(m.checkoutAttempts2 ?? ""),
      checkoutHits1: String(m.checkoutHits1 ?? ""), checkoutHits2: String(m.checkoutHits2 ?? ""),
    });
  };

  const saveEdit = async (m: any) => {
    const s1 = parseInt(editScore1) || 0;
    const s2 = parseInt(editScore2) || 0;
    await updateMatchResult(m.id, {
      score1: s1, score2: s2,
      avg1: parseFloat(editStats.avg1) || undefined,
      avg2: parseFloat(editStats.avg2) || undefined,
      oneEighties1: parseInt(editStats.oneEighties1) || 0,
      oneEighties2: parseInt(editStats.oneEighties2) || 0,
      highCheckout1: parseInt(editStats.hc1) || 0,
      highCheckout2: parseInt(editStats.hc2) || 0,
      ton60_1: parseInt(editStats.ton60_1) || 0,
      ton60_2: parseInt(editStats.ton60_2) || 0,
      ton80_1: parseInt(editStats.ton80_1) || 0,
      ton80_2: parseInt(editStats.ton80_2) || 0,
      tonPlus1: parseInt(editStats.tonPlus1) || 0,
      tonPlus2: parseInt(editStats.tonPlus2) || 0,
      ton40_1: parseInt(editStats.ton40_1) || 0,
      ton40_2: parseInt(editStats.ton40_2) || 0,
      dartsThrown1: parseInt(editStats.darts1) || 0,
      dartsThrown2: parseInt(editStats.darts2) || 0,
      checkoutAttempts1: parseInt(editStats.checkoutAttempts1) || 0,
      checkoutAttempts2: parseInt(editStats.checkoutAttempts2) || 0,
      checkoutHits1: parseInt(editStats.checkoutHits1) || 0,
      checkoutHits2: parseInt(editStats.checkoutHits2) || 0,
      first9Avg1: parseFloat(editStats.first9Avg1) || undefined,
      first9Avg2: parseFloat(editStats.first9Avg2) || undefined,
      autodartsLink: m.autodartsLink,
    });
    setEditingId(null);
    toast({ title: "✏️ Wynik zaktualizowany!", description: `${m.player1Name} vs ${m.player2Name}` });
  };

  if (pendingApproval.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="h-12 w-12 text-secondary mx-auto mb-4" />
        <h2 className="text-xl font-display font-bold text-foreground mb-2">Wszystko zatwierdzone!</h2>
        <p className="text-muted-foreground font-body">Nie ma żadnych meczów oczekujących na zatwierdzenie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold text-foreground">Mecze do zatwierdzenia ({pendingApproval.length})</h2>
      <div className="space-y-4">
        {pendingApproval.map((m: any) => (
          <div key={m.id} className="rounded-lg border border-accent/30 bg-card p-6 card-glow">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-body">{new Date(m.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
              {m.round && <span className="text-[10px] font-display uppercase">Kolejka {m.round}</span>}
              {m.bracketRound && <span className="text-[10px] font-display uppercase text-primary">{m.bracketRound}</span>}
              {m.groupName && <span className="text-[10px] font-display uppercase text-accent">{m.groupName}</span>}
              <span className="ml-auto text-accent font-display text-[10px] uppercase border border-accent/30 rounded-full px-2 py-0.5">Oczekuje</span>
            </div>

            {editingId === m.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground font-body mb-1 block">{m.player1Name} — Legi</Label>
                    <Input type="number" min="0" value={editScore1} onChange={e => setEditScore1(e.target.value)} className="bg-muted/30 border-border text-center font-display text-lg" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground font-body mb-1 block">{m.player2Name} — Legi</Label>
                    <Input type="number" min="0" value={editScore2} onChange={e => setEditScore2(e.target.value)} className="bg-muted/30 border-border text-center font-display text-lg" />
                  </div>
                </div>
                <MatchStatFields stats={editStats} setStats={setEditStats} p1={m.player1Name} p2={m.player2Name} />
                <div className="flex gap-3">
                  <Button variant="default" size="sm" className="flex-1" onClick={() => saveEdit(m)}>
                    <Check className="h-4 w-4 mr-1" /> Zapisz zmiany
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Anuluj</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-left flex-1">
                    <div className="font-body font-medium text-foreground">{m.player1Name}</div>
                  </div>
                  <div className="flex items-center gap-3 px-4">
                    <span className={`text-3xl font-display font-bold ${(m.score1 ?? 0) > (m.score2 ?? 0) ? "text-secondary" : "text-muted-foreground"}`}>{m.score1}</span>
                    <span className="text-sm text-muted-foreground font-display">:</span>
                    <span className={`text-3xl font-display font-bold ${(m.score2 ?? 0) > (m.score1 ?? 0) ? "text-secondary" : "text-muted-foreground"}`}>{m.score2}</span>
                  </div>
                  <div className="text-right flex-1">
                    <div className="font-body font-medium text-foreground">{m.player2Name}</div>
                  </div>
                </div>

                {/* Stats table */}
                {(m.avg1 != null || m.avg2 != null || m.dartsThrown1 || m.dartsThrown2) && (
                  <div className="rounded-md bg-muted/30 border border-border p-3 mb-4 text-xs font-body">
                    <table className="w-full">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left font-medium py-0.5">Statystyka</th>
                          <th className="text-center font-medium py-0.5">{m.player1Name?.split(" ")[0]}</th>
                          <th className="text-center font-medium py-0.5">{m.player2Name?.split(" ")[0]}</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground">
                        {(m.avg1 != null || m.avg2 != null) && (
                          <tr><td className="py-0.5 text-muted-foreground">Średnia</td><td className="text-center font-medium">{m.avg1?.toFixed(2) ?? "—"}</td><td className="text-center font-medium">{m.avg2?.toFixed(2) ?? "—"}</td></tr>
                        )}
                        {(m.first9Avg1 != null || m.first9Avg2 != null) && (
                          <tr><td className="py-0.5 text-muted-foreground">First 9</td><td className="text-center">{m.first9Avg1?.toFixed(2) ?? "—"}</td><td className="text-center">{m.first9Avg2?.toFixed(2) ?? "—"}</td></tr>
                        )}
                        {(m.oneEighties1 || m.oneEighties2) ? (
                          <tr><td className="py-0.5 text-muted-foreground">180s</td><td className="text-center">{m.oneEighties1 ?? 0}</td><td className="text-center">{m.oneEighties2 ?? 0}</td></tr>
                        ) : null}
                        {(m.highCheckout1 || m.highCheckout2) ? (
                          <tr><td className="py-0.5 text-muted-foreground">High CO</td><td className="text-center">{m.highCheckout1 ?? 0}</td><td className="text-center">{m.highCheckout2 ?? 0}</td></tr>
                        ) : null}
                        {(m.ton60_1 || m.ton60_2) ? (
                          <tr><td className="py-0.5 text-muted-foreground">60+</td><td className="text-center">{m.ton60_1 ?? 0}</td><td className="text-center">{m.ton60_2 ?? 0}</td></tr>
                        ) : null}
                        {(m.ton80_1 || m.ton80_2) ? (
                          <tr><td className="py-0.5 text-muted-foreground">100+</td><td className="text-center">{m.ton80_1 ?? 0}</td><td className="text-center">{m.ton80_2 ?? 0}</td></tr>
                        ) : null}
                        {(m.tonPlus1 || m.tonPlus2) ? (
                          <tr><td className="py-0.5 text-muted-foreground">140+</td><td className="text-center">{m.tonPlus1 ?? 0}</td><td className="text-center">{m.tonPlus2 ?? 0}</td></tr>
                        ) : null}
                        {(m.dartsThrown1 || m.dartsThrown2) ? (
                          <tr><td className="py-0.5 text-muted-foreground">Lotki</td><td className="text-center">{m.dartsThrown1 ?? 0}</td><td className="text-center">{m.dartsThrown2 ?? 0}</td></tr>
                        ) : null}
                        {(m.checkoutHits1 || m.checkoutHits2 || m.checkoutAttempts1 || m.checkoutAttempts2) ? (
                          <tr><td className="py-0.5 text-muted-foreground">CO %</td><td className="text-center">{m.checkoutHits1 ?? 0}/{m.checkoutAttempts1 ?? 0}</td><td className="text-center">{m.checkoutHits2 ?? 0}/{m.checkoutAttempts2 ?? 0}</td></tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                )}
                {!(m.avg1 != null || m.avg2 != null || m.dartsThrown1 || m.dartsThrown2) && (
                  <div className="text-xs text-muted-foreground mb-4 italic">Brak statystyk — tylko wynik</div>
                )}

                {/* Source platform badge */}
                {m.sourcePlatform && m.sourcePlatform !== "autodarts" && (
                  <div className="text-xs text-muted-foreground mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-display uppercase tracking-wider">
                      {m.sourcePlatform === "dartcounter" ? "📱 DartCounter" : "🧠 DartsMind"}
                    </span>
                  </div>
                )}

                {/* Screenshots */}
                {m.screenshotUrls && m.screenshotUrls.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground font-display uppercase tracking-wider mb-2">📸 Zrzuty ekranu ({m.screenshotUrls.length})</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {m.screenshotUrls.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors">
                          <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-auto object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {m.autodartsLink && <div className="text-xs text-primary mb-4"><a href={m.autodartsLink} target="_blank" rel="noopener noreferrer" className="hover:underline">🔗 Link Autodarts</a></div>}
                <div className="flex gap-3">
                  <Button variant="default" size="sm" className="flex-1" onClick={() => { approveMatch(m.id); toast({ title: "✅ Mecz zatwierdzony!", description: `${m.player1Name} vs ${m.player2Name}` }); }}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Zatwierdź
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => startEdit(m)}>
                    <Edit2 className="h-4 w-4 mr-1" /> Edytuj
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => { rejectMatch(m.id); toast({ title: "❌ Mecz odrzucony", description: "Wynik został odrzucony." }); }}>
                    <XCircle className="h-4 w-4 mr-1" /> Odrzuć
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── LEAGUES TAB ───
const LeaguesTab = ({ leagues, players, addLeague, updateLeague, deleteLeague, addMatch, refreshData, assignPlayerToLeague, removePlayerFromLeague, toast }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("Best of 5");
  const [isActive, setIsActive] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [leagueType, setLeagueType] = useState<LeagueType>("league");
  const [leaguePlatform, setLeaguePlatform] = useState<LeaguePlatform>("autodarts");
  const [bonusRules, setBonusRules] = useState<BonusRules>({ ...DEFAULT_BONUS_RULES });
  const [meetingsPerPair, setMeetingsPerPair] = useState(1);
  
  // Tournament generation state
  const [showGenerate, setShowGenerate] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [numGroups, setNumGroups] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [doShuffle, setDoShuffle] = useState(true);
  const [generateMode, setGenerateMode] = useState<"all" | "selected">("all");
  const [selectedRounds, setSelectedRounds] = useState<number[]>([]);
  const [roundDeadlines, setRoundDeadlines] = useState<Record<number, string>>({});
  const [playerSearch, setPlayerSearch] = useState("");
  const [leaguePlayerSearch, setLeaguePlayerSearch] = useState("");
  const [managePlayersLeagueId, setManagePlayersLeagueId] = useState<string | null>(null);

  const resetForm = () => {
    setName(""); setSeason(""); setDescription(""); setFormat("Best of 5");
    setIsActive(true); setRegistrationOpen(false); setRegistrationDeadline(""); setLeagueType("league"); setLeaguePlatform("autodarts"); setBonusRules({ ...DEFAULT_BONUS_RULES });
    setMeetingsPerPair(1);
    setShowForm(false); setEditId(null);
  };

  const startEdit = (l: any) => {
    setEditId(l.id); setName(l.name); setSeason(l.season); setDescription(l.description);
    setFormat(l.format || "Best of 5"); setIsActive(l.is_active);
    setRegistrationOpen(l.registration_open ?? false);
    setRegistrationDeadline(l.registration_deadline || "");
    setLeagueType(l.league_type || "league");
    setLeaguePlatform(l.platform || "autodarts");
    setBonusRules({ ...DEFAULT_BONUS_RULES, ...(l.bonus_rules || {}) });
    setMeetingsPerPair(l.meetings_per_pair ?? 1);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !season) { toast({ title: "Błąd", description: "Wypełnij wymagane pola.", variant: "destructive" }); return; }
    const maxLegs = BEST_OF_OPTIONS.find(o => o.value === format)?.maxLegs || 5;
    if (editId) {
      await updateLeague(editId, { name, season, description, format, is_active: isActive, registration_open: registrationOpen, registration_deadline: registrationDeadline || null, max_legs: maxLegs, league_type: leagueType, bonus_rules: bonusRules, meetings_per_pair: meetingsPerPair, platform: leaguePlatform });
      toast({ title: "Zaktualizowano!", description: `${name} została zmieniona.` });
    } else {
      const result = await addLeague({ name, season, description, format, is_active: isActive, registration_open: registrationOpen, registration_deadline: registrationDeadline || null, max_legs: maxLegs, league_type: leagueType, bonus_rules: bonusRules, meetings_per_pair: meetingsPerPair, platform: leaguePlatform });
      if (result?.error) {
        toast({ title: "Błąd", description: "Nie udało się utworzyć. Sprawdź uprawnienia.", variant: "destructive" });
        return;
      }
      toast({ title: "Utworzono!", description: `${name} została utworzona.` });
    }
    resetForm();
  };

  const togglePlayer = (pid: string) => {
    setSelectedPlayers(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
  };

  // Get existing rounds for a league
  const { getLeagueMatches } = useLeague();
  const getExistingRounds = (leagueId: string): number[] => {
    const leagueMatches = getLeagueMatches(leagueId);
    const rounds = new Set<number>();
    leagueMatches.forEach(m => { if (m.round) rounds.add(m.round); });
    return Array.from(rounds).sort((a, b) => a - b);
  };

  // Calculate total rounds for given player count (with meetings_per_pair)
  const getTotalRounds = (playerCount: number, mpp: number = 1): number => {
    const baseRounds = playerCount % 2 === 0 ? playerCount - 1 : playerCount;
    return baseRounds * mpp;
  };

  const handleGenerateSchedule = async (league: any) => {
    if (selectedPlayers.length < 2) {
      toast({ title: "Błąd", description: "Wybierz co najmniej 2 graczy.", variant: "destructive" });
      return;
    }
    setGenerating(true);

    const playerIds = doShuffle ? shuffle(selectedPlayers) : selectedPlayers;

    try {
      // Assign players to league
      for (const pid of playerIds) {
        await assignPlayerToLeague(pid, league.id);
      }

      const lt = league.league_type || "league";

      if (lt === "league") {
        // Round-robin with meetings_per_pair support
        const baseSchedule = generateRoundRobin(playerIds);
        const mpp = league.meetings_per_pair ?? 1;
        const totalBaseRounds = Math.max(...baseSchedule.map(m => m.round), 0);
        
        // Duplicate schedule for each meeting cycle
        const schedule: typeof baseSchedule = [];
        for (let cycle = 0; cycle < mpp; cycle++) {
          baseSchedule.forEach(m => {
            schedule.push({
              player1Id: cycle % 2 === 0 ? m.player1Id : m.player2Id,
              player2Id: cycle % 2 === 0 ? m.player2Id : m.player1Id,
              round: m.round + cycle * totalBaseRounds,
            });
          });
        }
        
        const existingRounds = getExistingRounds(league.id);
        const roundsToGenerate = generateMode === "all"
          ? [...new Set(schedule.map(m => m.round))].filter(r => !existingRounds.includes(r))
          : selectedRounds.filter(r => !existingRounds.includes(r));

        const matchesToInsert = schedule.filter(m => roundsToGenerate.includes(m.round));

        for (const m of matchesToInsert) {
          const deadline = roundDeadlines[m.round] || startDate;
          await supabase.from("matches").insert({
            league_id: league.id,
            player1_id: m.player1Id,
            player2_id: m.player2Id,
            date: deadline,
            round: m.round,
            status: "upcoming",
          });
        }
        toast({ title: "🎯 Harmonogram wygenerowany!", description: `${matchesToInsert.length} meczów w ${roundsToGenerate.length} kolejkach.` });

      } else if (lt === "bracket") {
        // Single elimination bracket
        const bracket = generateBracket(playerIds);
        for (const m of bracket) {
          if (m.player1Id === "TBD" || !m.player2Id) continue;
          await supabase.from("matches").insert({
            league_id: league.id,
            player1_id: m.player1Id,
            player2_id: m.player2Id,
            date: startDate,
            status: "upcoming",
            bracket_round: m.bracketRound,
            bracket_position: m.bracketPosition,
          });
        }
        toast({ title: "🏆 Drabinka wygenerowana!", description: `Turniej dla ${playerIds.length} graczy.` });

      } else if (lt === "group_bracket") {
        // Group stage + bracket
        const groupCount = Math.min(numGroups, Math.floor(playerIds.length / 2));
        const { groups, matches: groupMatches } = generateGroupStage(playerIds, groupCount);
        
        for (const m of groupMatches) {
          const deadline = roundDeadlines[m.round] || startDate;
          await supabase.from("matches").insert({
            league_id: league.id,
            player1_id: m.player1Id,
            player2_id: m.player2Id,
            date: deadline,
            round: m.round,
            status: "upcoming",
            group_name: m.groupName,
          });
        }
        toast({ title: "🎪 Faza grupowa wygenerowana!", description: `${groupCount} grup, ${groupMatches.length} meczów.` });
      }

      await refreshData();
    } catch (error) {
      toast({ title: "Błąd", description: "Nie udało się wygenerować harmonogramu.", variant: "destructive" });
    }

    setGenerating(false);
    setShowGenerate(null);
    setSelectedPlayers([]);
    setSelectedRounds([]);
    setRoundDeadlines({});
  };

  const approvedPlayers = players.filter((p: any) => p.approved);

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-foreground">Ligi i Turnieje ({leagues.length})</h2>
        <Button size="sm" variant="hero" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="h-4 w-4 mr-1" /> Nowa Liga / Turniej
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6 card-glow space-y-4">
            <h3 className="font-display font-bold text-foreground">{editId ? "Edytuj" : "Nowa Liga / Turniej"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Nazwa *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Liga Główna" className="bg-muted/30 border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Sezon *</Label>
                <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Wiosna 2026" className="bg-muted/30 border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Typ rozgrywek</Label>
                <Select value={leagueType} onValueChange={(v) => setLeagueType(v as LeagueType)}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="league">🏟️ Liga (Round-Robin)</SelectItem>
                    <SelectItem value="bracket">🏆 Turniej (Drabinka)</SelectItem>
                    <SelectItem value="group_bracket">🎪 Grupy + Drabinka</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Platforma</Label>
                <Select value={leaguePlatform} onValueChange={(v) => setLeaguePlatform(v as LeaguePlatform)}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="autodarts">🎯 Autodarts</SelectItem>
                    <SelectItem value="dartcounter">📱 DartCounter</SelectItem>
                    <SelectItem value="dartsmind">🧠 DartsMind</SelectItem>
                    <SelectItem value="manual">✍️ Ręczne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BEST_OF_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Status</Label>
                <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktywna</SelectItem>
                    <SelectItem value="inactive">Zakończona / Archiwalna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Zapisy</Label>
                <Select value={registrationOpen ? "open" : "closed"} onValueChange={(v) => setRegistrationOpen(v === "open")}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">📝 Otwarte zapisy</SelectItem>
                    <SelectItem value="closed">🔒 Zamknięte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {registrationOpen && (
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Termin zamknięcia zapisów</Label>
                  <Input type="date" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className="bg-muted/30 border-border" placeholder="Opcjonalnie" />
                </div>
              )}
              {leagueType === "league" && (
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Spotkania na parę</Label>
                  <Select value={String(meetingsPerPair)} onValueChange={(v) => setMeetingsPerPair(parseInt(v))}>
                    <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x (każdy z każdym {n} {n === 1 ? "raz" : "razy"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Opis</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opis..." className="bg-muted/30 border-border" />
            </div>
            {leagueType !== "league" && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground font-body">
                {leagueType === "bracket" && "🏆 Turniej z drabinką eliminacyjną. Przegrana = odpadnięcie. Możesz wylosować kolejność graczy."}
                {leagueType === "group_bracket" && "🎪 Faza grupowa (round-robin w grupach), potem faza pucharowa (drabinka) z najlepszymi z każdej grupy."}
              </div>
            )}

            {/* Bonus points configuration */}
            <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Punkty bonusowe — wybierz aktywne zasady</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {([
                  { key: "per180", label: "🎯 Za każde 180", desc: "pkt za 180" },
                  { key: "checkout100", label: "✅ Checkout 100+", desc: "pkt za checkout 100+" },
                  { key: "checkout150", label: "💫 Checkout 150+ (extra)", desc: "dodatkowe pkt za 150+" },
                  { key: "avg90", label: "📊 Średnia 90+", desc: "pkt za średnią 90+" },
                  { key: "avg100", label: "📈 Średnia 100+ (extra)", desc: "dodatkowe pkt za 100+" },
                  { key: "closeLoss", label: "🥈 Bliska przegrana", desc: "pkt za przegraną 1 legiem" },
                  { key: "cleanSweep", label: "💪 Clean sweep", desc: "pkt za wygraną do 0" },
                ] as { key: keyof BonusRules; label: string; desc: string }[]).map(rule => {
                  const val = bonusRules[rule.key];
                  const isActive = val > 0;
                  return (
                    <div key={rule.key} className={`flex items-center justify-between rounded-lg border p-3 transition-all ${isActive ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-60"}`}>
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => {
                            setBonusRules(prev => ({
                              ...prev,
                              [rule.key]: e.target.checked ? (DEFAULT_BONUS_RULES[rule.key] || 1) : 0,
                            }));
                          }}
                          className="rounded border-border"
                        />
                        <span className="text-sm font-body text-foreground">{rule.label}</span>
                      </label>
                      {isActive && (
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={val}
                          onChange={(e) => setBonusRules(prev => ({ ...prev, [rule.key]: parseInt(e.target.value) || 0 }))}
                          className="w-16 h-8 text-center text-sm bg-muted/30 border-border font-display"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <span className="text-sm font-body text-foreground">🏆 Wygrana</span>
                  <Input type="number" min="0" max="10" value={bonusRules.win} onChange={(e) => setBonusRules(prev => ({ ...prev, win: parseInt(e.target.value) || 0 }))} className="w-16 h-8 text-center text-sm bg-muted/30 border-border font-display" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="hero">{editId ? "Zapisz" : "Utwórz"}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>Anuluj</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {leagues.map((l: any) => (
          <div key={l.id} className="rounded-lg border border-border bg-card p-5 card-glow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${l.is_active ? "bg-secondary" : "bg-muted-foreground"}`} />
                <div>
                  <div className="font-display font-bold text-foreground flex items-center gap-2">
                    {l.name}
                    <span className="text-[10px] font-display uppercase px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                      {LEAGUE_TYPE_LABELS[l.league_type as LeagueType] || "Liga"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-body">
                    {l.season} · {l.format || "Best of 5"} · {l.is_active ? "Aktywna" : "Zakończona"} {l.description && `· ${l.description}`}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {l.is_active && (
                  <Button size="sm" variant="hero" onClick={() => {
                    setShowGenerate(showGenerate === l.id ? null : l.id);
                    setSelectedPlayers([]);
                    setNumGroups(getRecommendedGroups(approvedPlayers.length));
                    setGenerateMode("all");
                    setSelectedRounds([]);
                    setRoundDeadlines({});
                  }}>
                    <Shuffle className="h-3.5 w-3.5 mr-1" /> Generuj mecze
                  </Button>
                )}
                {l.is_active ? (
                  <Button size="sm" variant="outline" onClick={() => { updateLeague(l.id, { is_active: false }); toast({ title: "Zakończona", description: l.name }); }}>Zakończ</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { updateLeague(l.id, { is_active: true }); toast({ title: "Reaktywowana", description: l.name }); }}>Reaktywuj</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => startEdit(l)}><Edit2 className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { deleteLeague(l.id); toast({ title: "Usunięta", description: l.name }); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Quick player management */}
            {l.is_active && showGenerate !== l.id && (
              <div className="border-t border-border pt-3 mt-3">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setManagePlayersLeagueId(l.id)}>
                  <Users className="h-4 w-4 mr-2" />
                  Zarządzaj graczami ({approvedPlayers.filter((p: any) => (p.leagueIds || []).includes(l.id)).length})
                </Button>
              </div>
            )}

            {/* Generate matches panel */}
            <AnimatePresence>
              {showGenerate === l.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-border pt-4 mt-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-bold text-foreground text-sm">
                      {l.league_type === "bracket" ? "🏆 Generuj drabinkę" : l.league_type === "group_bracket" ? "🎪 Generuj grupy + drabinkę" : "🎯 Generuj harmonogram round-robin"}
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDoShuffle(!doShuffle)}
                        className={`text-xs font-display uppercase px-3 py-1.5 rounded-full border transition-all ${doShuffle ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground"}`}
                      >
                        <Shuffle className="h-3 w-3 inline mr-1" /> {doShuffle ? "Losowanie ON" : "Losowanie OFF"}
                      </button>
                    </div>
                  </div>

                  {/* Show existing generated rounds */}
                  {l.league_type === "league" && (() => {
                    const existingRounds = getExistingRounds(l.id);
                    if (existingRounds.length === 0) return null;
                    return (
                      <div className="rounded-lg bg-secondary/5 border border-secondary/20 p-3 space-y-2">
                        <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Już wygenerowane kolejki</Label>
                        <div className="flex flex-wrap gap-2">
                          {existingRounds.map(r => (
                            <span key={r} className="text-xs font-display uppercase px-3 py-1.5 rounded-full bg-secondary/20 border border-secondary/30 text-secondary">
                              ✅ Kolejka {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {l.league_type === "group_bracket" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Liczba grup</Label>
                        <Input type="number" min={1} max={8} value={numGroups} onChange={e => setNumGroups(parseInt(e.target.value) || 2)} className="bg-muted/30 border-border w-32" />
                      </div>
                      {selectedPlayers.length > 0 && numGroups > 0 && (
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground font-body space-y-1">
                          <div>👥 <strong className="text-foreground">{selectedPlayers.length}</strong> graczy w <strong className="text-foreground">{numGroups}</strong> grupach</div>
                          <div>📊 ~<strong className="text-foreground">{Math.ceil(selectedPlayers.length / numGroups)}</strong> graczy na grupę</div>
                          <div>⚽ ~<strong className="text-foreground">{(() => {
                            const perGroup = Math.ceil(selectedPlayers.length / numGroups);
                            return perGroup * (perGroup - 1) / 2;
                          })()}</strong> meczów w grupie (każdy z każdym)</div>
                          <div>🏆 Po fazie grupowej — drabinka z najlepszymi z każdej grupy</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                        Wybierz graczy ({selectedPlayers.length})
                      </Label>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedPlayers(approvedPlayers.map((p: any) => p.id))} className="text-xs">
                          Zaznacz wszystkich
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedPlayers([])} className="text-xs">
                          Odznacz
                        </Button>
                      </div>
                    </div>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        placeholder="Szukaj gracza..."
                        className="bg-muted/30 border-border text-sm pl-8 h-8"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {approvedPlayers
                        .filter((p: any) => p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                        .map((p: any) => {
                        const selected = selectedPlayers.includes(p.id);
                        return (
                          <button key={p.id} type="button" onClick={() => togglePlayer(p.id)}
                            className={`text-xs font-display uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${selected ? "bg-secondary/20 border-secondary/30 text-secondary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30"}`}>
                            {selected ? <Check className="h-3 w-3 inline mr-1" /> : <Plus className="h-3 w-3 inline mr-1" />}
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Round selection for league type */}
                  {l.league_type === "league" && selectedPlayers.length >= 2 && (() => {
                    const totalRounds = getTotalRounds(selectedPlayers.length, l.meetings_per_pair ?? 1);
                    const existingRounds = getExistingRounds(l.id);
                    const allRoundNumbers = Array.from({ length: totalRounds }, (_, i) => i + 1);
                    const availableRounds = allRoundNumbers.filter(r => !existingRounds.includes(r));

                    return (
                      <div className="space-y-3">
                        <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Które kolejki wygenerować?</Label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setGenerateMode("all"); setSelectedRounds([]); }}
                            className={`text-xs font-display uppercase px-3 py-1.5 rounded-full border transition-all ${generateMode === "all" ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground"}`}>
                            Wszystkie ({availableRounds.length})
                          </button>
                          <button type="button" onClick={() => setGenerateMode("selected")}
                            className={`text-xs font-display uppercase px-3 py-1.5 rounded-full border transition-all ${generateMode === "selected" ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground"}`}>
                            Wybrane kolejki
                          </button>
                        </div>

                        {generateMode === "selected" && (
                          <div className="flex flex-wrap gap-2">
                            {availableRounds.map(r => {
                              const sel = selectedRounds.includes(r);
                              return (
                                <button key={r} type="button" onClick={() => setSelectedRounds(prev => sel ? prev.filter(x => x !== r) : [...prev, r])}
                                  className={`text-xs font-display uppercase px-3 py-1.5 rounded-full border transition-all ${sel ? "bg-accent/20 border-accent/30 text-accent" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30"}`}>
                                  {sel ? <Check className="h-3 w-3 inline mr-1" /> : <Plus className="h-3 w-3 inline mr-1" />}
                                  Kolejka {r}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {availableRounds.length === 0 && (
                          <div className="rounded-lg bg-secondary/5 border border-secondary/20 p-3 text-xs text-secondary font-body">
                            ✅ Wszystkie kolejki zostały już wygenerowane!
                          </div>
                        )}

                        {/* Deadline per round */}
                        {(() => {
                          const roundsToShow = generateMode === "all" ? availableRounds : selectedRounds;
                          if (roundsToShow.length === 0) return null;
                          return (
                            <div className="space-y-2">
                              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                                Termin rozegrania (deadline) per kolejka
                              </Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {roundsToShow.sort((a, b) => a - b).map(r => (
                                  <div key={r} className="flex items-center gap-2">
                                    <span className="text-xs font-display text-muted-foreground w-24">Kolejka {r}:</span>
                                    <Input
                                      type="date"
                                      value={roundDeadlines[r] || startDate}
                                      onChange={e => setRoundDeadlines(prev => ({ ...prev, [r]: e.target.value }))}
                                      className="bg-muted/30 border-border text-sm flex-1"
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-2">
                                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Ustaw domyślny termin dla wszystkich</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-muted/30 border-border w-48" />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Date for non-league types */}
                  {l.league_type !== "league" && (
                    <div className="space-y-2">
                      <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Termin rozegrania</Label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-muted/30 border-border w-48" />
                    </div>
                  )}

                  {selectedPlayers.length >= 2 && (
                    <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground font-body">
                      {l.league_type === "league" && (() => {
                        const matchCount = (selectedPlayers.length * (selectedPlayers.length - 1)) / 2;
                        const rounds = selectedPlayers.length % 2 === 0 ? selectedPlayers.length - 1 : selectedPlayers.length;
                        const existingRounds = getExistingRounds(l.id);
                        const availableRounds = rounds - existingRounds.length;
                        const roundsToGen = generateMode === "all" ? availableRounds : selectedRounds.length;
                        return `📊 ${selectedPlayers.length} graczy → ${matchCount} meczów w ${rounds} kolejkach (do wygenerowania: ${roundsToGen} kolejek)`;
                      })()}
                      {l.league_type === "bracket" && `🏆 ${selectedPlayers.length} graczy → drabinka eliminacyjna`}
                      {l.league_type === "group_bracket" && `🎪 ${selectedPlayers.length} graczy w ${numGroups} grupach → faza grupowa + drabinka`}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="hero" disabled={generating || selectedPlayers.length < 2 || (l.league_type === "league" && generateMode === "selected" && selectedRounds.length === 0)} onClick={() => handleGenerateSchedule(l)}>
                      {generating ? "Generowanie..." : "⚡ Generuj harmonogram"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowGenerate(null)}>Anuluj</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {leagues.length === 0 && <p className="text-muted-foreground font-body text-center py-8">Brak lig. Kliknij "Nowa Liga / Turniej" aby utworzyć pierwszą.</p>}
      </div>
      </div>

      {/* Manage players dialog */}
      <Dialog open={!!managePlayersLeagueId} onOpenChange={(open) => { if (!open) { setManagePlayersLeagueId(null); setLeaguePlayerSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              Zarządzaj graczami — {leagues.find((l: any) => l.id === managePlayersLeagueId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={leaguePlayerSearch}
              onChange={(e) => setLeaguePlayerSearch(e.target.value)}
              placeholder="Szukaj gracza..."
              className="pl-9"
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {approvedPlayers
                .filter((p: any) => !leaguePlayerSearch || p.name.toLowerCase().includes(leaguePlayerSearch.toLowerCase()))
                .map((p: any) => {
                  const isIn = (p.leagueIds || []).includes(managePlayersLeagueId);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (isIn) {
                          removePlayerFromLeague(p.id, managePlayersLeagueId!);
                          toast({ title: `${p.name} usunięty z ligi` });
                        } else {
                          assignPlayerToLeague(p.id, managePlayersLeagueId!);
                          toast({ title: `${p.name} dodany do ligi` });
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isIn ? "bg-secondary/15 text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
                    >
                      <Checkbox checked={isIn} className="pointer-events-none" />
                      <span className="font-medium">{p.name}</span>
                      {isIn && <Check className="h-3.5 w-3.5 ml-auto text-secondary" />}
                    </button>
                  );
                })}
              {approvedPlayers.filter((p: any) => !leaguePlayerSearch || p.name.toLowerCase().includes(leaguePlayerSearch.toLowerCase())).length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">Brak graczy pasujących do wyszukiwania</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── PLAYERS TAB ───
const PlayersTab = ({ players, leagues, pendingPlayers, approvePlayer, updatePlayer, deletePlayer, assignPlayerToLeague, removePlayerFromLeague, addPlayer, toast }: any) => {
  const approved = players.filter((p: any) => p.approved);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<{ user_id: string; name: string }[]>([]);
  const [playerUserMap, setPlayerUserMap] = useState<Record<string, string | null>>({});
  const [playerExtIds, setPlayerExtIds] = useState<Record<string, { autodarts_user_id: string; dartcounter_id: string; dartsmind_id: string }>>({});

  const filteredApproved = approved.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("user_id, name");
      setProfiles(data || []);
      const { data: playersWithUser } = await supabase.from("players").select("id, user_id, autodarts_user_id, dartcounter_id, dartsmind_id");
      const map: Record<string, string | null> = {};
      const extMap: Record<string, { autodarts_user_id: string; dartcounter_id: string; dartsmind_id: string }> = {};
      (playersWithUser || []).forEach((p: any) => {
        map[p.id] = p.user_id;
        extMap[p.id] = { autodarts_user_id: p.autodarts_user_id || "", dartcounter_id: p.dartcounter_id || "", dartsmind_id: p.dartsmind_id || "" };
      });
      setPlayerUserMap(map);
      setPlayerExtIds(extMap);
    };
    fetchProfiles();
  }, [players]);

  const linkUserToPlayer = async (playerId: string, userId: string | null) => {
    await supabase.from("players").update({ user_id: userId }).eq("id", playerId);
    setPlayerUserMap(prev => ({ ...prev, [playerId]: userId }));
    toast({ title: userId ? "Konto powiązane!" : "Powiązanie usunięte" });
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setAdding(true);
    const result = await addPlayer(newPlayerName.trim());
    setAdding(false);
    if (result?.error) {
      toast({ title: "Błąd", description: "Nie udało się dodać gracza.", variant: "destructive" });
    } else {
      toast({ title: "Gracz dodany!", description: `${newPlayerName} został dodany.` });
      setNewPlayerName("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 card-glow">
        <h3 className="font-display font-bold text-foreground mb-3">Dodaj nowego gracza</h3>
        <form onSubmit={handleAddPlayer} className="flex gap-3">
          <Input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Imię i nazwisko" className="bg-muted/30 border-border flex-1" required />
          <Button type="submit" variant="hero" disabled={adding}>
            <UserPlus className="h-4 w-4 mr-1" /> {adding ? "Dodawanie..." : "Dodaj"}
          </Button>
        </form>
      </div>

      {pendingPlayers.length > 0 && (
        <section className="rounded-lg border border-accent/30 bg-accent/5 p-5">
          <h3 className="font-display font-bold text-foreground mb-3">Oczekujący ({pendingPlayers.length})</h3>
          <div className="space-y-2">
            {pendingPlayers.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-card rounded-lg border border-border p-3">
                <span className="font-body text-sm text-foreground">{p.name}</span>
                <Button size="sm" onClick={() => { approvePlayer(p.id); toast({ title: "Zatwierdzono!", description: p.name }); }}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Zatwierdź
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-foreground">Zatwierdzeni gracze ({approved.length})</h2>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj gracza..."
          className="bg-muted/30 border-border pl-9"
        />
      </div>
      <div className="space-y-3">
        {filteredApproved.map((p: any) => (
          <div key={p.id} className="rounded-lg border border-border bg-card p-5 card-glow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary">{p.avatar}</div>
                <span className="font-body font-medium text-foreground">{p.name}</span>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { deletePlayer(p.id); toast({ title: "Gracz usunięty", description: p.name }); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {/* Link user account */}
            <div className="mb-3">
              <Label className="text-xs text-muted-foreground font-body mb-1 block">Powiązane konto użytkownika</Label>
              <select
                value={playerUserMap[p.id] || ""}
                onChange={(e) => linkUserToPlayer(p.id, e.target.value || null)}
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-body text-foreground"
              >
                <option value="">— brak powiązania —</option>
                {profiles.map((pr: any) => (
                  <option key={pr.user_id} value={pr.user_id}>{pr.name} ({pr.user_id.slice(0, 8)}...)</option>
                ))}
              </select>
            </div>
            {/* Platform IDs */}
            <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground font-body mb-1 block">🎯 Autodarts ID</Label>
                <Input
                  value={playerExtIds[p.id]?.autodarts_user_id || ""}
                  onChange={(e) => setPlayerExtIds(prev => ({ ...prev, [p.id]: { ...prev[p.id], autodarts_user_id: e.target.value } }))}
                  placeholder="Autodarts User ID"
                  className="bg-muted/30 border-border text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-body mb-1 block">📱 DartCounter</Label>
                <Input
                  value={playerExtIds[p.id]?.dartcounter_id || ""}
                  onChange={(e) => setPlayerExtIds(prev => ({ ...prev, [p.id]: { ...prev[p.id], dartcounter_id: e.target.value } }))}
                  placeholder="Nick DartCounter"
                  className="bg-muted/30 border-border text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-body mb-1 block">🧠 DartsMind</Label>
                <Input
                  value={playerExtIds[p.id]?.dartsmind_id || ""}
                  onChange={(e) => setPlayerExtIds(prev => ({ ...prev, [p.id]: { ...prev[p.id], dartsmind_id: e.target.value } }))}
                  placeholder="Nick DartsMind"
                  className="bg-muted/30 border-border text-xs h-8"
                />
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={async () => {
                  const ids = playerExtIds[p.id];
                  if (!ids) return;
                  const { error } = await supabase.from("players").update({
                    autodarts_user_id: ids.autodarts_user_id.trim() || null,
                    dartcounter_id: ids.dartcounter_id.trim() || null,
                    dartsmind_id: ids.dartsmind_id.trim() || null,
                  } as any).eq("id", p.id);
                  if (error) {
                    toast({ title: "Błąd zapisu", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "✅ ID zapisane!", description: `Zaktualizowano ID platform dla ${p.name}` });
                  }
                }}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Zapisz ID
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {leagues.map((l: any) => {
                const isIn = (p.leagueIds || []).includes(l.id);
                return (
                  <button key={l.id} onClick={() => {
                    if (isIn) { removePlayerFromLeague(p.id, l.id); toast({ title: `${p.name} usunięty z ${l.name}` }); }
                    else { assignPlayerToLeague(p.id, l.id); toast({ title: `${p.name} dodany do ${l.name}` }); }
                  }} className={`text-xs font-display uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${isIn ? "bg-secondary/20 border-secondary/30 text-secondary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30"}`}>
                    {isIn ? <Check className="h-3 w-3 inline mr-1" /> : <Plus className="h-3 w-3 inline mr-1" />}
                    {l.name}
                  </button>
                );
              })}
              {leagues.length === 0 && <span className="text-xs text-muted-foreground">Brak lig — utwórz ligę aby przypisać graczy</span>}
            </div>
          </div>
        ))}
        {filteredApproved.length === 0 && searchQuery && <p className="text-muted-foreground font-body text-center py-8">Brak wyników dla „{searchQuery}"</p>}
        {approved.length === 0 && !searchQuery && <p className="text-muted-foreground font-body text-center py-8">Brak graczy. Dodaj nowego gracza powyżej.</p>}
      </div>
    </div>
  );
};

// ─── MATCHES TAB ───
const MatchesTab = ({ matches, players, leagues, addMatch, deleteMatch, toast }: any) => {
  const { updateMatchResult, approveMatch, rejectMatch, refreshData } = useLeague();
  const [walkoverDialog, setWalkoverDialog] = useState<{ matchId: string; p1Name: string; p2Name: string; p1Id: string; p2Id: string; leagueId: string } | null>(null);
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]?.id || "");
  const [newMatchP1, setNewMatchP1] = useState("");
  const [newMatchP2, setNewMatchP2] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [newMatchRound, setNewMatchRound] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore1, setEditScore1] = useState("");
  const [editScore2, setEditScore2] = useState("");
  const [editStats, setEditStats] = useState<Record<string, string>>({});

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchP1 || !newMatchP2 || !newMatchDate || !selectedLeague) {
      toast({ title: "Błąd", description: "Wypełnij wszystkie pola.", variant: "destructive" }); return;
    }
    if (newMatchP1 === newMatchP2) {
      toast({ title: "Błąd", description: "Gracz nie może grać sam ze sobą.", variant: "destructive" }); return;
    }
    await addMatch(selectedLeague, newMatchP1, newMatchP2, newMatchDate, newMatchRound ? parseInt(newMatchRound) : undefined);
    toast({ title: "Mecz dodany!", description: "Nowy mecz został zaplanowany." });
    setNewMatchP1(""); setNewMatchP2(""); setNewMatchDate(""); setNewMatchRound("");
  };

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setEditScore1(String(m.score1 ?? ""));
    setEditScore2(String(m.score2 ?? ""));
    setEditStats({
      avg1: String(m.avg1 ?? ""), avg2: String(m.avg2 ?? ""),
      first9Avg1: String(m.first9Avg1 ?? ""), first9Avg2: String(m.first9Avg2 ?? ""),
      
      oneEighties1: String(m.oneEighties1 ?? ""), oneEighties2: String(m.oneEighties2 ?? ""),
      hc1: String(m.highCheckout1 ?? ""), hc2: String(m.highCheckout2 ?? ""),
      ton60_1: String(m.ton60_1 ?? ""), ton60_2: String(m.ton60_2 ?? ""),
      ton80_1: String(m.ton80_1 ?? ""), ton80_2: String(m.ton80_2 ?? ""),
      tonPlus1: String(m.tonPlus1 ?? ""), tonPlus2: String(m.tonPlus2 ?? ""),
      darts1: String(m.dartsThrown1 ?? ""), darts2: String(m.dartsThrown2 ?? ""),
      checkoutAttempts1: String(m.checkoutAttempts1 ?? ""), checkoutAttempts2: String(m.checkoutAttempts2 ?? ""),
      checkoutHits1: String(m.checkoutHits1 ?? ""), checkoutHits2: String(m.checkoutHits2 ?? ""),
    });
  };

  const saveEdit = async (m: any) => {
    const s1 = parseInt(editScore1) || 0;
    const s2 = parseInt(editScore2) || 0;
    await updateMatchResult(m.id, {
      score1: s1, score2: s2,
      avg1: parseFloat(editStats.avg1) || undefined,
      avg2: parseFloat(editStats.avg2) || undefined,
      oneEighties1: parseInt(editStats.oneEighties1) || 0,
      oneEighties2: parseInt(editStats.oneEighties2) || 0,
      highCheckout1: parseInt(editStats.hc1) || 0,
      highCheckout2: parseInt(editStats.hc2) || 0,
      ton60_1: parseInt(editStats.ton60_1) || 0,
      ton60_2: parseInt(editStats.ton60_2) || 0,
      ton80_1: parseInt(editStats.ton80_1) || 0,
      ton80_2: parseInt(editStats.ton80_2) || 0,
      tonPlus1: parseInt(editStats.tonPlus1) || 0,
      tonPlus2: parseInt(editStats.tonPlus2) || 0,
      dartsThrown1: parseInt(editStats.darts1) || 0,
      dartsThrown2: parseInt(editStats.darts2) || 0,
      checkoutAttempts1: parseInt(editStats.checkoutAttempts1) || 0,
      checkoutAttempts2: parseInt(editStats.checkoutAttempts2) || 0,
      checkoutHits1: parseInt(editStats.checkoutHits1) || 0,
      checkoutHits2: parseInt(editStats.checkoutHits2) || 0,
      first9Avg1: parseFloat(editStats.first9Avg1) || undefined,
      first9Avg2: parseFloat(editStats.first9Avg2) || undefined,
      autodartsLink: m.autodartsLink,
    });
    setEditingId(null);
    toast({ title: "✏️ Wynik zaktualizowany!", description: `${m.player1Name} vs ${m.player2Name}` });
  };

  const handleSetCompleted = async (m: any) => {
    // If match has scores, mark as completed directly
    if (m.score1 != null && m.score2 != null) {
      await approveMatch(m.id);
      toast({ title: "✅ Mecz oznaczony jako rozegrany!", description: `${m.player1Name} vs ${m.player2Name}` });
    } else {
      // Open edit first so admin can enter scores
      startEdit(m);
      toast({ title: "Wprowadź wynik", description: "Uzupełnij wynik i statystyki, a potem zapisz.", variant: "default" });
    }
  };

  const handleResetMatch = async (matchId: string) => {
    await rejectMatch(matchId);
    toast({ title: "🔄 Mecz zresetowany", description: "Status zmieniony na 'zaplanowany', statystyki wyczyszczone." });
  };

  const handleWalkover = async (matchId: string, winnerId: string, loserId: string, leagueId: string) => {
    // Find league max_legs for walkover score
    const league = leagues.find((l: any) => l.id === leagueId);
    const maxLegs = league?.max_legs || 5;
    const winScore = maxLegs; // Walkover: pełny wynik formatu (Best of 5 = 5:0)

    const match = matches.find((m: any) => m.id === matchId);
    if (!match) return;

    const isP1Winner = match.player1Id === winnerId;
    const s1 = isP1Winner ? winScore : 0;
    const s2 = isP1Winner ? 0 : winScore;

    await supabase.from("matches").update({
      score1: s1, score2: s2, legs_won1: s1, legs_won2: s2,
      status: "completed", is_walkover: true,
    } as any).eq("id", matchId);

    // Audit
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("match_audit_log").insert({
        match_id: matchId, user_id: user.id, action: "walkover",
        old_data: { status: match.status },
        new_data: { status: "completed", is_walkover: true, score1: s1, score2: s2 },
      });
    }

    // Discord webhook
    await supabase.functions.invoke("discord-webhook", {
      body: { action: "send_match_result", match_data: { match_id: matchId } },
    }).catch(() => {});

    setWalkoverDialog(null);
    refreshData();
    toast({ title: "⚠️ Walkower zapisany!", description: `Wygrywa ${isP1Winner ? match.player1Name : match.player2Name} ${s1}:${s2}` });
  };

  const handleDisqualify = async (playerId: string, leagueId: string, playerName: string) => {
    if (!confirm(`Czy na pewno chcesz zdyskwalifikować ${playerName}? Wszystkie nadchodzące mecze zostaną przegrane walkowerem.`)) return;

    // Mark player as disqualified in player_leagues
    await supabase.from("player_leagues").update({ disqualified: true, disqualified_at: new Date().toISOString() } as any)
      .eq("player_id", playerId).eq("league_id", leagueId);

    // Find all upcoming matches for this player in this league
    const upcomingMatches = matches.filter((m: any) => m.leagueId === leagueId && m.status === "upcoming" && (m.player1Id === playerId || m.player2Id === playerId));

    const league = leagues.find((l: any) => l.id === leagueId);
    const maxLegs = league?.max_legs || 5;
    const winScore = maxLegs; // Dyskwalifikacja: pełny wynik formatu

    for (const m of upcomingMatches) {
      const isP1Disqualified = m.player1Id === playerId;
      const s1 = isP1Disqualified ? 0 : winScore;
      const s2 = isP1Disqualified ? winScore : 0;

      await supabase.from("matches").update({
        score1: s1, score2: s2, legs_won1: s1, legs_won2: s2,
        status: "completed", is_walkover: true,
      } as any).eq("id", m.id);
    }

    // Audit
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("match_audit_log").insert({
        match_id: upcomingMatches[0]?.id || "00000000-0000-0000-0000-000000000000",
        user_id: user.id,
        action: "disqualify",
        old_data: null,
        new_data: { player_id: playerId, league_id: leagueId, matches_affected: upcomingMatches.length },
      });
    }

    // Discord webhooks for all disqualified matches
    for (const m of upcomingMatches) {
      await supabase.functions.invoke("discord-webhook", {
        body: { action: "send_match_result", match_data: { match_id: m.id } },
      }).catch(() => {});
    }

    refreshData();
    toast({ title: "🚫 Gracz zdyskwalifikowany!", description: `${playerName} — ${upcomingMatches.length} meczów przegranych walkowerem.` });
  };

  const handleCompleteWithStats = async (m: any) => {
    const s1 = parseInt(editScore1) || 0;
    const s2 = parseInt(editScore2) || 0;
    await updateMatchResult(m.id, {
      score1: s1, score2: s2,
      avg1: parseFloat(editStats.avg1) || undefined,
      avg2: parseFloat(editStats.avg2) || undefined,
      oneEighties1: parseInt(editStats.oneEighties1) || 0,
      oneEighties2: parseInt(editStats.oneEighties2) || 0,
      highCheckout1: parseInt(editStats.hc1) || 0,
      highCheckout2: parseInt(editStats.hc2) || 0,
      ton60_1: parseInt(editStats.ton60_1) || 0,
      ton60_2: parseInt(editStats.ton60_2) || 0,
      ton80_1: parseInt(editStats.ton80_1) || 0,
      ton80_2: parseInt(editStats.ton80_2) || 0,
      tonPlus1: parseInt(editStats.tonPlus1) || 0,
      tonPlus2: parseInt(editStats.tonPlus2) || 0,
      dartsThrown1: parseInt(editStats.darts1) || 0,
      dartsThrown2: parseInt(editStats.darts2) || 0,
      checkoutAttempts1: parseInt(editStats.checkoutAttempts1) || 0,
      checkoutAttempts2: parseInt(editStats.checkoutAttempts2) || 0,
      checkoutHits1: parseInt(editStats.checkoutHits1) || 0,
      checkoutHits2: parseInt(editStats.checkoutHits2) || 0,
      first9Avg1: parseFloat(editStats.first9Avg1) || undefined,
      first9Avg2: parseFloat(editStats.first9Avg2) || undefined,
      autodartsLink: m.autodartsLink,
    });
    await approveMatch(m.id);
    setEditingId(null);
    toast({ title: "✅ Wynik zapisany i mecz zatwierdzony!", description: `${m.player1Name} ${s1}:${s2} ${m.player2Name}` });
  };

  const approvedPlayers = players.filter((p: any) => p.approved);
  const leagueMatches = selectedLeague ? matches.filter((m: any) => m.leagueId === selectedLeague) : matches;

  const groupedByBracket = leagueMatches.reduce((acc: any, m: any) => {
    const key = m.bracketRound || m.groupName || (m.round ? `Kolejka ${m.round}` : "Inne");
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, any[]>);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    completed: { label: "✅ Rozegrany", color: "text-secondary" },
    pending_approval: { label: "⏳ Do zatwierdzenia", color: "text-accent" },
    upcoming: { label: "📅 Zaplanowany", color: "text-muted-foreground" },
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 card-glow space-y-4">
        <h3 className="font-display font-bold text-foreground">Dodaj mecz ręcznie</h3>
        <form onSubmit={handleAddMatch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Liga</Label>
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz ligę" /></SelectTrigger>
                <SelectContent>
                  {leagues.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={newMatchDate} onChange={(e) => setNewMatchDate(e.target.value)} className="bg-muted/30 border-border" required />
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 1</Label>
              <Select value={newMatchP1} onValueChange={setNewMatchP1}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz" /></SelectTrigger>
                <SelectContent>
                  {approvedPlayers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Gracz 2</Label>
              <Select value={newMatchP2} onValueChange={setNewMatchP2}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz" /></SelectTrigger>
                <SelectContent>
                  {approvedPlayers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Kolejka (opcjonalne)</Label>
            <Input type="number" min="1" value={newMatchRound} onChange={(e) => setNewMatchRound(e.target.value)} className="bg-muted/30 border-border w-32" />
          </div>
          <Button type="submit" variant="hero"><Plus className="h-4 w-4 mr-1" /> Dodaj mecz</Button>
        </form>
      </div>

      {leagues.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {leagues.map((l: any) => (
            <Button key={l.id} variant={selectedLeague === l.id ? "default" : "outline"} size="sm" onClick={() => setSelectedLeague(l.id)} className="text-xs font-display uppercase">
              {l.name}
            </Button>
          ))}
        </div>
      )}

      {Object.keys(groupedByBracket).length > 0 ? (
        Object.entries(groupedByBracket).map(([key, groupMatches]: [string, any]) => (
          <div key={key} className="space-y-2">
            <h3 className="text-sm font-display font-bold text-primary uppercase tracking-wider">{key}</h3>
            {groupMatches.map((m: any) => {
              const statusInfo = STATUS_LABELS[m.status] || STATUS_LABELS.upcoming;
              const isEditing = editingId === m.id;

              return (
                <div key={m.id} className="rounded-lg border border-border bg-card p-4 card-glow">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-bold text-foreground text-sm">
                          ✏️ Edytuj: {m.player1Name} vs {m.player2Name}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="text-xs">Anuluj</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground font-body mb-1 block">{m.player1Name} — Legi</Label>
                          <Input type="number" min="0" value={editScore1} onChange={e => setEditScore1(e.target.value)} className="bg-muted/30 border-border text-center font-display text-lg" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground font-body mb-1 block">{m.player2Name} — Legi</Label>
                          <Input type="number" min="0" value={editScore2} onChange={e => setEditScore2(e.target.value)} className="bg-muted/30 border-border text-center font-display text-lg" />
                        </div>
                      </div>
                      <MatchStatFields stats={editStats} setStats={setEditStats} p1={m.player1Name} p2={m.player2Name} />
                      <div className="flex gap-3 flex-wrap">
                        <Button variant="default" size="sm" className="flex-1" onClick={() => saveEdit(m)}>
                          <Check className="h-4 w-4 mr-1" /> Zapisz zmiany
                        </Button>
                        {m.status !== "completed" && (
                          <Button variant="hero" size="sm" className="flex-1" onClick={() => handleCompleteWithStats(m)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Zapisz i zatwierdź
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-sm text-foreground">{m.player1Name} vs {m.player2Name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(m.date).toLocaleDateString("pl-PL")}
                          {m.score1 != null && m.score2 != null && (
                            <span className="ml-1 font-display font-bold"> · {m.score1}:{m.score2}</span>
                          )}
                          {m.avg1 != null && <span> · Śr. {Number(m.avg1).toFixed(1)}/{Number(m.avg2).toFixed(1)}</span>}
                          {(m.oneEighties1 > 0 || m.oneEighties2 > 0) && <span> · 180: {m.oneEighties1 ?? 0}/{m.oneEighties2 ?? 0}</span>}
                        </div>
                        <span className={`text-[10px] font-display uppercase ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(m)} title="Edytuj wynik i statystyki">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {m.status === "upcoming" && (
                          <>
                            <Button size="sm" variant="ghost" className="text-secondary hover:text-secondary" onClick={() => handleSetCompleted(m)} title="Oznacz jako rozegrany">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-accent hover:text-accent" onClick={() => setWalkoverDialog({ matchId: m.id, p1Name: m.player1Name, p2Name: m.player2Name, p1Id: m.player1Id, p2Id: m.player2Id, leagueId: m.leagueId })} title="Walkower">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {m.status === "pending_approval" && (
                          <Button size="sm" variant="ghost" className="text-secondary hover:text-secondary" onClick={() => { approveMatch(m.id); toast({ title: "✅ Mecz zatwierdzony!" }); }} title="Zatwierdź">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {(m.status === "completed" || m.status === "pending_approval") && (
                          <Button size="sm" variant="ghost" className="text-accent hover:text-accent" onClick={() => handleResetMatch(m.id)} title="Resetuj mecz (cofnij do zaplanowanego)">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { deleteMatch(m.id); toast({ title: "Mecz usunięty" }); }} title="Usuń mecz">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      ) : (
        <p className="text-muted-foreground font-body text-center py-4">Brak meczów w tej lidze.</p>
      )}

      {/* Walkover dialog */}
      {walkoverDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setWalkoverDialog(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-bold text-foreground flex items-center gap-2">
              <Ban className="h-5 w-5 text-accent" /> Walkower
            </h3>
            <p className="text-sm text-muted-foreground font-body">Wybierz kto wygrywa walkowerem:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => handleWalkover(walkoverDialog.matchId, walkoverDialog.p1Id, walkoverDialog.p2Id, walkoverDialog.leagueId)}>
                <span className="font-display font-bold text-foreground">{walkoverDialog.p1Name}</span>
                <span className="text-xs text-secondary">Wygrywa</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => handleWalkover(walkoverDialog.matchId, walkoverDialog.p2Id, walkoverDialog.p1Id, walkoverDialog.leagueId)}>
                <span className="font-display font-bold text-foreground">{walkoverDialog.p2Name}</span>
                <span className="text-xs text-secondary">Wygrywa</span>
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setWalkoverDialog(null)}>Anuluj</Button>
          </div>
        </div>
      )}

      {/* Disqualification section */}
      {selectedLeague && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 card-glow">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Dyskwalifikacja gracza
          </h3>
          <p className="text-xs text-muted-foreground font-body mb-3">
            Dyskwalifikacja oznacza przegranie wszystkich pozostałych meczów walkowerem. Gracz nie może dalej grać w tej lidze.
          </p>
          <div className="flex flex-wrap gap-2">
            {players.filter((p: any) => p.approved).map((p: any) => (
              <Button
                key={p.id}
                variant="outline"
                size="sm"
                className="text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleDisqualify(p.id, selectedLeague, p.name)}
              >
                <Ban className="h-3 w-3 mr-1" /> {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ROLES TAB ───
const RolesTab = ({ toast }: any) => {
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("moderator");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadRoles();
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").order("name");
    if (data) setProfiles(data);
  };

  const loadRoles = async () => {
    setLoadingRoles(true);
    const { data } = await supabase.from("user_roles").select("*");
    if (data) {
      const enriched = await Promise.all(data.map(async (r: any) => {
        const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", r.user_id).maybeSingle();
        return { ...r, name: profile?.name || "Nieznany" };
      }));
      setRolesList(enriched);
    }
    setLoadingRoles(false);
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRole) {
      toast({ title: "Błąd", description: "Wybierz użytkownika i rolę.", variant: "destructive" });
      return;
    }
    // Check if role already exists
    const exists = rolesList.find(r => r.user_id === selectedUserId && r.role === selectedRole);
    if (exists) {
      toast({ title: "Błąd", description: "Ten użytkownik ma już tę rolę.", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: selectedUserId, role: selectedRole as "admin" | "moderator" | "user" });
    if (error) {
      toast({ title: "Błąd", description: "Nie udało się dodać roli. Sprawdź uprawnienia.", variant: "destructive" });
    } else {
      toast({ title: "✅ Rola dodana!", description: `Przypisano rolę ${selectedRole}.` });
      setSelectedUserId("");
      setSelectedRole("moderator");
      await loadRoles();
    }
    setAdding(false);
  };

  const handleDeleteRole = async (roleId: string) => {
    await supabase.from("user_roles").delete().eq("id", roleId);
    setRolesList(prev => prev.filter(r => r.id !== roleId));
    toast({ title: "Rola usunięta" });
  };

  // Filter out profiles that already have all roles
  const availableProfiles = profiles.filter(p => {
    const userRoles = rolesList.filter(r => r.user_id === p.user_id);
    return userRoles.length < 3; // admin, moderator, user
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold text-foreground">Zarządzanie rolami</h2>

      {/* Add role form */}
      <div className="rounded-lg border border-border bg-card p-5 card-glow">
        <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> Przypisz rolę użytkownikowi
        </h3>
        <form onSubmit={handleAddRole} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Użytkownik</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz użytkownika" /></SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((p: any) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Rola</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">🛡️ Admin</SelectItem>
                  <SelectItem value="moderator">⚡ Moderator</SelectItem>
                  <SelectItem value="user">👤 Gracz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="hero" disabled={adding} className="w-full">
                <Award className="h-4 w-4 mr-1" /> {adding ? "Dodawanie..." : "Przypisz rolę"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Current roles */}
      <div className="rounded-lg border border-border bg-card p-5 card-glow">
        <h3 className="font-display font-bold text-foreground mb-3">Obecne role</h3>
        {loadingRoles ? (
          <p className="text-muted-foreground font-body text-sm">Ładowanie...</p>
        ) : rolesList.length === 0 ? (
          <p className="text-muted-foreground font-body text-sm">Brak przypisanych ról.</p>
        ) : (
          <div className="space-y-2">
            {rolesList.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-display uppercase px-2 py-1 rounded-full border ${
                    r.role === "admin" ? "bg-primary/20 border-primary/30 text-primary" : 
                    r.role === "moderator" ? "bg-accent/20 border-accent/30 text-accent" :
                    "bg-secondary/20 border-secondary/30 text-secondary"
                  }`}>
                    {r.role}
                  </span>
                  <span className="font-body text-sm text-foreground">{r.name}</span>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteRole(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-border bg-card p-5 card-glow">
        <h3 className="font-display font-bold text-foreground mb-3">Legenda ról</h3>
        <div className="space-y-2 text-sm font-body text-muted-foreground">
          <div><span className="text-primary font-semibold">Admin</span> — Pełna kontrola: zarządzanie ligami, graczami, meczami, rolami</div>
          <div><span className="text-accent font-semibold">Moderator</span> — Może zatwierdzać/odrzucać wyniki meczów zgłoszone przez graczy</div>
          <div><span className="text-secondary font-semibold">Gracz</span> — Może zgłaszać wyniki swoich meczów</div>
        </div>
      </div>
      </div>
    </div>
  );
};

const SummaryBox = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
  <div className="rounded-lg border border-border bg-card p-4 card-glow text-center">
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-2xl font-display font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground uppercase tracking-wider font-display">{label}</div>
  </div>
);

export default AdminPage;
