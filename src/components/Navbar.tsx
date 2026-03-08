import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn, LogOut, Shield, BarChart3, Settings, Handshake, Swords, Calendar, Trophy, Zap, MessageCircle, Megaphone, MoreHorizontal, ClipboardEdit, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primaryNavItems = [
  { label: "Tabela", href: "/", icon: <Target className="h-3.5 w-3.5" /> },
  { label: "Mecze", href: "/matches", icon: <Swords className="h-3.5 w-3.5" /> },
  { label: "Gracze", href: "/players", icon: <Trophy className="h-3.5 w-3.5" /> },
  { label: "Dodaj Wynik", href: "/submit", icon: <ClipboardEdit className="h-3.5 w-3.5" /> },
];

const moreNavItems = [
  { label: "Moje Mecze", href: "/my-matches", icon: <Handshake className="h-3.5 w-3.5" />, authOnly: true },
  { label: "Statystyki", href: "/stats", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { label: "H2H", href: "/h2h", icon: <Swords className="h-3.5 w-3.5" /> },
  { label: "Kalendarz", href: "/calendar", icon: <Calendar className="h-3.5 w-3.5" /> },
  { label: "Hall of Fame", href: "/hall-of-fame", icon: <Trophy className="h-3.5 w-3.5" /> },
  { label: "Osiągnięcia", href: "/achievements", icon: <Zap className="h-3.5 w-3.5" /> },
  { label: "Czat", href: "/chat", icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { label: "Ogłoszenia", href: "/announcements", icon: <Megaphone className="h-3.5 w-3.5" /> },
];

const allMobileItems = [
  { label: "Tabela Ligi", href: "/", icon: <Target className="h-4 w-4" /> },
  { label: "Mecze", href: "/matches", icon: <Swords className="h-4 w-4" /> },
  { label: "Gracze", href: "/players", icon: <Trophy className="h-4 w-4" /> },
  { label: "Dodaj Wynik", href: "/submit", icon: <ClipboardEdit className="h-4 w-4" /> },
  { label: "Moje Mecze", href: "/my-matches", icon: <Handshake className="h-4 w-4" />, authOnly: true },
  { label: "Statystyki", href: "/stats", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "H2H", href: "/h2h", icon: <Swords className="h-4 w-4" /> },
  { label: "Kalendarz", href: "/calendar", icon: <Calendar className="h-4 w-4" /> },
  { label: "Hall of Fame", href: "/hall-of-fame", icon: <Trophy className="h-4 w-4" /> },
  { label: "Osiągnięcia", href: "/achievements", icon: <Zap className="h-4 w-4" /> },
  { label: "Czat", href: "/chat", icon: <MessageCircle className="h-4 w-4" /> },
  { label: "Ogłoszenia", href: "/announcements", icon: <Megaphone className="h-4 w-4" /> },
];

const Navbar = () => {
  const location = useLocation();
  const { user, profile, isAdmin, isModerator, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showAdminLink = isAdmin || isModerator;
  const isMoreActive = moreNavItems.some((item) => location.pathname === item.href);
  const isUserMenuActive = ["/my-matches", "/settings", "/admin"].includes(location.pathname);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <img src="/pwa-192x192.png" alt="eDART Polska" className="h-7 w-7 rounded-full transition-transform group-hover:rotate-12" />
            <span className="font-display text-lg tracking-wider text-foreground">
              e<span className="text-primary">DART</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {primaryNavItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  size="sm"
                  className="font-display uppercase tracking-wider text-[11px] h-8 px-2.5"
                >
                  {item.icon}
                  <span className="ml-1">{item.label}</span>
                </Button>
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isMoreActive ? "default" : "ghost"}
                  size="sm"
                  className="font-display uppercase tracking-wider text-[11px] h-8 px-2.5"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 mr-1" />
                  Więcej
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                {moreNavItems.filter(item => !item.authOnly || user).map((item) => (
                  <Link key={item.href} to={item.href}>
                    <DropdownMenuItem className={`font-display uppercase tracking-wider text-xs cursor-pointer ${location.pathname === item.href ? "bg-accent" : ""}`}>
                      {item.icon && <span className="mr-2">{item.icon}</span>}
                      {item.label}
                    </DropdownMenuItem>
                  </Link>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isUserMenuActive ? "default" : "ghost"}
                    size="sm"
                    className="font-display uppercase tracking-wider text-[11px] h-8 px-2.5 ml-1"
                  >
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    {profile?.name || "Profil"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <Link to="/my-matches">
                    <DropdownMenuItem className={`font-display uppercase tracking-wider text-xs cursor-pointer ${location.pathname === "/my-matches" ? "bg-accent" : ""}`}>
                      <Handshake className="h-3.5 w-3.5 mr-2" /> Moje Mecze
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/settings">
                    <DropdownMenuItem className={`font-display uppercase tracking-wider text-xs cursor-pointer ${location.pathname === "/settings" ? "bg-accent" : ""}`}>
                      <Settings className="h-3.5 w-3.5 mr-2" /> Ustawienia
                    </DropdownMenuItem>
                  </Link>
                  {showAdminLink && (
                    <>
                      <DropdownMenuSeparator />
                      <Link to="/admin">
                        <DropdownMenuItem className={`font-display uppercase tracking-wider text-xs cursor-pointer ${location.pathname === "/admin" ? "bg-accent" : ""}`}>
                          <Shield className="h-3.5 w-3.5 mr-2" /> {isAdmin ? "Panel Admina" : "Panel Moderatora"}
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="font-display uppercase tracking-wider text-xs cursor-pointer text-destructive">
                    <LogOut className="h-3.5 w-3.5 mr-2" /> Wyloguj
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="ml-1 font-display uppercase tracking-wider text-[11px] h-8 px-2.5">
                  <LogIn className="h-3.5 w-3.5 mr-1" /> Zaloguj
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user && <NotificationBell />}
            <button className="lg:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden pb-4 animate-fade-in">
            {allMobileItems.map((item) => (
              <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1"
                >
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  {item.label}
                </Button>
              </Link>
            ))}
            {user && (
              <>
                <div className="my-2 border-t border-border" />
                <Link to="/my-matches" onClick={() => setMobileOpen(false)}>
                  <Button variant={location.pathname === "/my-matches" ? "default" : "ghost"} className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                    <Handshake className="h-4 w-4 mr-1" /> Moje Mecze
                  </Button>
                </Link>
                <Link to="/settings" onClick={() => setMobileOpen(false)}>
                  <Button variant={location.pathname === "/settings" ? "default" : "ghost"} className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                    <Settings className="h-4 w-4 mr-1" /> Ustawienia
                  </Button>
                </Link>
                {showAdminLink && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)}>
                    <Button variant={location.pathname === "/admin" ? "default" : "ghost"} className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                      <Shield className="h-4 w-4 mr-1" /> {isAdmin ? "Panel Admina" : "Panel Moderatora"}
                    </Button>
                  </Link>
                )}
                <Button variant="outline" onClick={() => { logout(); setMobileOpen(false); }} className="w-full justify-start font-display uppercase tracking-wider text-sm">
                  <LogOut className="h-4 w-4 mr-1" /> Wyloguj
                </Button>
              </>
            )}
            {!user && (
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