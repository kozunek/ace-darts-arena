import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Megaphone, Pin, Trash2, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  author_name?: string;
}

const AnnouncementsPage = () => {
  const { user, isAdmin, isModerator } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canPost = isAdmin || isModerator;

  useEffect(() => {
    if (user) loadAnnouncements();
  }, [user]);

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) {
      // Get author names
      const authorIds = [...new Set(data.map((a) => a.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", authorIds);

      const enriched = data.map((a) => ({
        ...a,
        author_name: profiles?.find((p) => p.user_id === a.author_id)?.name || "Admin",
      }));
      setAnnouncements(enriched);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("announcements").insert({
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Błąd", description: "Nie udało się dodać ogłoszenia.", variant: "destructive" });
    } else {
      toast({ title: "Ogłoszenie dodane!" });
      setTitle("");
      setContent("");
      setShowForm(false);
      loadAnnouncements();
    }
  };

  const togglePin = async (id: string, currentPinned: boolean) => {
    await supabase.from("announcements").update({ pinned: !currentPinned }).eq("id", id);
    loadAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    loadAnnouncements();
    toast({ title: "Ogłoszenie usunięte" });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane logowanie</h1>
        <p className="text-muted-foreground font-body mb-4">Zaloguj się, aby widzieć ogłoszenia.</p>
        <Link to="/login"><Button variant="hero">Zaloguj się</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" /> Ogłoszenia
        </h1>
        {canPost && (
          <Button variant="hero" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> Nowe ogłoszenie
          </Button>
        )}
      </div>

      {showForm && canPost && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5 card-glow space-y-4">
          <div className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Tytuł</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tytuł ogłoszenia" className="bg-muted/30 border-border" maxLength={200} required />
          </div>
          <div className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Treść</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Treść ogłoszenia..." className="bg-muted/30 border-border min-h-[100px]" maxLength={2000} required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="hero" disabled={submitting}>
              {submitting ? "Dodawanie..." : "Opublikuj"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Anuluj</Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/20 p-8 text-center">
            <p className="text-muted-foreground font-body">Brak ogłoszeń.</p>
          </div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className={`rounded-lg border bg-card p-5 ${a.pinned ? "border-primary/40 card-glow" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {a.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                    <h3 className="font-display font-bold text-foreground">{a.title}</h3>
                  </div>
                  <p className="text-sm text-foreground font-body whitespace-pre-wrap mb-3">{a.content}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                    <span>{a.author_name}</span>
                    <span>•</span>
                    <span>{format(new Date(a.created_at), "d MMMM yyyy, HH:mm", { locale: pl })}</span>
                  </div>
                </div>
                {canPost && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => togglePin(a.id, a.pinned)} title={a.pinned ? "Odepnij" : "Przypnij"}>
                      <Pin className={`h-4 w-4 ${a.pinned ? "text-primary" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
