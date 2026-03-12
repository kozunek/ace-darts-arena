import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Hash, Lock, Globe, Trophy, Monitor, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { pl } from "date-fns/locale";

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

interface GroupChatProps {
  compact?: boolean;
}

const GroupChat = ({ compact = false }: GroupChatProps) => {
  const { user, isAdmin, isModerator } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userCustomRoleIds, setUserCustomRoleIds] = useState<string[]>([]);
  const [channelRoles, setChannelRoles] = useState<{ channel_id: string; role_id: string }[]>([]);
  const [channelSystemRoles, setChannelSystemRoles] = useState<{ channel_id: string; system_role: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Filter channels user has access to
    const accessible = allChannels.filter((ch) => {
      if (isAdmin) return true;

      const chSysRoles = csr.filter((x) => x.channel_id === ch.id).map((x) => x.system_role);
      const chCustomRoles = cr.filter((x) => x.channel_id === ch.id).map((x) => x.role_id);

      // If no roles assigned, channel is open to all authenticated
      if (chSysRoles.length === 0 && chCustomRoles.length === 0) return true;

      // Check system roles
      if (chSysRoles.some((sr) => sysRoles.includes(sr))) return true;
      if (isModerator && chSysRoles.includes("moderator")) return true;

      // Check custom roles
      if (chCustomRoles.some((crid) => customRoleIds.includes(crid))) return true;

      return false;
    });

    setChannels(accessible);
    if (accessible.length > 0 && !activeChannel) {
      setActiveChannel(accessible[0].id);
    }
  }, [user, isAdmin, isModerator, activeChannel]);

  useEffect(() => { loadAccessData(); }, [loadAccessData]);

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

      // Load sender names
      const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", senderIds);
        const names: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { names[p.user_id] = p.name; });
        setSenderNames((prev) => ({ ...prev, ...names }));
      }
    };
    loadMsgs();
  }, [activeChannel]);

  // Realtime
  useEffect(() => {
    if (!activeChannel) return;
    const channel = supabase
      .channel(`group_chat_${activeChannel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `channel_id=eq.${activeChannel}` }, async (payload) => {
        const msg = payload.new as GroupMessage;
        setMessages((prev) => [...prev, msg]);
        if (!senderNames[msg.sender_id]) {
          const { data } = await supabase.from("profiles").select("user_id, name").eq("user_id", msg.sender_id).maybeSingle();
          if (data) setSenderNames((prev) => ({ ...prev, [data.user_id]: data.name }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChannel, senderNames]);

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

  const sendMessage = async () => {
    if (!user || !activeChannel || !newMessage.trim()) return;
    setSending(true);
    await supabase.from("group_messages").insert({
      channel_id: activeChannel,
      sender_id: user.id,
      content: newMessage.trim(),
    } as any);
    setNewMessage("");
    setSending(false);
  };

  const getChannelIcon = (ch: Channel) => {
    if (ch.channel_type === "admin") return <Lock className="h-3 w-3 text-primary" />;
    if (ch.channel_type === "league") return <Trophy className="h-3 w-3 text-accent" />;
    if (ch.channel_type === "platform") return <Monitor className="h-3 w-3 text-secondary" />;
    return <Hash className="h-3 w-3 text-muted-foreground" />;
  };

  const activeChannelData = channels.find((c) => c.id === activeChannel);

  if (channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-body py-8">
        Brak dostępnych kanałów grupowych
      </div>
    );
  }

  return (
    <div className={`flex ${compact ? "h-full" : "h-[calc(100vh-260px)] min-h-[400px]"} gap-0 rounded-lg border border-border bg-card overflow-hidden`}>
      {/* Channel sidebar */}
      <div className={`${compact ? "w-36" : "w-48"} border-r border-border flex flex-col bg-muted/10 shrink-0`}>
        <div className="p-2 border-b border-border">
          <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">Kanały</span>
        </div>
        <ScrollArea className="flex-1">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors text-xs font-body ${
                activeChannel === ch.id ? "bg-primary/10 text-primary border-l-2 border-primary" : "hover:bg-muted/30 text-foreground border-l-2 border-transparent"
              }`}
            >
              {getChannelIcon(ch)}
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannelData && (
          <div className="p-2 border-b border-border flex items-center gap-2">
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
              const senderName = senderNames[m.sender_id] || "...";
              return (
                <div key={m.id} className="flex flex-col">
                  {!isMine && (
                    <span className="text-[10px] font-display font-bold text-primary mb-0.5 ml-1">{senderName}</span>
                  )}
                  <div className={`group flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    {(isAdmin || isModerator) && isMine && (
                      <button onClick={() => deleteMessage(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-destructive hover:text-destructive/80" title="Usuń wiadomość">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    <div className={`max-w-[80%] rounded-lg px-3 py-1.5 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground border border-border"}`}>
                      <p className="text-sm font-body whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {(() => {
                          const d = new Date(m.created_at);
                          if (isToday(d)) return format(d, "HH:mm", { locale: pl });
                          if (isYesterday(d)) return `wczoraj ${format(d, "HH:mm", { locale: pl })}`;
                          return format(d, "dd.MM HH:mm", { locale: pl });
                        })()}
                      </p>
                    </div>
                    {(isAdmin || isModerator) && !isMine && (
                      <button onClick={() => deleteMessage(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-destructive hover:text-destructive/80" title="Usuń wiadomość">
                        <Trash2 className="h-3 w-3" />
                      </button>
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
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
