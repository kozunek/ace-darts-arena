import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, ArrowLeft, Users } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { pl } from "date-fns/locale";

interface PlayerInfo {
  user_id: string;
  name: string;
  avatar: string;
}

interface ChatPair {
  user1: string;
  user2: string;
  lastMessage: string;
  lastTime: string;
  messageCount: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

const AdminChatPanel = () => {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [chatPairs, setChatPairs] = useState<ChatPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<{ user1: string; user2: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Load all players
    const { data: playersData } = await supabase
      .from("players")
      .select("user_id, name, avatar")
      .not("user_id", "is", null);

    if (playersData) setPlayers(playersData as PlayerInfo[]);

    // Load all chat messages to build conversation pairs
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("sender_id, receiver_id, content, created_at")
      .order("created_at", { ascending: false });

    if (msgs) {
      const pairMap = new Map<string, ChatPair>();
      msgs.forEach((m) => {
        const key = [m.sender_id, m.receiver_id].sort().join("|");
        if (!pairMap.has(key)) {
          const [u1, u2] = key.split("|");
          pairMap.set(key, {
            user1: u1,
            user2: u2,
            lastMessage: m.content,
            lastTime: m.created_at,
            messageCount: 0,
          });
        }
        pairMap.get(key)!.messageCount++;
      });
      setChatPairs(Array.from(pairMap.values()).sort((a, b) => b.lastTime.localeCompare(a.lastTime)));
    }

    setLoading(false);
  };

  const loadConversation = async (user1: string, user2: string) => {
    setSelectedPair({ user1, user2 });

    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`
      )
      .order("created_at", { ascending: true });

    setMessages((data as Message[]) || []);
  };

  const getPlayerName = (userId: string) => players.find((p) => p.user_id === userId)?.name || "Nieznany";
  const getPlayerAvatar = (userId: string) => players.find((p) => p.user_id === userId)?.avatar || "??";

  const q = searchQuery.toLowerCase();
  const filteredPairs = q
    ? chatPairs.filter(
        (p) =>
          getPlayerName(p.user1).toLowerCase().includes(q) ||
          getPlayerName(p.user2).toLowerCase().includes(q)
      )
    : chatPairs;

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground font-body">
        Ładowanie czatów...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" /> Czaty graczy
      </h2>
      <p className="text-sm text-muted-foreground font-body">
        Przeglądaj rozmowy między graczami. Łącznie {chatPairs.length} konwersacji.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px]">
        {/* Conversation list */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
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
            {filteredPairs.length === 0 && (
              <div className="p-6 text-center text-muted-foreground text-sm font-body">
                {q ? "Nie znaleziono rozmów" : "Brak rozmów w systemie"}
              </div>
            )}
            {filteredPairs.map((pair) => {
              const isActive =
                selectedPair &&
                [pair.user1, pair.user2].sort().join("|") ===
                  [selectedPair.user1, selectedPair.user2].sort().join("|");
              return (
                <button
                  key={`${pair.user1}-${pair.user2}`}
                  onClick={() => loadConversation(pair.user1, pair.user2)}
                  className={`w-full flex items-center gap-3 p-3 border-b border-border/50 hover:bg-muted/30 transition-colors text-left ${
                    isActive ? "bg-muted/40" : ""
                  }`}
                >
                  <div className="flex -space-x-2 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-display font-bold text-primary z-10">
                      {getPlayerAvatar(pair.user1)}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-accent/20 border-2 border-card flex items-center justify-center text-[10px] font-display font-bold text-accent">
                      {getPlayerAvatar(pair.user2)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-body font-semibold text-xs text-foreground truncate">
                        {getPlayerName(pair.user1)} ↔ {getPlayerName(pair.user2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-body shrink-0 ml-1">
                        {pair.messageCount}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{pair.lastMessage}</p>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </div>

        {/* Messages */}
        <div className="md:col-span-2 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          {selectedPair ? (
            <>
              <div className="p-3 border-b border-border flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setSelectedPair(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Users className="h-4 w-4 text-primary" />
                <span className="font-display font-bold text-foreground text-sm">
                  {getPlayerName(selectedPair.user1)} ↔ {getPlayerName(selectedPair.user2)}
                </span>
                <span className="text-xs text-muted-foreground ml-auto font-body">
                  {messages.length} wiadomości
                </span>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((m) => {
                    const senderName = getPlayerName(m.sender_id);
                    return (
                      <div key={m.id} className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-display font-bold text-primary">
                            {senderName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-body">
                            {(() => {
                              const d = new Date(m.created_at);
                              if (isToday(d)) return format(d, "HH:mm", { locale: pl });
                              if (isYesterday(d)) return `wczoraj ${format(d, "HH:mm", { locale: pl })}`;
                              return format(d, "dd.MM.yyyy HH:mm", { locale: pl });
                            })()}
                          </span>
                        </div>
                        <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 max-w-[85%]">
                          <p className="text-sm font-body whitespace-pre-wrap break-words text-foreground">
                            {m.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8 font-body">
                      Brak wiadomości
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground font-body text-sm">
              Wybierz rozmowę z listy po lewej
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChatPanel;
