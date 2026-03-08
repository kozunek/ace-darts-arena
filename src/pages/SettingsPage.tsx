import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, User, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const SettingsPage = () => {
  const { toast } = useToast();
  const { user, profile, updatePassword, loading } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane logowanie</h1>
        <Link to="/login"><Button variant="hero">Zaloguj się</Button></Link>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Błąd", description: "Hasła nie są identyczne.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Błąd", description: "Hasło musi mieć minimum 6 znaków.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setSubmitting(false);
    if (error) {
      toast({ title: "Błąd", description: error, variant: "destructive" });
    } else {
      toast({ title: "Hasło zmienione!", description: "Twoje nowe hasło zostało zapisane." });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-6 font-display uppercase tracking-wider text-xs">
          <ArrowLeft className="h-4 w-4 mr-1" /> Powrót
        </Button>
      </Link>

      <h1 className="text-3xl font-display font-bold text-foreground mb-8">Ustawienia konta</h1>

      {/* Profile info */}
      <div className="rounded-lg border border-border bg-card p-6 card-glow mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-lg font-display font-bold text-primary">
            {profile?.avatar || "?"}
          </div>
          <div>
            <div className="font-body font-semibold text-foreground">{profile?.name || "Użytkownik"}</div>
            <div className="text-sm text-muted-foreground font-body">{user.email}</div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-lg border border-border bg-card p-6 card-glow">
        <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" /> Zmień hasło
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Nowe hasło</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 znaków" className="bg-muted/30 border-border" required />
          </div>
          <div className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Powtórz nowe hasło</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Powtórz hasło" className="bg-muted/30 border-border" required />
          </div>
          <Button type="submit" variant="hero" disabled={submitting}>
            {submitting ? "Zmiana..." : "Zmień hasło"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
