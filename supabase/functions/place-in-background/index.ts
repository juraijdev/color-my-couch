import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { generateImageFromMessages, getAiConfig } from "../_shared/ai.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const aiCfg = getAiConfig();

    const body = await req.json()

    // Support both old single-image API and new multi-image API
    let furnitureImages: string[] = []
    if (body.furnitureImages && Array.isArray(body.furnitureImages)) {
      furnitureImages = body.furnitureImages
    } else if (body.furnitureImage) {
      furnitureImages = [body.furnitureImage]
    }

    const backgroundImage = body.backgroundImage
    const positionHints: string[] = Array.isArray(body.positionHints) ? body.positionHints : []

    console.log("Place in background request:", {
      furnitureCount: furnitureImages.length,
      hasBackgroundImage: !!backgroundImage,
    })

    if (furnitureImages.length === 0 || !backgroundImage) {
      return new Response(
        JSON.stringify({ error: "At least one furniture image and a background image are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const isMultiple = furnitureImages.length > 1

    // Detect background dimensions to enforce exact aspect ratio in the output
    let bgWidth = 0;
    let bgHeight = 0;
    let bgAspect = "";
    let bgOrientation = "";
    try {
      const m = backgroundImage.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (m) {
        const bin = atob(m[1].slice(0, 4096));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        // PNG
        if (bytes[0] === 0x89 && bytes[1] === 0x50) {
          bgWidth = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
          bgHeight = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
        } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
          // JPEG: scan for SOF marker
          let i = 2;
          while (i < bytes.length - 9) {
            if (bytes[i] !== 0xFF) { i++; continue; }
            const marker = bytes[i + 1];
            const len = (bytes[i + 2] << 8) | bytes[i + 3];
            if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
              bgHeight = (bytes[i + 5] << 8) | bytes[i + 6];
              bgWidth = (bytes[i + 7] << 8) | bytes[i + 8];
              break;
            }
            i += 2 + len;
          }
        }
        if (bgWidth && bgHeight) {
          bgAspect = (bgWidth / bgHeight).toFixed(4);
          bgOrientation = bgWidth > bgHeight ? "LANDSCAPE (wider than tall)" : bgWidth < bgHeight ? "PORTRAIT (taller than wide)" : "SQUARE";
        }
      }
    } catch (e) {
      console.warn("Could not parse background dimensions", e);
    }

    const dimensionsRule = bgWidth && bgHeight
      ? `\n\nBACKGROUND IMAGE EXACT DIMENSIONS — MUST MATCH:\n- Width: ${bgWidth}px\n- Height: ${bgHeight}px\n- Aspect ratio: ${bgAspect} (${bgOrientation})\n- The OUTPUT image MUST have the EXACT SAME aspect ratio (${bgAspect}) and orientation (${bgOrientation}). Do NOT change to square. Do NOT change to a different aspect ratio. Do NOT add letterbox/pillarbox bars. Do NOT crop the background to fit a different ratio.\n`
      : "";

    const positionRule = positionHints.length > 0
      ? `\n\nUSER REPOSITION REQUEST (HIGHEST PRIORITY — MUST FOLLOW):\nThe user was not satisfied with the previous placement and asked to move the furniture. Reposition the furniture in the room to the following zone(s) of the scene: ${positionHints.join(", ").toUpperCase()}.\n- TOP = upper area of the frame / back of the room\n- BOTTOM = lower area of the frame / front of the room\n- LEFT = left side of the room\n- RIGHT = right side of the room\n- CENTER / MIDDLE = centered in the room\nArrange all furniture pieces so they clearly sit in the requested zone(s) while still looking natural, grounded, and proportionate. Preserve every other rule (background, shape, colors, dimensions).\n`
      : "";


    const prompt = (isMultiple
      ? `You are a professional interior design compositor. Your task is to take ALL ${furnitureImages.length} furniture pieces from the provided furniture images and place ALL of them together into the room/scene in the background image.

ABSOLUTE IRON-CLAD RULES — VIOLATION IS UNACCEPTABLE:

1. FULL BACKGROUND PRESERVATION (MOST IMPORTANT): The output image MUST show the COMPLETE, FULL background scene exactly as provided — same framing, same camera position, same composition, same aspect ratio, and same field of view. DO NOT crop, zoom in, pan, tilt, re-frame, or cut off ANY part of the background. Every wall, ceiling, floor, window, door, and existing object visible in the background image must remain visible in the same position in the output. The output's edges/borders must match the background's edges/borders.

2. SAME ASPECT RATIO & DIMENSIONS: The output image must have the SAME aspect ratio and the SAME visible area as the background image. Do NOT change orientation (landscape stays landscape, portrait stays portrait). Do NOT zoom in on the furniture — the room must be shown in full just like the background image.

3. PIXEL-PERFECT FURNITURE PRESERVATION: Each furniture piece must appear EXACTLY as it is in its source image. IDENTICAL shape, silhouette, outline, contours, edges, curves, angles, proportions, dimensions, color, material, texture, pattern, grain, and every single visual detail. Do NOT redraw, reimagine, regenerate, or artistically interpret ANY furniture. Each must be a direct copy-paste — not a recreation. For big/wide/landscape buffet tables, preserve the complete left-to-right width, full top surface, front panels, legs, handles, and every edge with ZERO cropping.

4. ZERO MODIFICATIONS: Do NOT change, add, remove, reshape, resize, stretch, compress, recolor, retexture, smooth, sharpen, stylize, or alter ANY furniture in ANY way. The colors, materials, textures, and finishes of each piece must remain EXACTLY as they are.

5. PLACE ALL ${furnitureImages.length} PIECES — FULLY VISIBLE, IN FRONT: Every single furniture piece provided must appear COMPLETELY visible in the final output — no piece may be cropped by the frame edges, hidden behind walls, or occluded by existing background objects. Leave safe visible margin around every furniture piece. Place ALL pieces in the FOREGROUND of the scene so the customer can clearly see each piece's full shape, colors, and patterns. Do NOT omit any piece. Scale them DOWN if necessary so that all pieces fit naturally inside the existing background frame without requiring the camera to zoom in or crop the room. If existing background objects would block a piece, place the furniture in front of them instead. Blend lighting and shadows naturally so each piece looks like it belongs in the scene.

6. NATURAL ARRANGEMENT: Arrange all furniture pieces naturally in the room as an interior designer would. They should NOT overlap. Space them logically — e.g., chairs near a table, separate items along walls, etc. Use the room's existing layout as a guide. If the room is small relative to the furniture, make the furniture smaller — NEVER crop the room to fit them.

7. PROPORTION MATCHING: Each piece must be scaled to match real-world proportions relative to the room and to each other. Use existing objects (doors, windows, other furniture in the background) as scale references.

8. PLACEMENT RULES for each piece:
   - Correct scale relative to the room AND to other placed furniture
   - Proper grounding on the floor/surface
   - Natural shadows beneath and around each piece
   - Lighting adjusted to match ambient direction and color temperature

9. BACKGROUND PRESERVATION: Do NOT modify, remove, rearrange, recolor, or re-light anything in the background scene. Only ADD the furniture into it. The background pixels outside the furniture must remain identical to the input background.

10. COLOR & DESIGN PRESERVATION: Each furniture piece's colors, materials, textures, patterns, and finishes must be preserved EXACTLY. The only adjustments allowed are lighting/shadow integration.

Output a single photorealistic image showing the COMPLETE original room with ALL furniture pieces naturally placed inside it. The background must NOT be cropped or zoomed in any way.`
      : `You are a professional interior design compositor. Your ONLY task is to take the EXACT furniture from image 1 and place it into the room/scene in the background image.

ABSOLUTE IRON-CLAD RULES — VIOLATION IS UNACCEPTABLE:

1. PIXEL-PERFECT FURNITURE PRESERVATION: The furniture must appear EXACTLY as it is in image 1. IDENTICAL shape, silhouette, outline, contours, edges, curves, angles, proportions, dimensions, color, material, texture, pattern, grain, and every single visual detail. Do NOT redraw, reimagine, regenerate, or artistically interpret the furniture. It must be a direct copy-paste of the furniture — not a recreation. For big/wide/landscape buffet tables, preserve the complete left-to-right width, full top surface, front panels, legs, handles, and every edge with ZERO cropping.

2. ZERO MODIFICATIONS TO FURNITURE: Do NOT change, add, remove, reshape, resize, stretch, compress, rotate the form of, recolor, retexture, smooth, sharpen, stylize, or alter the furniture in ANY way whatsoever. Every leg, panel, handle, shelf, joint, corner, curve, and surface must be IDENTICAL to image 1. The colors, materials, textures, and finishes must remain EXACTLY as they are — do NOT alter them even slightly.

3. NO ARTISTIC INTERPRETATION OF FURNITURE: Do NOT "improve" the furniture, change its style, modernize it, simplify it, add details, remove details, or make ANY creative modifications to the furniture itself. The furniture is a fixed, immutable object.

4. PROPORTION MATCHING (CRITICAL): Look at the OTHER furniture and objects already present in the background scene. Your placed furniture MUST be scaled to match the real-world proportions of those existing objects. If there are chairs, tables, sofas, or other furniture in the background, use them as scale references. The placed furniture should look like it physically belongs in that space at a realistic size.

5. PLACEMENT RULES: Place the furniture naturally in the background scene with:
   - Correct scale relative to the room AND relative to other furniture/objects already in the scene
   - Proper grounding on the floor/surface
   - Natural shadows beneath and around the furniture to anchor it in the scene
   - Lighting on the furniture adjusted to match the ambient lighting direction and color temperature of the room

6. FULL BACKGROUND PRESERVATION (CRITICAL): The output image MUST show the COMPLETE, FULL background scene exactly as provided — same framing, same camera angle, same composition, same aspect ratio, and same field of view. DO NOT crop, zoom in, pan, tilt, re-frame, or cut off ANY part of the background. Every wall, ceiling, floor, window, door, and existing object visible in the background image must remain visible in the same position in the output. The output's edges/borders must match the background's edges/borders. If the furniture is too large, scale it DOWN — do NOT crop the room.

7. SAME ASPECT RATIO & DIMENSIONS: The output image must have the SAME aspect ratio as the background image. Do NOT change orientation. Do NOT zoom in on the furniture.

8. BACKGROUND PRESERVATION: Do NOT modify, remove, rearrange, recolor, or re-light anything in the background scene. Only ADD the furniture into it. Background pixels outside the furniture must remain identical to the input background.

9. COLOR & DESIGN PRESERVATION: The furniture's colors, materials, textures, patterns, and finishes from image 1 must be preserved EXACTLY in the output. Do NOT change any color, do NOT change any material appearance. The only adjustments allowed are lighting/shadow integration with the environment.

10. The result should look like a professional interior design photograph of the COMPLETE original room with the furniture physically placed inside it.

Output a single photorealistic image showing the COMPLETE original room (no cropping, no zooming) with the furniture placed inside it.`) + dimensionsRule + positionRule;

    // Build message content with all furniture images
    const messageContent: any[] = [
      { type: "text", text: prompt },
    ];

    furnitureImages.forEach((img, idx) => {
      messageContent.push(
        { type: "text", text: `FURNITURE ${isMultiple ? `#${idx + 1}` : "IMAGE"} (place this into the background):` },
        { type: "image_url", image_url: { url: img } }
      );
    });

    messageContent.push(
      { type: "text", text: `BACKGROUND/ROOM IMAGE (place furniture into this scene${bgWidth && bgHeight ? ` — output MUST be exactly ${bgWidth}x${bgHeight} pixels, aspect ratio ${bgAspect}, ${bgOrientation}, NO cropping or resizing of this background` : ""}):` },
      { type: "image_url", image_url: { url: backgroundImage } }
    );

    const generation = await generateImageFromMessages({
      model: "google/gemini-3-pro-image-preview",
      messageContent,
      logLabel: "background placement image model",
    });

    if (!generation.output) {
      if (generation.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (generation.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log("No image found in background placement response:", generation.error);
      return new Response(JSON.stringify({
        error: "Failed to place furniture in background. Please try again.",
        details: generation.error || "No content returned",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    return new Response(JSON.stringify({ output: generation.output, status: "succeeded" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error("Error in place-in-background function:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
