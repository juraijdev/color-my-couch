import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not set");

    const body = await req.json();
    const image = body.image;
    if (!image) {
      return new Response(JSON.stringify({ error: "image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a background removal tool. Your ONLY task is to remove the entire background from this furniture product photo and return a PNG with a fully TRANSPARENT background.

ABSOLUTE IRON-CLAD RULES:

1. PIXEL-PERFECT FURNITURE PRESERVATION: The furniture must appear EXACTLY as in the input — IDENTICAL shape, silhouette, outline, edges, contours, curves, angles, proportions, dimensions, color, material, texture, pattern, grain, finish, shading, highlights, and shadows ON the furniture itself. Do NOT redraw, regenerate, reinterpret, restyle, smooth, sharpen, or modify the furniture in ANY way.

2. ZERO STRUCTURAL CHANGES: Do NOT add, remove, reshape, resize, rotate, recolor, or alter any part of the furniture. Every leg, panel, handle, shelf, divider, trim strip, lip, edge cap, and caster must stay identical.

3. FULL TRANSPARENT BACKGROUND: Replace EVERYTHING that is not the furniture (walls, floor, props, contact shadow on the floor, environment) with full transparency (alpha = 0). Output a PNG with a real alpha channel — not a white, gray, or checkered fill.

4. CLEAN EDGES: Cut precisely along the true silhouette of the furniture. Preserve fine details and thin parts (legs, handles, trim). Do NOT leave background halos, fringes, or color spill around the furniture.

5. SAME FRAMING AND FULL OBJECT: Keep the same camera angle, perspective, full object size ratio, original canvas orientation, and original aspect ratio. Do NOT zoom in or crop the furniture itself. For wide/landscape/front-view buffet tables, the output must remain wide landscape and must preserve the entire left-to-right width, top surface, legs, front panels, handles, and every edge exactly. Never convert a front-view buffet table into a side view or 3/4 view. The furniture should sit in roughly the same position within the frame, with transparent pixels around it if needed.

6. NO NEW CONTENT: Do NOT add a new background, gradient, drop shadow, reflection, floor, surface, or any decorative element. The area outside the furniture must be 100% transparent.

7. NO ARTISTIC INTERPRETATION: This is a strict mechanical background-removal task. Output the same furniture, isolated, on transparent background.

Output a single PNG image of the furniture with a fully transparent alpha channel. Do not render checkerboard, black, white, dots, or any visible background pattern — those areas must be truly transparent pixels.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const message = aiResult.choices?.[0]?.message;
    let imageUrl: string | null = null;
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const first = message.images[0];
      imageUrl = first.image_url?.url || first.url || null;
    }

    if (!imageUrl) {
      console.log("No image in response:", JSON.stringify(aiResult).substring(0, 1500));
      return new Response(
        JSON.stringify({ error: "Background removal failed. Please try again." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ output: imageUrl, status: "succeeded" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in remove-background function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
