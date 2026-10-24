import { useState, useRef, useEffect } from "react";
import { MessageSquareWand, Send, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  image?: string;
}

interface DesignFixChatProps {
  /** The current generated design image to improve */
  currentImage: string;
  /** The original uploaded furniture photo (ground truth for shape) */
  originalImage: string | null;
  /** Called with the improved image so the parent can replace the design */
  onDesignImproved: (image: string) => void;
  disabled?: boolean;
}

const QUICK_ISSUES = [
  "A color looks wrong",
  "Background is not clean",
  "Shape changed from original",
  "A part was missed",
];

export function DesignFixChat({ currentImage, originalImage, onDesignImproved, disabled }: DesignFixChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isFixing, setIsFixing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isFixing]);

  const sendFeedback = async (text: string) => {
    const feedback = text.trim();
    if (!feedback || isFixing) return;

    setIsOpen(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: feedback }]);
    setIsFixing(true);

    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-design`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            image: currentImage,
            originalImage: originalImage ?? undefined,
            feedback,
            history,
          }),
        },
      );

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to improve the design");
      }
      if (result?.error) throw new Error(result.error);
      if (!result?.output) throw new Error("No improved image received");

      onDesignImproved(result.output);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Here is the improved design. Tell me if anything else needs fixing.", image: result.output },
      ]);

      // Record the feedback so the admin can review common issues (AI learning log)
      supabase.auth.getUser().then(({ data }) => {
        supabase.from("ai_usage_log").insert({
          user_id: data.user?.id,
          feature: "fix-design",
          model: "gemini-3-pro-image",
          status: "success",
          metadata: { feedback },
        });
      });
    } catch (e) {
      console.error("Fix design error:", e);
      const msg = e instanceof Error ? e.message : "Couldn't improve the design. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: `Sorry — ${msg}` }]);
      supabase.auth.getUser().then(({ data }) => {
        supabase.from("ai_usage_log").insert({
          user_id: data.user?.id,
          feature: "fix-design",
          model: "gemini-3-pro-image",
          status: "failed",
          metadata: { feedback, error: msg },
        });
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendFeedback(input);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/40 transition-colors"
      >
        <MessageSquareWand className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Something wrong? Tell the AI</p>
          <p className="text-xs text-muted-foreground truncate">
            Describe the issue — color, background, shape — and get an improved design
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{isOpen ? "Hide" : "Open"}</span>
      </button>

      {isOpen && (
        <div className="border-t border-border">
          {messages.length > 0 && (
            <div ref={scrollRef} className="max-h-64 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs"
                        : "max-w-[85%] rounded-lg bg-muted px-3 py-2 text-xs"
                    }
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.image && (
                      <img src={m.image} alt="Improved design" className="mt-2 rounded-md max-h-28 object-contain bg-white" />
                    )}
                  </div>
                </div>
              ))}
              {isFixing && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-3 py-2 text-xs flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    AI is improving your design... (20-40s)
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.length === 0 && (
            <div className="p-3 pb-0 flex flex-wrap gap-1.5">
              {QUICK_ISSUES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInput(q + ": ")}
                  className="text-[11px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "The top surface color is too dark" or "the leg shape changed"'
              className="min-h-[40px] max-h-28 text-sm resize-none"
              disabled={isFixing || disabled}
              maxLength={1000}
            />
            <Button
              size="icon"
              onClick={() => sendFeedback(input)}
              disabled={isFixing || disabled || input.trim().length < 3}
              title="Send to AI"
            >
              {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          {messages.length > 0 && (
            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={() => setMessages([])}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear chat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
