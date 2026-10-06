import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiConfig } from "../_shared/ai.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { parseSuggestions, suggestionSchema } from "./response.ts";

interface PartInfo {
  id: string;
  name: string;
  material?: string;
  currentColor?: string;
  description?: string;
}

interface PatternInfo {
  id: string;
  code?: string;
  name: string;
  description?: string;
  category?: string;
}

interface RequestBody {
  backgroundImage: string;
  parts: PartInfo[];
  availablePatterns: PatternInfo[];
}

const requestSchema = z.object({
  backgroundImage: z.string().max(20_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/),
  parts: z.array(z.object({
    id: z.string().min(1).max(200), name: z.string().min(1).max(300),
    material: z.string().max(500).optional(), currentColor: z.string().max(500).optional(),
    description: z.string().max(2000).optional(),
  })).min(1).max(100),
  availablePatterns: z.array(z.object({
    id: z.string().min(1).max(200), name: z.string().min(1).max(300),
    code: z.string().max(100).optional(), description: z.string().max(2000).optional(),
    category: z.string().max(300).optional(),
  })).min(1).max(1500),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Please sign in to suggest colors." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user) return new Response(JSON.stringify({ error: "Please sign in again to suggest colors." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const input = requestSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) {
      return new Response(
        JSON.stringify({ error: "Please provide a room photo, furniture parts, and available finishes.", details: input.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const body: RequestBody = input.data;
    const aiCfg = getAiConfig();

    const partsList = body.parts
      .map(
        (p, i) =>
          `${i + 1}. id="${p.id}" | name="${p.name}" | material="${p.material ?? "unknown"}" | current="${p.currentColor ?? "unknown"}"`,
      )
      .join("\n");

    const patternsList = body.availablePatterns
      .map(
        (pt) =>
          `- id="${pt.id}" | code="${pt.code ?? ""}" | name="${pt.name}" | category="${pt.category ?? ""}" | ${pt.description ?? ""}`,
      )
      .join("\n");

    const systemPrompt = `You are an expert interior designer and furniture stylist.
You will be shown a BACKGROUND ROOM/SCENE photo.
You must recommend a finish for each FURNITURE PART so the customized furniture will look beautiful and harmonious in that room.

STRICT RULES:
1. You may ONLY pick finishes from the AVAILABLE PATTERNS list. Use their exact "id".
2. Pick exactly ONE patternId for EACH part listed.
3. Respect each part's material category when sensible (metal parts → metal finishes like Stainless Steel / Powder Coat; surfaces → wood / stone / quartz; etc.) — but you may break this if it makes a clearly better design.
4. Keep the overall palette cohesive (max 2–3 different materials across all parts). Wood + metal trim is a classic combination.
5. Consider the room's lighting, wall tones, flooring, existing furniture, and overall style (modern, classic, warm, minimal, etc.).
6. Return ONLY valid JSON, no markdown, no commentary.

OUTPUT FORMAT (strict JSON):
{
  "palette": "short 3-6 word palette name",
  "rationale": "1-2 sentence overall reasoning",
  "suggestions": [
    { "partId": "<exact id>", "patternId": "<exact id>", "reason": "short reason" }
  ]
}`;

    const userPrompt = `BACKGROUND SCENE: see attached image.

FURNITURE PARTS TO STYLE (${body.parts.length}):
${partsList}

AVAILABLE PATTERNS (you must choose from these only):
${patternsList}

Return one suggestion per part. Use the exact ids. Keep each reason under 15 words and rationale under 50 words.`;

    for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
    const response = await fetch(aiCfg.url, {
      method: "POST",
      headers: aiCfg.headers,
      body: JSON.stringify({
        model: aiCfg.provider === "gemini"
          ? "gemini-3.8-flash"
          : "openai/gpt-6-astra",
        ...(aiCfg.provider === "gemini" ? { temperature: 0.1, max_tokens: 12000 } : { reasoning_effort: "low" }),
        response_format: {
          type: "json_schema",
          json_schema: { name: "furniture_palette", strict: true, schema: suggestionSchema },
        },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: body.backgroundImage } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status >= 500 && attempt === 0) continue;
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const detail = (() => { try { return JSON.parse(errorText); } catch { return null; } })();
      const safeMessage = detail?.message ?? detail?.error?.message ?? "AI color suggestion is temporarily unavailable. Please try again later.";
      return new Response(JSON.stringify({ error: safeMessage }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const choice = aiResult.choices?.[0];
    if (choice?.message?.refusal || choice?.finish_reason === "content_filter" || choice?.error) {
      return new Response(JSON.stringify({ error: "The AI could not provide suggestions for this image." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const raw = choice?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) throw new Error("The AI returned no color suggestions. Please try again later.");
    try {
    const parsed = parseSuggestions(raw, body.parts.map((part) => part.id), body.availablePatterns.map((pattern) => pattern.id));
    if (choice?.finish_reason === "length") throw new Error("Incomplete suggestion response");
    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
    } catch (parseError) {
      console.warn("Invalid suggestion response", { attempt, finishReason: choice?.finish_reason, error: String(parseError) });
      if (attempt === 1) throw new Error("The AI returned incomplete color suggestions. Please try again.");
    }
    }
    throw new Error("Unable to suggest colors. Please try again.");
  } catch (error) {
    console.error("suggest-colors error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
