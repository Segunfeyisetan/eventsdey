import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: messages } = useQuery<any[]>({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  if (!authLoading && !user) {
    return null;
  }

  const hasMessages = messages && messages.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16 flex flex-col">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-serif font-bold mb-4" data-testid="text-messages-title">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-9 bg-card border-border rounded-xl"
            data-testid="input-search-messages"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {hasMessages ? (
          messages.map((msg: any) => (
            <div key={msg.id} className="flex items-start gap-4 p-4 hover:bg-secondary cursor-pointer transition-colors border-b border-border last:border-0" data-testid={`card-message-${msg.id}`}>
              <Avatar className="h-12 w-12 border border-border">
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {msg.fromUserId === user?.id ? "Y" : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold truncate">Conversation</h3>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
                <p className="text-sm line-clamp-2 text-muted-foreground">{msg.body}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg mb-2">No messages yet</p>
            <p className="text-sm">Messages from venue hosts will appear here</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
