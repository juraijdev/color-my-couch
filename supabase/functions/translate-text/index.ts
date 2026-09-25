import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiConfig } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_NAMES: Record<string, string> = {
  zh: "Simplified Chinese",
  ar: "Arabic",
  id: "Indonesian",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { texts, lang } = await req.json();
    const target = LANG_NAMES[lang];
    if (!target || !Array.isArray(texts) || texts.length === 0) return json({ error: "Invalid request" }, 400);
    const list: string[] = texts.slice(0, 80).map((t: unknown) => String(t).slice(0, 300));

    const aiCfg = getAiConfig();
    const res = await fetch(aiCfg.url, {
      method: "POST",
      headers: aiCfg.headers,
      body: JSON.stringify({
        model: aiCfg.mapModel("google/gemini-2.5-flash"),
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              `You translate short UI strings of a furniture design app into ${target}. ` +
              `Translate the meaning naturally (furniture names, categories, design names, labels). ` +
              `Keep product codes (e.g. SS02, ESR-A090), numbers, emails and brand "LUSHbyGESIGN" unchanged. ` +
              `Return ONLY a JSON array of strings, same length and order as the input.`,
          },
          { role: "user", content: JSON.stringify(list) },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("translate AI error", res.status, t);
      return json({ error: "AI error" }, res.status === 429 || res.status === 402 ? res.status : 500);
    }
    const data = await res.json();
    let content: string = data?.choices?.[0]?.message?.content ?? "[]";
    content = content.replace(/```(?:json)?/g, "").trim();
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    const arr = JSON.parse(content.slice(start, end + 1));
    const out: Record<string, string> = {};
    list.forEach((src, i) => {
      if (typeof arr[i] === "string" && arr[i].trim()) out[src] = arr[i];
    });
    return json({ translations: out });
  } catch (e) {
    console.error("translate-text error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
