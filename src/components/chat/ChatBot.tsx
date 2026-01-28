import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUPABASE_URL = "https://eezsdibvqiczzfduahts.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenNkaWJ2cWljenpmZHVhaHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTk2MTUsImV4cCI6MjA4MzE5NTYxNX0.sagX7g9oXWUR4LPCBAE6539v7IpegeO6lPv87tndhtE";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Bonjour! Welcome to Lumière. I'm here to help with menu recommendations, reservations, or any questions. How may I assist you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const bookReservation = async (reservationData: Record<string, unknown>): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: { action: "book_reservation", reservationData }
      });

      if (error || data?.error) {
        console.error("Reservation booking failed:", error || data?.error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Reservation error:", e);
      return false;
    }
  };

  const extractAndProcessReservation = async (content: string): Promise<string> => {
    const reservationMatch = content.match(/\[RESERVATION_DATA\](.*?)\[\/RESERVATION_DATA\]/s);
    
    if (reservationMatch) {
      try {
        const reservationData = JSON.parse(reservationMatch[1]);
        const success = await bookReservation(reservationData);

        if (!success) {
          toast.error("Failed to book reservation. Please try again.");
          return content.replace(/\[RESERVATION_DATA\].*?\[\/RESERVATION_DATA\]/s, 
            "\n\n⚠️ I apologize, but there was an issue booking your reservation. Please try again or call us directly.");
        }

        toast.success("Reservation booked successfully!");
        return content.replace(/\[RESERVATION_DATA\].*?\[\/RESERVATION_DATA\]/s, 
          `\n\n✅ **Reservation Confirmed!**\n- Name: ${reservationData.name}\n- Date: ${reservationData.date}\n- Time: ${reservationData.time}\n- Party size: ${reservationData.party_size} guests\n\nYou'll receive a confirmation shortly. À bientôt!`);
      } catch (e) {
        console.error("Failed to parse reservation data:", e);
        return content.replace(/\[RESERVATION_DATA\].*?\[\/RESERVATION_DATA\]/s, "");
      }
    }
    
    return content;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Use fetch directly for streaming support
      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })) 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              assistantMessage += content;
              
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantMessage };
                return updated;
              });
            } catch {
              // Skip unparseable chunks
            }
          }
        }
      }

      // Process any reservation data in the response
      const processedContent = await extractAndProcessReservation(assistantMessage);
      if (processedContent !== assistantMessage) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: processedContent };
          return updated;
        });
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble connecting. Please try again or call us at (555) 123-4567." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (content: string) => {
    // Safe React-based formatting - no dangerouslySetInnerHTML
    const lines = content.split('\n');
    return lines.map((line, lineIndex) => {
      // Split by bold markers and alternate between plain text and strong
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={lineIndex}>
          {parts.map((part, partIndex) => 
            partIndex % 2 === 0 ? part : <strong key={partIndex}>{part}</strong>
          )}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-300 flex items-center justify-center ${isOpen ? "scale-0" : "scale-100"}`}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-background border border-border rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right ${isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50 rounded-t-2xl">
          <div>
            <h3 className="font-semibold text-foreground">Lumière Concierge</h3>
            <p className="text-xs text-muted-foreground">Ask about our menu or book a table</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed">
                    {formatMessage(message.content)}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
