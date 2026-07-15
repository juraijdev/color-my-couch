import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiConfig } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const aiCfg = getAiConfig();

    const body = (await req.json()) as RequestBody;
    if (!body.backgroundImage || !Array.isArray(body.parts) || !Array.isArray(body.availablePatterns)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: backgroundImage, parts, availablePatterns" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

Return one suggestion per part. Use the exact ids.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.4,
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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
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
      throw new Error("AI suggestion failed");
    }

    const aiResult = await response.json();
    const raw: string = aiResult.choices?.[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON in AI response:", raw);
      throw new Error("Could not parse AI suggestions");
    }
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate patternIds exist in availablePatterns; fall back to first match for the part's material if not.
    const validIds = new Set(body.availablePatterns.map((p) => p.id));
    const suggestions = (parsed.suggestions ?? [])
      .filter((s: any) => s && typeof s.partId === "string" && typeof s.patternId === "string")
      .map((s: any) => ({
        partId: s.partId,
        patternId: validIds.has(s.patternId) ? s.patternId : body.availablePatterns[0].id,
        reason: typeof s.reason === "string" ? s.reason : "",
      }));

    return new Response(
      JSON.stringify({
        palette: parsed.palette ?? "Suggested palette",
        rationale: parsed.rationale ?? "",
        suggestions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("suggest-colors error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
