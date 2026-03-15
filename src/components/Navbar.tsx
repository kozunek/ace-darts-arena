import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn, LogOut, Shield, BarChart3, Settings, Handshake, Swords, Calendar, Trophy, Zap, MessageCircle, Megaphone, MoreHorizontal, ClipboardEdit, Target, Bug, Download, Gamepad2, Flame, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
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

type NavItem = { label: string; href: string; icon: React.ReactElement; authOnly?: boolean; mobileOnly?: boolean };

const primaryNavItems: NavItem[] = [
  { label: "Tabele", href: "/tables", icon: <Trophy className="h-4 w-4" /> },
  { label: "Mecze", href: "/matches", icon: <Target className="h-4 w-4" /> },
  { label: "Dodaj Wynik", href: "/submit", icon: <ClipboardEdit className="h-4 w-4" /> },
  { label: "Gracze", href: "/players", icon: <Swords className="h-4 w-4" /> },
];

const moreNavItems: NavItem[] = [
  { label: "Kalendarz", href: "/calendar", icon: <Calendar className="h-3.5 w-3.5" /> },
  { label: "Statystyki", href: "/stats", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { label: "H2H", href: "/h2h", icon: <Swords className="h-3.5 w-3.5" /> },
  { label: "Rekordy", href: "/hall-of-fame", icon: <Trophy className="h-3.5 w-3.5" /> },
  { label: "Osiągnięcia", href: "/achievements", icon: <Zap className="h-3.5 w-3.5" /> },
  { label: "Wyzwania", href: "/challenges", icon: <Flame className="h-3.5 w-3.5" /> },
  { label: "Ogłoszenia", href: "/announcements", icon: <Megaphone className="h-3.5 w-3.5" /> },
  { label: "Jak grać?", href: "/how-to-play", icon: <Gamepad2 className="h-3.5 w-3.5" /> },
  { label: "Regulamin rozgrywek", href: "/rules", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { label: "Pobieranie", href: "/downloads", icon: <Download className="h-3.5 w-3.5" />, authOnly: true },
  { label: "Zgłoś błąd", href: "/report-bug", icon: <Bug className="h-3.5 w-3.5" />, authOnly: true },
];

const allMobileItems: NavItem[] = [
  { label: "Strona główna", href: "/", icon: <Target className="h-4 w-4" /> },
  { label: "Moje Mecze", href: "/my-matches", icon: <Handshake className="h-4 w-4" />, authOnly: true },
  ...primaryNavItems,
  ...moreNavItems,
  { label: "Czat", href: "/chat", icon: <MessageCircle className="h-4 w-4" />, authOnly: true },
];

const Navbar = () => {
  const location = useLocation();
  const { user, profile, isAdmin, isModerator, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showAdminLink = isAdmin || isModerator;
  const isMoreActive = moreNavItems.some(i => location.pathname === i.href);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <img src="/pwa-512x512.png" alt="eDART" className="h-7 w-7 rounded-full transition-transform group-hover:rotate-12" />
          </Link>

          {/* Desktop nav — centered, icon on top + label below */}
          <div className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {primaryNavItems.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <button
                    className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-md transition-colors relative ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                    <span className="text-[10px] font-display uppercase tracking-wider">{item.label}</span>
                    {active && (
                      <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                </Link>
              );
            })}

            {/* More dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-md transition-colors relative ${
                    isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="text-[10px] font-display uppercase tracking-wider">Więcej</span>
                  {isMoreActive && (
                    <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 max-h-80 overflow-y-auto">
                {moreNavItems.filter(i => !i.authOnly || user).map((item) => (
                  <Link key={item.href} to={item.href}>
                    <DropdownMenuItem className={`font-display uppercase tracking-wider text-xs cursor-pointer ${location.pathname === item.href ? "bg-accent" : ""}`}>
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </DropdownMenuItem>
                  </Link>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {user && (
              <Link to="/my-matches">
                <Button 
                  variant={location.pathname === "/my-matches" ? "default" : "outline"} 
                  size="sm" 
                  className="hidden lg:flex items-center gap-1.5 h-8 px-3 font-display uppercase tracking-wider text-[10px]"
                >
                  <Handshake className="h-3.5 w-3.5" />
                  Moje Mecze
                </Button>
              </Link>
            )}
            <ThemeToggle />
            {user && <NotificationBell />}

            {/* Desktop user menu */}
            <div className="hidden lg:block">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="font-display uppercase tracking-wider text-[11px] h-8 px-2.5">
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      {profile?.name || "Profil"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Link to="/settings">
                      <DropdownMenuItem className="font-display uppercase tracking-wider text-xs cursor-pointer">
                        <Settings className="h-3.5 w-3.5 mr-2" /> Ustawienia
                      </DropdownMenuItem>
                    </Link>
                    {showAdminLink && (
                      <>
                        <DropdownMenuSeparator />
                        <Link to="/admin">
                          <DropdownMenuItem className="font-display uppercase tracking-wider text-xs cursor-pointer">
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
                  <Button variant="default" size="sm" className="font-display uppercase tracking-wider text-[11px] h-8 px-4">
                    Zaloguj
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button className="lg:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 animate-fade-in max-h-[calc(100vh-3.5rem)] overflow-y-auto overscroll-contain">
            {/* User section first - always visible */}
            {user ? (
              <div className="mb-2 pb-2 border-b border-border">
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
                <Button variant="outline" onClick={() => { logout(); setMobileOpen(false); }} className="w-full justify-start font-display uppercase tracking-wider text-sm text-destructive">
                  <LogOut className="h-4 w-4 mr-1" /> Wyloguj
                </Button>
              </div>
            ) : (
              <div className="mb-2 pb-2 border-b border-border">
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="default" className="w-full justify-start font-display uppercase tracking-wider text-sm">
                    <LogIn className="h-4 w-4 mr-1" /> Zaloguj
                  </Button>
                </Link>
              </div>
            )}

            {/* Navigation items */}
            {allMobileItems.filter(item => !item.authOnly || user).map((item) => (
              <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1"
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
