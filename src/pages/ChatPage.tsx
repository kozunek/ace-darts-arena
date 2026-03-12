import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, ArrowLeft, Users, Search, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Link, useSearchParams } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import { pl } from "date-fns/locale";

interface ChatContact {
  user_id: string;
  name: string;
  avatar: string;
  unread: number;
  lastMessage?: string;
  lastTime?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const ChatPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [allPlayers, setAllPlayers] = useState<{ user_id: string; name: string; avatar: string }[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialOpenDone = useRef(false);

  useEffect(() => {
    if (!user) return;
    loadContacts();
    loadAllPlayers();
  }, [user]);

  // Auto-open chat from URL param ?with=user_id
  useEffect(() => {
    if (!user || initialOpenDone.current) return;
    const withUserId = searchParams.get("with");
    if (withUserId) {
      initialOpenDone.current = true;
      loadMessages(withUserId);
    }
  }, [user, searchParams]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          if (activeChat && (msg.sender_id === activeChat || msg.receiver_id === activeChat)) {
            setMessages((prev) => [...prev, msg]);
            if (msg.receiver_id === user.id) {
              supabase.from("chat_messages").update({ is_read: true }).eq("id", msg.id).then();
            }
          }
          loadContacts();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAllPlayers = async () => {
    const { data } = await supabase.from("players").select("user_id, name, avatar").not("user_id", "is", null);
    if (data) setAllPlayers(data.filter((p) => p.user_id !== user?.id) as any);
  };

  const loadContacts = async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!msgs || msgs.length === 0) { setContacts([]); return; }

    const contactMap = new Map<string, { lastMsg: string; lastTime: string; unread: number }>();
    msgs.forEach((m) => {
      const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!contactMap.has(otherId)) {
        contactMap.set(otherId, { lastMsg: m.content, lastTime: m.created_at, unread: 0 });
      }
      if (m.receiver_id === user.id && !m.is_read) {
        const c = contactMap.get(otherId)!;
        c.unread++;
      }
    });

    const contactIds = [...contactMap.keys()];
    const { data: players } = await supabase.from("players").select("user_id, name, avatar").in("user_id", contactIds);

    const contactList: ChatContact[] = contactIds.map((uid) => {
      const p = players?.find((pl) => pl.user_id === uid);
      const c = contactMap.get(uid)!;
      return {
        user_id: uid,
        name: p?.name || "Nieznany",
        avatar: p?.avatar || "??",
        unread: c.unread,
        lastMessage: c.lastMsg,
        lastTime: c.lastTime,
      };
    });

    contactList.sort((a, b) => (b.lastTime || "").localeCompare(a.lastTime || ""));
    setContacts(contactList);
  };

  const loadMessages = async (otherUserId: string) => {
    if (!user) return;
    setActiveChat(otherUserId);
    setShowNewChat(false);

    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    setMessages((data as Message[]) || []);

    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    loadContacts();
  };

  const sendMessage = async () => {
    if (!user || !activeChat || !newMessage.trim()) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: activeChat,
      content: newMessage.trim(),
    });
    setNewMessage("");
    setSending(false);
  };

  const startNewChat = (userId: string) => {
    loadMessages(userId);
  };

  const activeName = contacts.find((c) => c.user_id === activeChat)?.name
    || allPlayers.find((p) => p.user_id === activeChat)?.name
    || "Czat";

  // Filter contacts and players by search query
  const q = searchQuery.toLowerCase();
  const filteredContacts = q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
  const filteredNewPlayers = allPlayers
    .filter((p) => !contacts.find((c) => c.user_id === p.user_id))
    .filter((p) => !q || p.name.toLowerCase().includes(q));

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Wymagane logowanie</h1>
        <p className="text-muted-foreground font-body mb-4">Zaloguj się, aby korzystać z czatu.</p>
        <Link to="/login"><Button variant="hero">Zaloguj się</Button></Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Czat" subtitle="Prywatne wiadomości z innymi graczami" />
      <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-260px)] min-h-[400px]">
        {/* Contact list */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="font-display text-sm uppercase tracking-wider text-muted-foreground">Rozmowy</span>
            <Button variant="ghost" size="sm" onClick={() => setShowNewChat(!showNewChat)}>
              <Users className="h-4 w-4" />
            </Button>
          </div>
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj gracza..."
                className="pl-8 h-8 text-sm bg-muted/30 border-border"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {(showNewChat || (q && filteredNewPlayers.length > 0)) && (
              <div className="p-2 border-b border-border bg-muted/20">
                <p className="text-xs font-display uppercase text-muted-foreground mb-2 px-2">
                  {q ? "Wyniki wyszukiwania" : "Nowa rozmowa"}
                </p>
                {filteredNewPlayers.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => startNewChat(p.user_id!)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary">
                      {p.avatar}
                    </div>
                    <span className="font-body text-sm text-foreground">{p.name}</span>
                  </button>
                ))}
                {filteredNewPlayers.length === 0 && q && (
                  <p className="text-xs text-muted-foreground px-2 py-1">Nie znaleziono gracza</p>
                )}
              </div>
            )}
            {filteredContacts.map((c) => (
              <button
                key={c.user_id}
                onClick={() => loadMessages(c.user_id)}
                className={`w-full flex items-center gap-3 p-3 border-b border-border/50 hover:bg-muted/30 transition-colors text-left ${activeChat === c.user_id ? "bg-muted/40" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-display font-bold text-primary shrink-0">
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-body font-semibold text-sm text-foreground">{c.name}</span>
                    {c.unread > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  {c.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                  )}
                </div>
              </button>
            ))}
            {filteredContacts.length === 0 && !showNewChat && !q && (
              <div className="p-6 text-center text-muted-foreground text-sm font-body">
                Brak rozmów. Kliknij <Users className="h-3.5 w-3.5 inline" /> aby rozpocząć.
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Messages */}
        <div className="md:col-span-2 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          {activeChat ? (
            <>
              <div className="p-3 border-b border-border flex items-center gap-3">
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setActiveChat(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-display font-bold text-foreground flex-1">{activeName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-7 px-2"
                  onClick={async () => {
                    if (!user || !activeChat) return;
                    if (!confirm("Czy na pewno chcesz usunąć tę rozmowę?")) return;
                    // We can only delete messages we sent
                    // For full clear, delete all messages in this conversation
                    await supabase
                      .from("chat_messages")
                      .delete()
                      .eq("sender_id", user.id)
                      .eq("receiver_id", activeChat);
                    await supabase
                      .from("chat_messages")
                      .delete()
                      .eq("sender_id", activeChat)
                      .eq("receiver_id", user.id);
                    setMessages([]);
                    loadContacts();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((m) => {
                    const isMine = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground border border-border"}`}>
                          <p className="text-sm font-body whitespace-pre-wrap break-words">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {(() => {
                              const d = new Date(m.created_at);
                              if (isToday(d)) return format(d, "HH:mm", { locale: pl });
                              if (isYesterday(d)) return `wczoraj ${format(d, "HH:mm", { locale: pl })}`;
                              return format(d, "dd.MM.yyyy HH:mm", { locale: pl });
                            })()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Napisz wiadomość..."
                    className="bg-muted/30 border-border"
                    maxLength={1000}
                  />
                  <Button type="submit" variant="hero" size="icon" disabled={sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground font-body">
              Wybierz rozmowę lub rozpocznij nową
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default ChatPage;