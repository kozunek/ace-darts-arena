import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLeague } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Edit2, UserPlus, Award, Shield, Search,
  Settings, Eye, Zap, Users, Save, X,
} from "lucide-react";

// ─── AVAILABLE PERMISSIONS ───
const PAGE_PERMISSIONS = [
  { key: "/", label: "Strona główna" },
  { key: "/tables", label: "Tabele" },
  { key: "/admin", label: "Panel Admina" },
  { key: "/stats", label: "Statystyki" },
  { key: "/matches", label: "Mecze" },
  { key: "/players", label: "Gracze" },
  { key: "/hall-of-fame", label: "Rekordy" },
  { key: "/calendar", label: "Kalendarz" },
  { key: "/chat", label: "Czat" },
  { key: "/achievements", label: "Osiągnięcia" },
  { key: "/h2h", label: "Head to Head" },
  { key: "/announcements", label: "Ogłoszenia" },
  { key: "/my-matches", label: "Moje mecze" },
  { key: "/submit", label: "Zgłoś mecz" },
  { key: "/settings", label: "Ustawienia" },
  { key: "/downloads", label: "Pobieranie" },
  { key: "/how-to-play", label: "Jak grać" },
  { key: "/report-bug", label: "Zgłoś błąd" },
];

const ACTION_PERMISSIONS = [
  { key: "manage_leagues", label: "Zarządzanie ligami" },
  { key: "manage_players", label: "Zarządzanie graczami" },
  { key: "manage_matches", label: "Zarządzanie meczami" },
  { key: "approve_matches", label: "Zatwierdzanie meczów" },
  { key: "manage_roles", label: "Zarządzanie rolami" },
  { key: "manage_integrations", label: "Integracje" },
  { key: "view_audit_log", label: "Dziennik zmian" },
  { key: "export_data", label: "Eksport danych" },
  { key: "manage_announcements", label: "Zarządzanie ogłoszeniami" },
  { key: "manage_bugs", label: "Zarządzanie błędami" },
];

interface CustomRole {
  id: string;
  name: string;
  description: string;
  stats_scope: string;
  is_guest_role: boolean;
  created_at: string;
}

interface Permission {
  id: string;
  role_id: string;
  permission_type: string;
  permission_key: string;
}

interface UserCustomRole {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
  user_name?: string;
}

const RoleManagementPanel = () => {
  const { toast } = useToast();
  const { leagues } = useLeague();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userCustomRoles, setUserCustomRoles] = useState<UserCustomRole[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Legacy user_roles (enum-based)
  const [legacyRoles, setLegacyRoles] = useState<any[]>([]);

  // Create/Edit role dialog
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; editing?: CustomRole }>({ open: false });
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleStatsScope, setRoleStatsScope] = useState("own_leagues");
  const [roleStatsLeagueIds, setRoleStatsLeagueIds] = useState<Set<string>>(new Set());
  const [rolePages, setRolePages] = useState<Set<string>>(new Set());
  const [roleActions, setRoleActions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Assign users dialog
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; role?: CustomRole }>({ open: false });
  const [userSearch, setUserSearch] = useState("");

  // Legacy assign
  const [legacyUserId, setLegacyUserId] = useState("");
  const [legacyRole, setLegacyRole] = useState("moderator");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [rolesRes, permsRes, userRolesRes, profilesRes, legacyRes] = await Promise.all([
      supabase.from("custom_roles").select("*").order("created_at"),
      supabase.from("custom_role_permissions").select("*"),
      supabase.from("user_custom_roles").select("*"),
      supabase.from("profiles").select("user_id, name").order("name"),
      supabase.from("user_roles").select("*"),
    ]);

    if (rolesRes.data) setRoles(rolesRes.data as CustomRole[]);
    if (permsRes.data) setPermissions(permsRes.data as Permission[]);
    if (profilesRes.data) setProfiles(profilesRes.data);

    // Enrich user custom roles with names
    if (userRolesRes.data && profilesRes.data) {
      const enriched = (userRolesRes.data as any[]).map((ur) => ({
        ...ur,
        user_name: profilesRes.data.find((p) => p.user_id === ur.user_id)?.name || "Nieznany",
      }));
      setUserCustomRoles(enriched);
    }

    // Enrich legacy roles
    if (legacyRes.data && profilesRes.data) {
      const enriched = (legacyRes.data as any[]).map((r) => ({
        ...r,
        name: profilesRes.data.find((p) => p.user_id === r.user_id)?.name || "Nieznany",
      }));
      setLegacyRoles(enriched);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── ROLE DIALOG HELPERS ───
  const openCreateDialog = () => {
    setRoleName("");
    setRoleDesc("");
    setRoleStatsScope("own_leagues");
    setRoleStatsLeagueIds(new Set());
    setRolePages(new Set());
    setRoleActions(new Set());
    setRoleDialog({ open: true });
  };

  const openEditDialog = (role: CustomRole) => {
    setRoleName(role.name);
    setRoleDesc(role.description);
    setRoleStatsScope(role.stats_scope);
    const rolePerms = permissions.filter((p) => p.role_id === role.id);
    setRolePages(new Set(rolePerms.filter((p) => p.permission_type === "page").map((p) => p.permission_key)));
    setRoleActions(new Set(rolePerms.filter((p) => p.permission_type === "action").map((p) => p.permission_key)));
    setRoleStatsLeagueIds(new Set([
      ...rolePerms.filter((p) => p.permission_type === "stats_league").map((p) => p.permission_key),
      ...rolePerms.filter((p) => p.permission_type === "stats_platform").map((p) => p.permission_key),
    ]));
    setRoleDialog({ open: true, editing: role });
  };

  const togglePerm = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setter(next);
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      toast({ title: "Błąd", description: "Nazwa roli jest wymagana.", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      let roleId: string;

      if (roleDialog.editing) {
        // Update
        const { error } = await supabase.from("custom_roles").update({
          name: roleName.trim(),
          description: roleDesc.trim(),
          stats_scope: roleStatsScope,
        } as any).eq("id", roleDialog.editing.id);
        if (error) throw error;
        roleId = roleDialog.editing.id;

        // Delete old permissions
        await supabase.from("custom_role_permissions").delete().eq("role_id", roleId);
      } else {
        // Create
        const { data, error } = await supabase.from("custom_roles").insert({
          name: roleName.trim(),
          description: roleDesc.trim(),
          stats_scope: roleStatsScope,
        } as any).select().single();
        if (error) throw error;
        roleId = (data as any).id;
      }

      // Insert permissions
      const permRows: any[] = [];
      rolePages.forEach((key) => permRows.push({ role_id: roleId, permission_type: "page", permission_key: key }));
      roleActions.forEach((key) => permRows.push({ role_id: roleId, permission_type: "action", permission_key: key }));
              if (roleStatsScope === "selected_leagues") {
        roleStatsLeagueIds.forEach((key) => permRows.push({ role_id: roleId, permission_type: "stats_league", permission_key: key }));
      }
      if (roleStatsScope === "platform") {
        roleStatsLeagueIds.forEach((key) => permRows.push({ role_id: roleId, permission_type: "stats_platform", permission_key: key }));
      }

      if (permRows.length > 0) {
        const { error: permErr } = await supabase.from("custom_role_permissions").insert(permRows);
        if (permErr) throw permErr;
      }

      toast({ title: roleDialog.editing ? "✅ Rola zaktualizowana!" : "✅ Rola utworzona!" });
      setRoleDialog({ open: false });
      await loadAll();
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message || "Nie udało się zapisać roli.", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDeleteRole = async (roleId: string) => {
    const { error } = await supabase.from("custom_roles").delete().eq("id", roleId);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rola usunięta" });
      await loadAll();
    }
  };

  // ─── USER ASSIGNMENT ───
  const toggleUserRole = async (userId: string, roleId: string) => {
    const existing = userCustomRoles.find((ur) => ur.user_id === userId && ur.role_id === roleId);
    if (existing) {
      await supabase.from("user_custom_roles").delete().eq("id", existing.id);
    } else {
      await supabase.from("user_custom_roles").insert({ user_id: userId, role_id: roleId } as any);
    }
    await loadAll();
  };

  // ─── LEGACY ROLES ───
  const handleAddLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legacyUserId || !legacyRole) return;
    const exists = legacyRoles.find((r) => r.user_id === legacyUserId && r.role === legacyRole);
    if (exists) {
      toast({ title: "Błąd", description: "Ten użytkownik ma już tę rolę.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("user_roles").insert({
      user_id: legacyUserId,
      role: legacyRole as "admin" | "moderator" | "user",
    });
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Rola przypisana!" });
      setLegacyUserId("");
      await loadAll();
    }
  };

  const handleDeleteLegacy = async (id: string) => {
    await supabase.from("user_roles").delete().eq("id", id);
    toast({ title: "Rola usunięta" });
    await loadAll();
  };

  const getPermissionsForRole = (roleId: string) => permissions.filter((p) => p.role_id === roleId);
  const getUsersForRole = (roleId: string) => userCustomRoles.filter((ur) => ur.role_id === roleId);

  if (loading) return <p className="text-muted-foreground text-sm">Ładowanie...</p>;

  return (
    <div className="space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto overscroll-contain">
      <h2 className="text-xl font-display font-bold text-foreground">Zarządzanie rolami</h2>

      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="w-full grid grid-cols-2 sticky top-0 z-10">
          <TabsTrigger value="custom">🎭 Role niestandardowe</TabsTrigger>
          <TabsTrigger value="system">🛡️ Role systemowe</TabsTrigger>
        </TabsList>

        {/* ─── CUSTOM ROLES TAB ─── */}
        <TabsContent value="custom" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground font-body">
              Twórz własne role z uprawnieniami do stron, akcji i widoczności statystyk.
            </p>
            <Button variant="hero" size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" /> Nowa rola
            </Button>
          </div>

          {roles.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Brak ról niestandardowych. Utwórz pierwszą!</p>
          ) : (
            <div className="space-y-3">
              {[...roles].sort((a, b) => (a.is_guest_role === b.is_guest_role ? 0 : a.is_guest_role ? -1 : 1)).map((role) => {
                const perms = getPermissionsForRole(role.id);
                const pagePerms = perms.filter((p) => p.permission_type === "page");
                const actionPerms = perms.filter((p) => p.permission_type === "action");
                const assignedUsers = getUsersForRole(role.id);

                return (
                  <div key={role.id} className="rounded-lg border border-border bg-card p-4 card-glow space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Shield className="h-4 w-4 text-primary" />
                          <h3 className="font-display font-bold text-foreground">{role.name}</h3>
                          {role.is_guest_role && (
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full border bg-orange-500/20 border-orange-500/30 text-orange-400 font-display">
                              👁️ Niezalogowani
                            </span>
                          )}
                          <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full border font-display ${
                            role.stats_scope === "all_leagues"
                              ? "bg-primary/20 border-primary/30 text-primary"
                              : role.stats_scope === "platform"
                              ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                              : "bg-muted border-border text-muted-foreground"
                          }`}>
                            {role.stats_scope === "all_leagues" ? "Wszystkie ligi" 
                              : role.stats_scope === "platform" ? "Platforma"
                              : role.stats_scope === "selected_leagues" ? "Wybrane ligi"
                              : "Tylko swoje ligi"}
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-xs text-muted-foreground font-body mt-1">{role.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!role.is_guest_role && (
                          <Button variant="ghost" size="sm" onClick={() => setAssignDialog({ open: true, role })}>
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(role)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {!role.is_guest_role && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteRole(role.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Permissions summary */}
                    <div className="flex flex-wrap gap-1">
                      {pagePerms.map((p) => (
                        <span key={p.id} className="text-[10px] bg-accent/20 text-accent border border-accent/30 rounded-full px-2 py-0.5 font-display">
                          <Eye className="h-2.5 w-2.5 inline mr-0.5" />
                          {PAGE_PERMISSIONS.find((pp) => pp.key === p.permission_key)?.label || p.permission_key}
                        </span>
                      ))}
                      {actionPerms.map((p) => (
                        <span key={p.id} className="text-[10px] bg-secondary/20 text-secondary border border-secondary/30 rounded-full px-2 py-0.5 font-display">
                          <Zap className="h-2.5 w-2.5 inline mr-0.5" />
                          {ACTION_PERMISSIONS.find((ap) => ap.key === p.permission_key)?.label || p.permission_key}
                        </span>
                      ))}
                      {perms.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">Brak uprawnień</span>
                      )}
                    </div>

                    {/* Assigned users */}
                    {!role.is_guest_role && assignedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-border">
                        <span className="text-[10px] text-muted-foreground mr-1">Użytkownicy:</span>
                        {assignedUsers.map((ur) => (
                          <span key={ur.id} className="text-[10px] bg-muted rounded-full px-2 py-0.5 font-body text-foreground">
                            {ur.user_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── SYSTEM ROLES TAB ─── */}
        <TabsContent value="system" className="space-y-4 mt-4">
          <div className="rounded-lg border border-border bg-card p-5 card-glow">
            <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Przypisz rolę systemową
            </h3>
            <form onSubmit={handleAddLegacy} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Użytkownik</Label>
                  <Select value={legacyUserId} onValueChange={setLegacyUserId}>
                    <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Rola</Label>
                  <Select value={legacyRole} onValueChange={setLegacyRole}>
                    <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">🛡️ Admin</SelectItem>
                      <SelectItem value="moderator">⚡ Moderator</SelectItem>
                      <SelectItem value="user">👤 Gracz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" variant="hero" className="w-full">
                    <Award className="h-4 w-4 mr-1" /> Przypisz
                  </Button>
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 card-glow">
            <h3 className="font-display font-bold text-foreground mb-3">Obecne role systemowe</h3>
            {legacyRoles.length === 0 ? (
              <p className="text-muted-foreground text-sm">Brak przypisanych ról.</p>
            ) : (
              <div className="space-y-2">
                {legacyRoles.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-display uppercase px-2 py-1 rounded-full border ${
                        r.role === "admin" ? "bg-primary/20 border-primary/30 text-primary" :
                        r.role === "moderator" ? "bg-accent/20 border-accent/30 text-accent" :
                        "bg-secondary/20 border-secondary/30 text-secondary"
                      }`}>{r.role}</span>
                      <span className="font-body text-sm text-foreground">{r.name}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteLegacy(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 card-glow">
            <h3 className="font-display font-bold text-foreground mb-3">Legenda</h3>
            <div className="space-y-2 text-sm font-body text-muted-foreground">
              <div><span className="text-primary font-semibold">Admin</span> — Pełna kontrola</div>
              <div><span className="text-accent font-semibold">Moderator</span> — Zatwierdzanie meczów</div>
              <div><span className="text-secondary font-semibold">Gracz</span> — Zgłaszanie wyników</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── CREATE/EDIT ROLE DIALOG ─── */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => { if (!open) setRoleDialog({ open: false }); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">
              {roleDialog.editing ? "Edytuj rolę" : "Nowa rola"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-5 pb-4">
              {/* Name & description */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Nazwa roli</Label>
                  <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="np. Komentator" />
                </div>
                <div className="space-y-2">
                  <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Opis</Label>
                  <Input value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} placeholder="Krótki opis roli..." />
                </div>
              </div>

              {/* Stats scope */}
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Widoczność statystyk</Label>
                <Select value={roleStatsScope} onValueChange={setRoleStatsScope}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_leagues">📊 Wszystkie ligi</SelectItem>
                    <SelectItem value="own_leagues">🎯 Tylko ligi, w których gra</SelectItem>
                    <SelectItem value="platform">🖥️ Ligi z platformy</SelectItem>
                    <SelectItem value="selected_leagues">📋 Wybrane ligi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Platform-based stats selection */}
              {roleStatsScope === "platform" && (
                <div className="space-y-2">
                  <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Platforma</Label>
                  <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border p-2">
                    {[
                      { key: "autodarts", label: "🎯 Autodarts" },
                      { key: "dartcounter", label: "📱 DartCounter" },
                      { key: "dartsmind", label: "🧠 DartsMind" },
                      { key: "manual", label: "✍️ Ręczne" },
                    ].map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm font-body cursor-pointer hover:bg-muted/30 rounded-md px-2 py-1.5">
                        <Checkbox
                          checked={roleStatsLeagueIds.has(p.key)}
                          onCheckedChange={() => togglePerm(roleStatsLeagueIds, p.key, setRoleStatsLeagueIds)}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* League-specific stats selection */}
              {roleStatsScope === "selected_leagues" && (
                <div className="space-y-2">
                  <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Ligi ze statystykami</Label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                    {leagues.map((league) => (
                      <label key={league.id} className="flex items-center gap-2 text-sm font-body cursor-pointer hover:bg-muted/30 rounded-md px-2 py-1.5">
                        <Checkbox
                          checked={roleStatsLeagueIds.has(league.id)}
                          onCheckedChange={() => togglePerm(roleStatsLeagueIds, league.id, setRoleStatsLeagueIds)}
                        />
                        {league.name}
                        <span className="text-[10px] text-muted-foreground ml-auto">{league.season}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Page permissions */}
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Dostęp do stron
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAGE_PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm font-body cursor-pointer hover:bg-muted/30 rounded-md px-2 py-1.5">
                      <Checkbox
                        checked={rolePages.has(p.key)}
                        onCheckedChange={() => togglePerm(rolePages, p.key, setRolePages)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Action permissions */}
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Uprawnienia do akcji
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {ACTION_PERMISSIONS.map((a) => (
                    <label key={a.key} className="flex items-center gap-2 text-sm font-body cursor-pointer hover:bg-muted/30 rounded-md px-2 py-1.5">
                      <Checkbox
                        checked={roleActions.has(a.key)}
                        onCheckedChange={() => togglePerm(roleActions, a.key, setRoleActions)}
                      />
                      {a.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setRoleDialog({ open: false })}>Anuluj</Button>
            <Button variant="hero" onClick={handleSaveRole} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ASSIGN USERS DIALOG ─── */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => { if (!open) setAssignDialog({ open: false }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              Przypisz użytkowników — {assignDialog.role?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Szukaj użytkownika..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {profiles
                .filter((p) => !userSearch || p.name.toLowerCase().includes(userSearch.toLowerCase()))
                .map((p) => {
                  const isAssigned = userCustomRoles.some(
                    (ur) => ur.user_id === p.user_id && ur.role_id === assignDialog.role?.id
                  );
                  return (
                    <button
                      key={p.user_id}
                      onClick={() => assignDialog.role && toggleUserRole(p.user_id, assignDialog.role.id)}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-body transition-colors text-left ${
                        isAssigned
                          ? "bg-primary/10 border border-primary/30 text-foreground"
                          : "hover:bg-muted/50 border border-transparent text-muted-foreground"
                      }`}
                    >
                      <Checkbox checked={isAssigned} />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagementPanel;
