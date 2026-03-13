import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague } from "@/contexts/LeagueContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LeagueRule {
  id: string;
  title: string;
  content: string;
  league_id: string | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

const RulesPage = () => {
  const { isAdmin } = useAuth();
  const { leagues } = useLeague();
  const [rules, setRules] = useState<LeagueRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<LeagueRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [leagueId, setLeagueId] = useState<string>("global");
  const [isGlobal, setIsGlobal] = useState(true);

  const fetchRules = async () => {
    const { data } = await supabase
      .from("league_rules" as any)
      .select("*")
      .order("is_global", { ascending: false })
      .order("created_at", { ascending: false });
    setRules((data as unknown as LeagueRule[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setLeagueId("global");
    setIsGlobal(true);
    setEditingRule(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (rule: LeagueRule) => {
    setEditingRule(rule);
    setTitle(rule.title);
    setContent(rule.content);
    setIsGlobal(rule.is_global);
    setLeagueId(rule.is_global ? "global" : (rule.league_id ?? "global"));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Błąd", description: "Tytuł jest wymagany", variant: "destructive" });
      return;
    }

    const isGlobalVal = leagueId === "global";
    const payload = {
      title: title.trim(),
      content: content.trim(),
      league_id: isGlobalVal ? null : leagueId,
      is_global: isGlobalVal,
      updated_at: new Date().toISOString(),
    };

    if (editingRule) {
      const { error } = await supabase.from("league_rules" as any).update(payload).eq("id", editingRule.id);
      if (error) {
        toast({ title: "Błąd", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Zaktualizowano regulamin" });
    } else {
      const { error } = await supabase.from("league_rules" as any).insert(payload);
      if (error) {
        toast({ title: "Błąd", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Dodano regulamin" });
    }

    setDialogOpen(false);
    resetForm();
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten regulamin?")) return;
    await supabase.from("league_rules" as any).delete().eq("id", id);
    toast({ title: "Usunięto regulamin" });
    fetchRules();
  };

  const getLeagueName = (lid: string | null) => {
    if (!lid) return null;
    return leagues.find(l => l.id === lid)?.name ?? "Nieznana liga";
  };

  const globalRules = rules.filter(r => r.is_global);
  const leagueRules = rules.filter(r => !r.is_global);

  return (
    <div>
      <PageHeader title="Regulamin rozgrywek" subtitle="Zasady i regulaminy lig" />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {isAdmin && (
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={openCreate} variant="default">
                  <Plus className="h-4 w-4 mr-1" /> Dodaj regulamin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRule ? "Edytuj regulamin" : "Nowy regulamin"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tytuł</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nazwa regulaminu" />
                  </div>
                  <div>
                    <Label>Przypisanie</Label>
                    <Select value={leagueId} onValueChange={setLeagueId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">🌐 Ogólny (platforma)</SelectItem>
                        {leagues.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name} — {l.season}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Treść regulaminu</Label>
                    <Textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Wpisz treść regulaminu..."
                      className="min-h-[300px] font-body text-sm"
                    />
                  </div>
                  <Button onClick={handleSave} className="w-full">
                    {editingRule ? "Zapisz zmiany" : "Dodaj regulamin"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Ładowanie...</p>
        ) : rules.length === 0 ? (
          <p className="text-muted-foreground">Brak regulaminów.</p>
        ) : (
          <>
            {globalRules.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" /> Regulaminy ogólne
                </h2>
                {globalRules.map(rule => (
                  <RuleCard key={rule.id} rule={rule} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {leagueRules.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" /> Regulaminy lig
                </h2>
                {leagueRules.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    isAdmin={isAdmin}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    leagueName={getLeagueName(rule.league_id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const RuleCard = ({
  rule,
  isAdmin,
  onEdit,
  onDelete,
  leagueName,
}: {
  rule: LeagueRule;
  isAdmin: boolean;
  onEdit: (r: LeagueRule) => void;
  onDelete: (id: string) => void;
  leagueName?: string | null;
}) => (
  <Card className="card-glow">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-display">{rule.title}</CardTitle>
          {leagueName && (
            <p className="text-xs text-muted-foreground mt-1">Liga: {leagueName}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(rule)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(rule.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </CardHeader>
    <CardContent>
      <div className="whitespace-pre-wrap text-sm font-body text-muted-foreground leading-relaxed">
        {rule.content || "Brak treści."}
      </div>
    </CardContent>
  </Card>
);

export default RulesPage;
