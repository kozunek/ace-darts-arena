import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn, LogOut, Shield, BarChart3, Settings, Handshake, Swords, Calendar, Trophy, Zap, MessageCircle, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { label: "Tabela Ligi", href: "/" },
  { label: "Mecze", href: "/matches" },
  { label: "Gracze", href: "/players" },
  { label: "Statystyki", href: "/stats", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { label: "H2H", href: "/h2h", icon: <Swords className="h-3.5 w-3.5" /> },
  { label: "Kalendarz", href: "/calendar", icon: <Calendar className="h-3.5 w-3.5" /> },
  { label: "Hall of Fame", href: "/hall-of-fame", icon: <Trophy className="h-3.5 w-3.5" /> },
  { label: "Osiągnięcia", href: "/achievements", icon: <Zap className="h-3.5 w-3.5" /> },
  { label: "Dodaj Wynik", href: "/submit" },
];

const Navbar = () => {
  const location = useLocation();
  const { user, profile, isAdmin, isModerator, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showAdminLink = isAdmin || isModerator;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/pwa-192x192.png" alt="eDART Polska" className="h-8 w-8 rounded-full transition-transform group-hover:rotate-12" />
            <span className="font-display text-xl tracking-wider text-foreground">
              e<span className="text-primary">DART</span> <span className="text-sm text-primary">Polska</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  size="sm"
                  className="font-display uppercase tracking-wider text-xs"
                >
                  {item.icon && item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
            {user && (
              <>
                <Link to="/my-matches">
                  <Button variant={location.pathname === "/my-matches" ? "default" : "ghost"} size="sm" className="font-display uppercase tracking-wider text-xs">
                    <Handshake className="h-3.5 w-3.5 mr-1" /> Moje Mecze
                  </Button>
                </Link>
                <Link to="/chat">
                  <Button variant={location.pathname === "/chat" ? "default" : "ghost"} size="sm" className="font-display uppercase tracking-wider text-xs">
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> Czat
                  </Button>
                </Link>
                <Link to="/announcements">
                  <Button variant={location.pathname === "/announcements" ? "default" : "ghost"} size="sm" className="font-display uppercase tracking-wider text-xs">
                    <Megaphone className="h-3.5 w-3.5 mr-1" /> Ogłoszenia
                  </Button>
                </Link>
              </>
            )}
            {showAdminLink && (
              <Link to="/admin">
                <Button
                  variant={location.pathname === "/admin" ? "default" : "ghost"}
                  size="sm"
                  className="font-display uppercase tracking-wider text-xs"
                >
                  <Shield className="h-3.5 w-3.5 mr-1" /> {isAdmin ? "Admin" : "Moderator"}
                </Button>
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-1 ml-2">
                <Link to="/settings">
                  <Button variant="ghost" size="sm" className="font-display uppercase tracking-wider text-xs">
                    <Settings className="h-3.5 w-3.5 mr-1" /> {profile?.name || user.email}
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={logout} className="font-display uppercase tracking-wider text-xs">
                  <LogOut className="h-4 w-4 mr-1" /> Wyloguj
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="ml-2 font-display uppercase tracking-wider text-xs">
                  <LogIn className="h-4 w-4 mr-1" /> Zaloguj
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user && <NotificationBell />}
            <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1"
                >
                  {item.icon && item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
            {user && (
              <Link to="/my-matches" onClick={() => setMobileOpen(false)}>
                <Button variant={location.pathname === "/my-matches" ? "default" : "ghost"} className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                  <Handshake className="h-4 w-4 mr-1" /> Moje Mecze
                </Button>
              </Link>
            )}
            {showAdminLink && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}>
                <Button variant={location.pathname === "/admin" ? "default" : "ghost"} className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                  <Shield className="h-4 w-4 mr-1" /> {isAdmin ? "Admin" : "Moderator"}
                </Button>
              </Link>
            )}
            {user ? (
              <>
                <Link to="/settings" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                    <Settings className="h-4 w-4 mr-1" /> Ustawienia
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => { logout(); setMobileOpen(false); }} className="w-full justify-start font-display uppercase tracking-wider text-sm">
                  <LogOut className="h-4 w-4 mr-1" /> Wyloguj
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full justify-start font-display uppercase tracking-wider text-sm">
                  <LogIn className="h-4 w-4 mr-1" /> Zaloguj
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
