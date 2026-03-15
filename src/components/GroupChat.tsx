import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Hash, Lock, Trophy, Monitor, Trash2, Ban, Clock, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";

interface Channel {
  id: string;
  name: string;
  description: string;
  channel_type: string;
  league_id: string | null;
  platform: string | null;
}

interface GroupMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface SenderInfo {
  name: string;
  nick?: string;
  avatar?: string;
  avatar_url?: string | null;
}

interface GroupChatProps {
  compact?: boolean;
}

const GroupChat = ({ compact = false }: GroupChatProps) => {
  const { user, isAdmin, isModerator } = useAuth();
  const isMobile = useIsMobile();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [senderInfos, setSenderInfos] = useState<Record<string, SenderInfo>>({});
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userCustomRoleIds, setUserCustomRoleIds] = useState<string[]>([]);
  const [channelRoles, setChannelRoles] = useState<{ channel_id: string; role_id: string }[]>([]);
  const [channelSystemRoles, setChannelSystemRoles] = useState<{ channel_id: string; system_role: string }[]>([]);
  const [isBanned, setIsBanned] = useState(false);
  const [bannedUntil, setBannedUntil] = useState<string | null>(null);
  const [banDialog, setBanDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: "", userName: "" });
  const [banDuration, setBanDuration] = useState("1h");
  const [banReason, setBanReason] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 120 });
  const [size, setSize] = useState({ width: 540, height: 520 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canModerate = isAdmin || isModerator;

  // Check if current user is banned
  const checkBan = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_bans")
      .select("banned_until")
      .eq("user_id", user.id)
      .gt("banned_until", new Date().toISOString())
      .order("banned_until", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setIsBanned(true);
      setBannedUntil(data[0].banned_until);
    } else {
      setIsBanned(false);
      setBannedUntil(null);
    }
  }, [user]);

  const loadAccessData = useCallback(async () => {
    if (!user) return;

    const [chRes, crRes, csrRes, urRes, ucrRes] = await Promise.all([
      supabase.from("group_channels").select("*").order("created_at"),
      supabase.from("group_channel_roles").select("channel_id, role_id"),
      supabase.from("group_channel_system_roles").select("channel_id, system_role"),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("user_custom_roles").select("role_id").eq("user_id", user.id),
    ]);

    const allChannels = (chRes.data || []) as Channel[];
    const cr = (crRes.data || []) as { channel_id: string; role_id: string }[];
    const csr = (csrRes.data || []) as { channel_id: string; system_role: string }[];
    const sysRoles = (urRes.data || []).map((r: any) => r.role as string);
    const customRoleIds = (ucrRes.data || []).map((r: any) => r.role_id as string);

    setChannelRoles(cr);
    setChannelSystemRoles(csr);
    setUserRoles(sysRoles);
    setUserCustomRoleIds(customRoleIds);

    const accessible = allChannels.filter((ch) => {
      if (isAdmin) return true;
      const chSysRoles = csr.filter((x) => x.channel_id === ch.id).map((x) => x.system_role);
      const chCustomRoles = cr.filter((x) => x.channel_id === ch.id).map((x) => x.role_id);
      if (chSysRoles.length === 0 && chCustomRoles.length === 0) return true;
      if (chSysRoles.some((sr) => sysRoles.includes(sr))) return true;
      if (isModerator && chSysRoles.includes("moderator")) return true;
      if (chCustomRoles.some((crid) => customRoleIds.includes(crid))) return true;
      return false;
    });

    setChannels(accessible);
    if (accessible.length > 0 && !activeChannel) {
      setActiveChannel(accessible[0].id);
    }
  }, [user, isAdmin, isModerator, activeChannel]);

  useEffect(() => { loadAccessData(); checkBan(); }, [loadAccessData, checkBan]);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Drag / resize handlers (desktop only)
  useEffect(() => {
    if (isMobile) return;

    const onPointerMove = (event: PointerEvent) => {
      if (dragging && dragRef.current) {
        const dx = event.clientX - dragRef.current.startX;
        const dy = event.clientY - dragRef.current.startY;
        setPosition({ x: Math.max(16, dragRef.current.startLeft + dx), y: Math.max(16, dragRef.current.startTop + dy) });
      }
      if (resizing && resizeRef.current) {
        const dx = event.clientX - resizeRef.current.startX;
        const dy = event.clientY - resizeRef.current.startY;
        setSize({
          width: Math.max(320, resizeRef.current.startWidth + dx),
          height: Math.max(320, resizeRef.current.startHeight + dy),
        });
      }
    };

    const onPointerUp = () => {
      setDragging(false);
      setResizing(false);
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, resizing, isMobile]);

  // Load sender info (name + nick) for a set of user IDs
  const loadSenderInfos = useCallback(async (senderIds: string[]) => {
    if (senderIds.length === 0) return;
    const [profilesRes, playersRes] = await Promise.all([
      supabase.from("profiles").select("user_id, name").in("user_id", senderIds),
      supabase.from("players_public").select("user_id, name, avatar, avatar_url").in("user_id", senderIds),
    ]);
    const profiles = profilesRes.data || [];
    const players = playersRes.data || [];

    const infos: Record<string, SenderInfo> = {};
    senderIds.forEach((uid) => {
      const profile = profiles.find((p: any) => p.user_id === uid);
      const player = players.find((p: any) => p.user_id === uid);
      const profileName = profile?.name || "...";
      const playerName = player?.name;
      const nick = playerName && playerName !== profileName ? playerName : undefined;
      infos[uid] = {
        name: profileName,
        nick,
        avatar: player?.avatar || profileName.substring(0, 2).toUpperCase(),
        avatar_url: player?.avatar_url || null,
      };
    });
    setSenderInfos((prev) => ({ ...prev, ...infos }));
  }, []);

  // Pre-load own sender info
  useEffect(() => {
    if (user && !senderInfos[user.id]) {
      loadSenderInfos([user.id]);
    }
  }, [user, loadSenderInfos]);

  // Load messages for active channel
  useEffect(() => {
    if (!activeChannel) return;
    const loadMsgs = async () => {
      const { data } = await supabase
        .from("group_messages")
        .select("*")
        .eq("channel_id", activeChannel)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((data as GroupMessage[]) || []);

      const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
      loadSenderInfos(senderIds);
    };
    loadMsgs();
  }, [activeChannel, loadSenderInfos]);

  // Realtime
  useEffect(() => {
    if (!activeChannel) return;
    const channel = supabase
      .channel(`group_chat_${activeChannel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `channel_id=eq.${activeChannel}` }, async (payload) => {
        const msg = payload.new as GroupMessage;
        setMessages((prev) => [...prev, msg]);
        if (!senderInfos[msg.sender_id]) {
          loadSenderInfos([msg.sender_id]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChannel, senderInfos, loadSenderInfos]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const deleteMessage = async (msgId: string) => {
    const { error } = await supabase.from("group_messages").delete().eq("id", msgId);
    if (error) {
      toast.error("Nie udało się usunąć wiadomości");
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    toast.success("Wiadomość usunięta");
  };

  const handleBanUser = async () => {
    if (!user || !banDialog.userId) return;

    const durationMs: Record<string, number> = {
      "1h": 3600000,
      "6h": 21600000,
      "24h": 86400000,
      "3d": 259200000,
      "7d": 604800000,
      "30d": 2592000000,
    };

    const until = new Date(Date.now() + (durationMs[banDuration] || 3600000));

    const { error } = await supabase.from("chat_bans").insert({
      user_id: banDialog.userId,
      banned_by: user.id,
      reason: banReason.trim() || "Naruszenie regulaminu czatu",
      banned_until: until.toISOString(),
    } as any);

    if (error) {
      toast.error("Nie udało się zablokować użytkownika");
      return;
    }

    toast.success(`${banDialog.userName} zablokowany do ${format(until, "dd.MM.yyyy HH:mm", { locale: pl })}`);
    setBanDialog({ open: false, userId: "", userName: "" });
    setBanReason("");
    setBanDuration("1h");
  };

  const sendMessage = async () => {
    if (!user || !activeChannel || !newMessage.trim()) return;
    if (isBanned) {
      toast.error(`Masz blokadę czatu do ${bannedUntil ? format(new Date(bannedUntil), "dd.MM.yyyy HH:mm", { locale: pl }) : "?"}`);
      return;
    }
    setSending(true);
    const { error } = await supabase.from("group_messages").insert({
      channel_id: activeChannel,
      sender_id: user.id,
      content: newMessage.trim(),
    } as any);
    if (error) {
      // Could be ban applied mid-session
      toast.error("Nie udało się wysłać wiadomości");
    }
    setNewMessage("");
    setSending(false);
  };

  const getChannelIcon = (ch: Channel) => {
    if (ch.channel_type === "admin") return <Lock className="h-3 w-3 text-primary" />;
    if (ch.channel_type === "league") return <Trophy className="h-3 w-3 text-accent" />;
    if (ch.channel_type === "platform") return <Monitor className="h-3 w-3 text-secondary" />;
    return <Hash className="h-3 w-3 text-muted-foreground" />;
  };

  const onDragStart = (event: React.PointerEvent) => {
    if (isMobile) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: position.x,
      startTop: position.y,
    };
    setDragging(true);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onResizeStart = (event: React.PointerEvent) => {
    if (isMobile) return;
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
    setResizing(true);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };


  const activeChannelData = channels.find((c) => c.id === activeChannel);

  const containerStyle: React.CSSProperties = (isMobile || compact)
    ? {}
    : {
        position: "fixed",
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        zIndex: 50,
      };

  if (channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-body py-8">
        Brak dostępnych kanałów grupowych
      </div>
    );
  }

  const renderSenderLabel = (info: SenderInfo) => {
    if (info.nick) {
      return (
        <>
          {info.name} <span className="text-muted-foreground font-normal">({info.nick})</span>
        </>
      );
    }
    return info.name;
  };

  return (
      <div
        style={containerStyle}
        className={`${compact ? 'flex flex-col h-full' : 'rounded-lg border border-border bg-card shadow-lg'} overflow-hidden ${isMobile ? "relative" : ""}`}
      >
        {!isMobile && !compact && (
          <div className="relative flex items-center justify-between gap-2 px-3 py-2 bg-background/70 border-b border-border">
            <div
              className="flex items-center gap-2 cursor-move"
              onPointerDown={onDragStart}
            >
              <span className="text-xs font-display font-semibold">Czat</span>
              <span className="text-[10px] text-muted-foreground">(przeciągnij)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSize({ width: 540, height: 520 })}
              >
                Reset
              </button>
              <div
                className="h-4 w-4 cursor-se-resize text-muted-foreground hover:text-foreground"
                onPointerDown={onResizeStart}
              >
                <span className="block w-full h-full" />
              </div>
            </div>
          </div>
        )}

        <div
          className={`flex${compact ? " flex-1 min-h-0" : isMobile ? " h-[calc(100vh-260px)] min-h-[400px]" : " h-full"} gap-0 overflow-hidden${isMobile ? " relative" : ""}`}
        >
          <div className={`flex ${compact ? 'flex-1 min-h-0' : 'min-h-[400px]'}`}>
            {/* Channel sidebar */}
            <div className={`${compact ? "w-36" : "w-48"} border-r border-border flex flex-col shrink-0 h-full${isMobile ? ` fixed left-0 top-0 bottom-0 z-50 w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 bg-gradient-to-b from-card via-card to-background shadow-2xl border-r-2 border-primary/20` : ' bg-muted/10'}`}>
              {isMobile && (
                <div className="p-3 border-b border-primary/20 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between">
                  <span className="font-display text-sm uppercase tracking-wider text-foreground font-bold">Kanały czatu</span>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-md hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {!isMobile && (
                <div className="p-2 border-b border-border">
                  <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">Kanały</span>
                </div>
              )}
              <ScrollArea className="flex-1">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => { setActiveChannel(ch.id); if (isMobile) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2 ${isMobile ? 'px-3 py-2.5' : 'px-2 py-1.5'} text-left transition-colors ${isMobile ? 'text-sm' : 'text-xs'} font-body${activeChannel === ch.id ? " bg-primary/10 text-primary border-l-2 border-primary" : " hover:bg-muted/30 text-foreground border-l-2 border-transparent"}`}
                  >
                    {getChannelIcon(ch)}
                    <div className="min-w-0 flex-1">
                      <span className="truncate block">{ch.name}</span>
                      {isMobile && ch.description && (
                        <span className="text-[10px] text-muted-foreground truncate block">{ch.description}</span>
                      )}
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </div>

            {/* Messages area */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <div className="flex-1 flex flex-col min-w-0 h-full">
                {activeChannelData && (
                  <div className="p-2 border-b border-border flex items-center gap-2">
                    {isMobile && (
                      <Button onClick={() => setIsSidebarOpen(true)} variant="ghost" size="sm">
                        <Menu className="h-4 w-4" />
                      </Button>
                    )}
                    {getChannelIcon(activeChannelData)}
                    <span className="font-display font-bold text-foreground text-sm">{activeChannelData.name}</span>
                    {activeChannelData.description && (
                      <span className="text-[10px] text-muted-foreground font-body ml-auto hidden sm:block truncate max-w-[200px]">{activeChannelData.description}</span>
                    )}
                  </div>
                )}

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {messages.map((m) => {
                    const isMine = m.sender_id === user?.id;
                    const info = senderInfos[m.sender_id] || { name: "..." };
                    return (
                      <div key={m.id} className="flex flex-col">
                        <span className={`text-[10px] font-display font-bold mb-0.5 ${isMine ? "text-right mr-8 text-primary/70" : "ml-8 text-primary"}`}>
                          {renderSenderLabel(info)}
                        </span>
                        <div className={`group flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                          {!isMine && (
                            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[8px] font-display font-bold text-primary overflow-hidden shrink-0">
                              {info.avatar_url ? (
                                <img src={info.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                info.avatar || "??"
                              )}
                            </div>
                          )}
                          {canModerate && isMine && (
                            <button onClick={() => deleteMessage(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-destructive hover:text-destructive/80" title="Usuń wiadomość">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                          <div className={`max-w-[80%] rounded-lg px-3 py-1.5${isMine ? " bg-primary text-primary-foreground" : " bg-muted/50 text-foreground border border-border"}`}>
                            <p className="text-sm font-body whitespace-pre-wrap break-words">{m.content}</p>
                            <p className={`text-[10px] mt-0.5${isMine ? " text-primary-foreground/70" : " text-muted-foreground"}`}>
                              {(() => {
                                const d = new Date(m.created_at);
                                if (isToday(d)) return format(d, "HH:mm", { locale: pl });
                                if (isYesterday(d)) return `wczoraj ${format(d, "HH:mm", { locale: pl })}`;
                                return format(d, "dd.MM HH:mm", { locale: pl });
                              })()}
                            </p>
                          </div>
                          {isMine && (
                            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[8px] font-display font-bold text-primary overflow-hidden shrink-0">
                              {info.avatar_url ? (
                                <img src={info.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                info.avatar || "??"
                              )}
                            </div>
                          )}
                          {canModerate && !isMine && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              <button onClick={() => deleteMessage(m.id)} className="p-0.5 text-destructive hover:text-destructive/80" title="Usuń wiadomość">
                                <Trash2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setBanDialog({ open: true, userId: m.sender_id, userName: info.name })}
                                className="p-0.5 text-orange-500 hover:text-orange-400"
                                title="Zablokuj użytkownika"
                              >
                                <Ban className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-8 font-body">
                      Brak wiadomości — napisz pierwszą!
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-2 border-t border-border">
                {isBanned ? (
                  <div className="flex items-center gap-2 text-xs text-destructive font-body px-2 py-1">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Blokada czatu do {bannedUntil ? format(new Date(bannedUntil), "dd.MM.yyyy HH:mm", { locale: pl }) : "?"}</span>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-1.5">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Napisz wiadomość..."
                      className={`bg-muted/30 border-border ${compact ? "text-xs h-7" : "text-sm h-8"}`}
                      maxLength={1000}
                    />
                    <Button type="submit" variant="hero" size="icon" className={compact ? "h-7 w-7 shrink-0" : "h-8 w-8 shrink-0"} disabled={sending || !newMessage.trim()}>
                      <Send className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Backdrop for mobile sidebar */}
      {isMobile && isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />}

      {/* Ban dialog */}
      <Dialog open={banDialog.open} onOpenChange={(open) => !open && setBanDialog({ open: false, userId: "", userName: "" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-orange-500" />
              Zablokuj: {banDialog.userName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-body text-muted-foreground mb-1 block">Czas blokady</label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 godzina</SelectItem>
                  <SelectItem value="6h">6 godzin</SelectItem>
                  <SelectItem value="24h">24 godziny</SelectItem>
                  <SelectItem value="3d">3 dni</SelectItem>
                  <SelectItem value="7d">7 dni</SelectItem>
                  <SelectItem value="30d">30 dni</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-body text-muted-foreground mb-1 block">Powód (opcjonalnie)</label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Np. spam, obraźliwe treści..."
                className="h-20 text-sm"
                maxLength={300}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialog({ open: false, userId: "", userName: "" })}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleBanUser}>
              <Ban className="h-3.5 w-3.5 mr-1" /> Zablokuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>    </div>  );
};

export default GroupChat;
