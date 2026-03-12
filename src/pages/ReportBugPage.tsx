import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bug, Send, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";

const ReportBugPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane logowanie</h1>
        <p className="text-muted-foreground font-body mb-4">Zaloguj się, aby zgłosić błąd.</p>
        <Link to="/login"><Button variant="hero">Zaloguj się</Button></Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSending(true);
    const { error } = await supabase.from("bug_reports" as any).insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Błąd", description: "Nie udało się wysłać zgłoszenia.", variant: "destructive" });
    } else {
      setSent(true);
      setTitle("");
      setDescription("");
      toast({ title: "Zgłoszenie wysłane ✅", description: "Dziękujemy za zgłoszenie!" });
    }
  };

  if (sent) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <CheckCircle2 className="h-12 w-12 text-secondary mx-auto mb-4" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Dziękujemy!</h1>
        <p className="text-muted-foreground font-body mb-4">Twoje zgłoszenie zostało wysłane. Administrator przejrzy je wkrótce.</p>
        <Button variant="outline" onClick={() => setSent(false)}>Zgłoś kolejny błąd</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Zgłoś błąd" subtitle="Opisz problem, a administrator go rozwiąże" />
      <div className="container mx-auto px-4 py-6 max-w-lg">

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Tytuł</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Krótki opis problemu..."
            className="bg-muted/30 border-border mt-1"
            maxLength={200}
            required
          />
        </div>
        <div>
          <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Opis</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opisz szczegółowo co się dzieje, kiedy problem występuje, jakie kroki prowadzą do błędu..."
            className="bg-muted/30 border-border mt-1 min-h-[120px]"
            maxLength={2000}
            required
          />
        </div>
        <Button type="submit" variant="hero" className="w-full" disabled={sending || !title.trim() || !description.trim()}>
          <Send className="h-4 w-4 mr-2" />
          {sending ? "Wysyłanie..." : "Wyślij zgłoszenie"}
        </Button>
      </form>
    </div>
    </div>
  );
};

export default ReportBugPage;
