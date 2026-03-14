import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ResetPasswordPage = () => {
  const { toast } = useToast();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Błąd", description: "Hasła nie są identyczne.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Błąd", description: "Hasło musi mieć minimum 6 znaków.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Błąd", description: error, variant: "destructive" });
    } else {
      toast({ title: "Hasło zmienione!", description: "Możesz teraz zalogować się nowym hasłem." });
      navigate("/");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <img src="/favicon.png" alt="eDART Polska" className="h-10 w-10" />
            <span className="font-display text-2xl tracking-wider text-foreground uppercase">
              e<span className="text-primary">DART</span> <span className="text-sm text-primary">Polska</span>
            </span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">Ustaw nowe hasło</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">Wprowadź nowe hasło do swojego konta</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 card-glow">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Nowe hasło</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 znaków" className="bg-muted/30 border-border" required />
            </div>
            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Powtórz nowe hasło</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Powtórz hasło" className="bg-muted/30 border-border" required />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
              <KeyRound className="h-4 w-4 mr-2" />
              {submitting ? "Zmiana..." : "Zmień hasło"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
