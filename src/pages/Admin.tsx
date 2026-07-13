import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, Trash2, ShieldCheck, ExternalLink, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Role = "admin" | "user";
interface UserRow { id: string; email: string | null; display_name: string | null; roles: Role[] }
interface UsageRow { id: string; feature: string; model: string | null; status: string; duration_ms: number | null; created_at: string; user_id: string | null }
interface SavedRow { id: string; name: string; image_url: string; parts: unknown; created_at: string }
interface ChatMsg { role: "user" | "assistant"; content: string }

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "users";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
        </div>

        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
          <TabsList className="grid grid-cols-4 max-w-2xl">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="chat">AI Chat</TabsTrigger>
            <TabsTrigger value="saved">Saved Furniture</TabsTrigger>
            <TabsTrigger value="usage">AI Usage</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-6"><UsersPanel /></TabsContent>
          <TabsContent value="chat" className="mt-6"><ChatPanel /></TabsContent>
          <TabsContent value="saved" className="mt-6"><SavedPanel /></TabsContent>
          <TabsContent value="usage" className="mt-6"><UsagePanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ---------- Users ----------
function UsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const byId = new Map<string, UserRow>();
    profiles?.forEach((p) => byId.set(p.id, { ...p, roles: [] }));
    roles?.forEach((r) => byId.get(r.user_id)?.roles.push(r.role as Role));
    setRows(Array.from(byId.values()));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin removed");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Promoted to admin");
    }
    load();
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />;
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground mb-4">
        New signups default to <strong>user</strong>. Promote trusted people to <strong>admin</strong>.
        Only admins get access to chat, this dashboard, and saving verified furniture.
      </p>
      <div className="space-y-2">
        {rows.map((u) => {
          const isAdmin = u.roles.includes("admin");
          return (
            <div key={u.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <div className="font-medium">{u.display_name || u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "Admin" : "User"}</Badge>
                <Button size="sm" variant="outline" onClick={() => toggleAdmin(u.id, isAdmin)}>
                  {isAdmin ? "Demote" : "Make admin"}
                </Button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}
      </div>
    </Card>
  );
}

// ---------- AI Chat ----------
function ChatPanel() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("chat_messages").select("role,content").order("created_at").then(({ data }) => {
      if (data) setMessages(data as ChatMsg[]);
    });
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    await supabase.from("chat_messages").insert({ user_id: session!.user.id, role: "user", content: text });

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify({ messages: next }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      const reply = data.reply as string;
      setMessages([...next, { role: "assistant", content: reply }]);
      await supabase.from("chat_messages").insert({ user_id: session!.user.id, role: "assistant", content: reply });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    await supabase.from("chat_messages").delete().eq("user_id", session!.user.id);
    setMessages([]);
  };

  return (
    <Card className="p-4 flex flex-col h-[70vh]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary" /> AI Assistant (admin-only)
        </div>
        <Button size="sm" variant="ghost" onClick={clear}><Trash2 className="w-4 h-4 mr-1" /> Clear</Button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask the assistant about a bad customization, why a part was mis-detected, or how to word a better prompt.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={m.role === "user"
              ? "bg-primary text-primary-foreground px-3 py-2 rounded-lg max-w-[80%] text-sm"
              : "text-sm prose prose-sm max-w-none dark:prose-invert"}>
              {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground">Thinking…</div>}
      </div>
      <div className="flex gap-2 mt-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a mis-customized furniture, prompt tips, etc."
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button onClick={send} disabled={busy || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

// ---------- Saved furniture ----------
function SavedPanel() {
  const [rows, setRows] = useState<SavedRow[]>([]);
  const load = async () => {
    const { data } = await supabase.from("saved_furniture").select("*").order("created_at", { ascending: false });
    if (data) setRows(data as SavedRow[]);
  };
  useEffect(() => { load(); }, []);
  const del = async (id: string) => {
    await supabase.from("saved_furniture").delete().eq("id", id);
    toast.success("Removed");
    load();
  };
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground mb-4">
        Verified furniture analyses. When someone uploads the same photo, the app reuses the saved parts instead of re-running AI segmentation.
      </p>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing saved yet. In the Customizer, after a correct customization, click <strong>Save as verified</strong>.</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {rows.map((r) => {
          const partCount = Array.isArray(r.parts) ? (r.parts as unknown[]).length : 0;
          return (
            <div key={r.id} className="border border-border rounded-lg overflow-hidden">
              <img src={r.image_url} alt={r.name} className="w-full h-32 object-cover" />
              <div className="p-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{partCount} parts</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- AI Usage ----------
function UsagePanel() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  useEffect(() => {
    supabase.from("ai_usage_log").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => data && setRows(data as UsageRow[]));
  }, []);
  const byFeature = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.feature] = (acc[r.feature] ?? 0) + 1; return acc;
  }, {});
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Credits & Top-up</h3>
          <a href="https://lovable.dev/pricing" target="_blank" rel="noreferrer"
             className="text-sm text-primary hover:underline flex items-center gap-1">
            Manage credits <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-sm text-muted-foreground">
          AI Gateway usage is billed against your Lovable workspace credits. When credits run low the AI features return a 402 error — top up in
          <strong> Settings → Plans & credits</strong> or click the link above.
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Calls by feature (last 200)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(byFeature).map(([f, n]) => (
            <div key={f} className="p-3 rounded border border-border">
              <div className="text-xs uppercase text-muted-foreground">{f}</div>
              <div className="text-2xl font-bold">{n}</div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No usage recorded yet.</p>}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Recent activity</h3>
        <div className="space-y-1 max-h-80 overflow-auto text-xs font-mono">
          {rows.slice(0, 100).map((r) => (
            <div key={r.id} className="flex justify-between border-b border-border/50 py-1">
              <span>{new Date(r.created_at).toLocaleString()}</span>
              <span>{r.feature}</span>
              <span className="text-muted-foreground">{r.model ?? "-"}</span>
              <span className={r.status === "success" ? "text-primary" : "text-destructive"}>{r.status}</span>
              <span>{r.duration_ms ?? "-"}ms</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
