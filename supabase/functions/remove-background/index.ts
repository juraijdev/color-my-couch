import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateImageFromMessages } from "../_shared/ai.ts";

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
    const body = await req.json();
    const image = body.image;
    if (!image) {
      return new Response(JSON.stringify({ error: "image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a background cleanup tool. Your ONLY task is to remove the entire original background from this furniture product photo and place the furniture on a plain solid white background (#ffffff). The final image background must be pure white in every non-furniture pixel.

ABSOLUTE IRON-CLAD RULES:

1. PIXEL-PERFECT FURNITURE PRESERVATION: The furniture must appear EXACTLY as in the input — IDENTICAL shape, silhouette, outline, edges, contours, curves, angles, proportions, dimensions, color, material, texture, pattern, grain, finish, shading, highlights, and shadows ON the furniture itself. Do NOT redraw, regenerate, reinterpret, restyle, smooth, sharpen, or modify the furniture in ANY way.

2. ZERO STRUCTURAL CHANGES: Do NOT add, remove, reshape, resize, rotate, recolor, or alter any part of the furniture. Every leg, panel, handle, shelf, divider, trim strip, lip, edge cap, and caster must stay identical.

3. FULL SOLID WHITE BACKGROUND: Replace EVERYTHING that is not the furniture (walls, floor, props, contact shadow on the floor, environment) with plain solid white (#ffffff). Every pixel outside the furniture silhouette must be white. Do NOT use transparency, gray, black, checkerboard, dots, columns, pattern, texture, gradient, floor shadows, reflections, or any visible background design.

4. CLEAN EDGES: Cut precisely along the true silhouette of the furniture. Preserve fine details and thin parts (legs, handles, trim). Do NOT leave background halos, fringes, or color spill around the furniture.

5. SAME FRAMING AND FULL OBJECT: Keep the same camera angle, perspective, full object size ratio, original canvas orientation, and original aspect ratio. Do NOT zoom in or crop the furniture itself. For wide/landscape/front-view buffet tables, the output must remain wide landscape and must preserve the entire left-to-right width, top surface, legs, front panels, handles, and every edge exactly. Never convert a front-view buffet table into a side view or 3/4 view. The furniture should fill the image as much as possible while staying fully visible, with only a little white margin when needed.

6. NO NEW CONTENT: Do NOT add a new scene, gradient, checkerboard, drop shadow, reflection, floor, surface, or any decorative element. The area outside the furniture must be plain white only.

7. NO ARTISTIC INTERPRETATION: This is a strict mechanical background-removal task. Output the same furniture, isolated on pure solid white only.

WHITE BACKGROUND FINAL CHECK: Before returning, inspect the area outside the furniture. If ANY non-furniture pixel is not #ffffff, replace it with #ffffff. Return a single PNG image of the furniture on a clean solid white background. Never render checkerboard, black/gray columns, dots, colored floor, colored wall, gradient, shadows outside the furniture, or transparency preview patterns.`;

    const generation = await generateImageFromMessages({
      model: "google/gemini-3-pro-image-preview",
      temperature: 0,
      logLabel: "white background cleanup image model",
      messageContent: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: image } },
      ],
    });

    if (!generation.output) {
      if (generation.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (generation.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("No image in white-background cleanup response:", generation.error);
      return new Response(
        JSON.stringify({ error: "Background removal failed. Please try again.", details: generation.error || "No content returned" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ output: generation.output, status: "succeeded" }), {
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
