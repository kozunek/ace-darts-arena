import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, ArrowLeft, Users, Search, X, Hash, Maximize2, Minimize2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { pl } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GroupChat from "@/components/GroupChat";

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

const FloatingChat = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState<"private" | "group">("private");
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [allPlayers, setAllPlayers] = useState<{ user_id: string; name: string; avatar: string }[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const [chatSize, setChatSize] = useState({ width: 384, height: 500 }); // w-96 = 384px
  const [isMaximized, setIsMaximized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadContacts();
    loadAllPlayers();

    // Load chat position and size from localStorage
    const savedPosition = localStorage.getItem(`chat-position-${user.id}`);
    const savedSize = localStorage.getItem(`chat-size-${user.id}`);
    const savedMaximized = localStorage.getItem(`chat-maximized-${user.id}`);

    if (savedPosition) {
      try {
        setChatPosition(JSON.parse(savedPosition));
      } catch (e) {}
    }
    if (savedSize) {
      try {
        setChatSize(JSON.parse(savedSize));
      } catch (e) {}
    }
    if (savedMaximized) {
      setIsMaximized(savedMaximized === 'true');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("floating_chat_realtime")
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

    if (!msgs || msgs.length === 0) { setContacts([]); setTotalUnread(0); return; }

    const contactMap = new Map<string, { lastMsg: string; lastTime: string; unread: number }>();
    let unreadTotal = 0;
    msgs.forEach((m) => {
      const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!contactMap.has(otherId)) {
        contactMap.set(otherId, { lastMsg: m.content, lastTime: m.created_at, unread: 0 });
      }
      if (m.receiver_id === user.id && !m.is_read) {
        contactMap.get(otherId)!.unread++;
        unreadTotal++;
      }
    });
    setTotalUnread(unreadTotal);

    const contactIds = [...contactMap.keys()];
    const { data: players } = await supabase.from("players").select("user_id, name, avatar").in("user_id", contactIds);

    const contactList: ChatContact[] = contactIds.map((uid) => {
      const p = players?.find((pl) => pl.user_id === uid);
      const c = contactMap.get(uid)!;
      return { user_id: uid, name: p?.name || "Nieznany", avatar: p?.avatar || "??", unread: c.unread, lastMessage: c.lastMsg, lastTime: c.lastTime };
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
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
    await supabase.from("chat_messages").update({ is_read: true }).eq("sender_id", otherUserId).eq("receiver_id", user.id).eq("is_read", false);
    loadContacts();
  };

  const sendMessage = async () => {
    if (!user || !activeChat || !newMessage.trim()) return;
    setSending(true);
    await supabase.from("chat_messages").insert({ sender_id: user.id, receiver_id: activeChat, content: newMessage.trim() });
    setNewMessage("");
    setSending(false);
  };

  const saveChatSettings = (position?: { x: number; y: number }, size?: { width: number; height: number }, maximized?: boolean) => {
    if (!user) return;
    if (position) {
      localStorage.setItem(`chat-position-${user.id}`, JSON.stringify(position));
    }
    if (size) {
      localStorage.setItem(`chat-size-${user.id}`, JSON.stringify(size));
    }
    if (maximized !== undefined) {
      localStorage.setItem(`chat-maximized-${user.id}`, maximized.toString());
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const newPosition = { x: info.point.x, y: info.point.y };
    setChatPosition(newPosition);
    saveChatSettings(newPosition);
  };

  const handleResize = (delta: { width: number; height: number }) => {
    const newSize = {
      width: Math.max(300, chatSize.width + delta.width),
      height: Math.max(400, chatSize.height + delta.height)
    };
    setChatSize(newSize);
    saveChatSettings(undefined, newSize);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    saveChatSettings(undefined, undefined, !isMaximized);
  };

  if (!user) return null;

  const activeName = contacts.find((c) => c.user_id === activeChat)?.name || allPlayers.find((p) => p.user_id === activeChat)?.name || "Czat";
  const q = searchQuery.toLowerCase();
  const filteredContacts = q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
  const filteredNewPlayers = allPlayers.filter((p) => !contacts.find((c) => c.user_id === p.user_id)).filter((p) => !q || p.name.toLowerCase().includes(q));

  return (
    <>
      <button
        onClick={handleToggle}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && !isMobile && (
          <motion.div
            drag
            dragMomentum={false}
            dragConstraints={{ left: 0, top: 0, right: window.innerWidth - (isMaximized ? window.innerWidth : chatSize.width), bottom: window.innerHeight - (isMaximized ? window.innerHeight : chatSize.height) }}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              x: isMaximized ? 0 : chatPosition.x,
              y: isMaximized ? 0 : chatPosition.y,
              width: isMaximized ? '100vw' : chatSize.width,
              height: isMaximized ? '100vh' : chatSize.height
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed z-50 rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden ${isMaximized ? 'top-0 left-0' : 'bottom-24 right-5'}`}
            style={{
              width: isMaximized ? '100vw' : chatSize.width,
              height: isMaximized ? '100vh' : chatSize.height,
              cursor: 'move'
            }}
          >
            {/* Header with controls */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
              <div className="flex border-b border-border bg-muted/30">
                <button
                  onClick={() => { setChatMode("private"); setActiveChat(null); }}
                  className={`px-3 py-1 text-xs font-display uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${chatMode === "private" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <MessageCircle className="h-3 w-3" /> Prywatne
                </button>
                <button
                  onClick={() => { setChatMode("group"); setActiveChat(null); }}
                  className={`px-3 py-1 text-xs font-display uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${chatMode === "group" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Hash className="h-3 w-3" /> Grupowe
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={toggleMaximize} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {chatMode === "group" ? (
              <GroupChat compact />
            ) : (
              <>
                {/* Header for private chat */}
                {activeChat && (
                  <div className="p-2 border-b border-border flex items-center gap-2 bg-muted/20">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setActiveChat(null)}>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="font-display font-bold text-foreground text-xs flex-1">{activeName}</span>
                  </div>
                )}

                {activeChat ? (
                  <>
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-2">
                        {messages.map((m) => {
                          const isMine = m.sender_id === user.id;
                          return (
                            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
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
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="p-2 border-t border-border">
                      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-1.5">
                        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Napisz..." className="bg-muted/30 border-border text-sm h-8" maxLength={1000} />
                        <Button type="submit" variant="hero" size="icon" className="h-8 w-8 shrink-0" disabled={sending || !newMessage.trim()}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 border-b border-border flex items-center gap-1">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Szukaj..." className="pl-7 h-7 text-xs bg-muted/30 border-border" />
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowNewChat(!showNewChat)}>
                        <Users className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      {(showNewChat || (q && filteredNewPlayers.length > 0)) && (
                        <div className="p-2 border-b border-border bg-muted/20">
                          <p className="text-[10px] font-display uppercase text-muted-foreground mb-1 px-1">Nowa rozmowa</p>
                          {filteredNewPlayers.map((p) => (
                            <button key={p.user_id} onClick={() => loadMessages(p.user_id!)} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 transition-colors text-left">
                              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-display font-bold text-primary">{p.avatar}</div>
                              <span className="font-body text-xs text-foreground">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {filteredContacts.map((c) => (
                        <button key={c.user_id} onClick={() => loadMessages(c.user_id)} className="w-full flex items-center gap-2.5 p-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors text-left">
                          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary shrink-0">{c.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-body font-semibold text-xs text-foreground">{c.name}</span>
                              {c.unread > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{c.unread}</span>}
                            </div>
                            {c.lastMessage && <p className="text-[10px] text-muted-foreground truncate">{c.lastMessage}</p>}
                          </div>
                        </button>
                      ))}
                      {filteredContacts.length === 0 && !showNewChat && !q && (
                        <div className="p-4 text-center text-muted-foreground text-xs font-body">
                          Brak rozmów. Kliknij <Users className="h-3 w-3 inline" /> aby rozpocząć.
                        </div>
                      )}
                    </ScrollArea>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChat;
