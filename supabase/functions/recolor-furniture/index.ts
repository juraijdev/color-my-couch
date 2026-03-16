import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PartLocation {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PatternAssignment {
  partName: string;
  partMaterial: string;
  partDescription?: string;
  partLocation?: PartLocation;
  patternName: string;
  patternDescription: string;
  patternImageUrl: string;
}

function formatPartLocation(location?: PartLocation) {
  if (!location) return "Approximate location: not provided.";

  return `Approximate location in photo — top ${location.top}%, left ${location.left}%, width ${location.width}%, height ${location.height}%`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not set')
    }

    const body = await req.json()
    console.log("Pattern application request:", { 
      hasImage: !!body.image,
      patternAssignments: body.patternAssignments?.map((p: PatternAssignment) => ({ 
        partName: p.partName, 
        patternName: p.patternName 
      })),
    })

    // Validate required fields
    if (!body.image || !body.patternAssignments || body.patternAssignments.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: image and patternAssignments are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Build detailed prompt for multi-pattern application
    const assignments: PatternAssignment[] = body.patternAssignments;
    
    const patternChangesList = assignments.map((a: PatternAssignment) => {
      const partDetails = a.partDescription
        ? `Existing part details: ${a.partDescription}`
        : "Existing part details: not provided.";
      const partLocation = formatPartLocation(a.partLocation);

      return `- "${a.partName}" (${a.partMaterial}): Apply "${a.patternName}" - ${a.patternDescription}. ${partDetails} ${partLocation}`;
    }).join("\n");
    
    const prompt = `You are a product photo retouching assistant. Your ONLY job is to change the surface color/material/texture of specific existing furniture parts in the input photo. You must return the EXACT SAME photograph with ONLY the surface finish changed.

PARTS TO RECOLOR:
${patternChangesList}

ABSOLUTE IRON-CLAD RULES — VIOLATION OF ANY RULE IS UNACCEPTABLE:

1. IDENTICAL FURNITURE SHAPE: The output furniture must have the EXACT same silhouette, outline, contours, edges, curves, angles, proportions, dimensions, and 3D form as the input. Not similar — IDENTICAL. Do NOT redraw, regenerate, redesign, or reinterpret the furniture. Think of it as repainting the exact same physical object.

2. ZERO STRUCTURAL CHANGES: Do NOT add, remove, invent, reshape, resize, reposition, rotate, bend, stretch, compress, or modify ANY structural element. Every leg, shelf, handle, panel, joint, corner, curve, divider, trim strip, lip, opening, caster, and edge must remain in the EXACT same position and shape.

3. NO NEW DETAILS: Never add any new divider, border, frame, groove, strip, seam, panel, handle, shelf, cutout, metal band, or decorative detail that is not already visible in the original photo. Use ONLY the existing geometry and existing visible part boundaries.

4. IDENTICAL CAMERA & COMPOSITION: Same exact camera angle, perspective, focal length, distance, framing, crop, and composition. The furniture must occupy the EXACT same pixels in the frame.

5. IDENTICAL BACKGROUND: The background, floor, shadows, reflections, and surrounding environment must be completely unchanged.

6. IDENTICAL LIGHTING: Same light direction, intensity, highlights, specular reflections, and ambient occlusion. Only the material's response to light changes.

7. COLOR/TEXTURE CHANGE ONLY: Extract the color, grain pattern, and surface texture from each reference pattern image. Apply that finish ONLY to the surface of the specified existing part. The underlying 3D shading, form shadows, and highlight contours must remain — just recolored to match the new material.

8. UNSPECIFIED PARTS UNTOUCHED: Any furniture part NOT listed above must remain 100% identical to the input — same color, same texture, same everything.

9. CRITICAL BUFFET TABLE RULE: If a part named "Stainless Steel Trim & Edges" is present, it includes ALL matching top divider strips between top modules, the thin front metal lip under the top, the thin side metal lip under the top, the small top side edge panel / side return at the left and right ends of the top assembly, and the matching perimeter top edge caps. All of those visible existing pieces must render in the SAME metal finish.

10. DO NOT EXPAND METAL AREAS: The stainless trim finish must stay only on the exact existing thin metal pieces already visible in the photo. Do NOT widen them, duplicate them, extend them, or create extra metal pieces.

11. TOP SURFACE SEPARATION RULE: If a part named "Top Surface" is present, recolor ONLY the broad top wood/stone faces. Do NOT let the top wood/stone finish bleed into the thin front lip, side lip, small top side edge panel / side return, perimeter edge cap, or module divider strips when those belong to "Stainless Steel Trim & Edges".

12. COUNT AND POSITION MUST MATCH: If the original has two divider strips, keep exactly two. If the original has a narrow metal side panel / side return on the top assembly, keep exactly that visible panel only where it already exists. Never mirror, duplicate, or invent additional top details.

13. NO OPENING CHANGES: Do NOT change cutouts, shelf openings, frame thickness, or panel proportions. Never turn open space into a panel or panel into open space.

14. NO ARTISTIC INTERPRETATION: Do NOT "improve" the image, change the style, add effects, change resolution, or make any creative modifications. This is a strict mechanical recoloring task.

THINK OF IT THIS WAY: You are digitally recoloring existing surfaces on a real product photo. The furniture is a fixed physical object that cannot change shape or gain new details. You can only change what color/material its already-existing surfaces appear to be.`;

    console.log("Generating image with pattern application prompt:", prompt)

    // Build the message content with pattern reference images
    const messageContent: any[] = [
      {
        type: "text",
        text: prompt
      },
      {
        type: "image_url",
        image_url: {
          url: body.image
        }
      }
    ];

    // Add pattern reference images
    for (const assignment of assignments) {
      if (assignment.patternImageUrl) {
        messageContent.push({
          type: "text",
          text: `Reference for "${assignment.patternName}" finish to apply to "${assignment.partName}":`
        });
        messageContent.push({
          type: "image_url",
          image_url: {
            url: assignment.patternImageUrl
          }
        });
      }
    }

    // Use Lovable AI with image editing capabilities
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log("AI response structure:", JSON.stringify({
      hasChoices: !!aiResult.choices,
      choicesLength: aiResult.choices?.length,
      hasImages: !!aiResult.choices?.[0]?.message?.images,
      imagesLength: aiResult.choices?.[0]?.message?.images?.length
    }));

    // Extract the generated image from the response
    const message = aiResult.choices?.[0]?.message;
    let imageUrl = null;
    
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const firstImage = message.images[0];
      imageUrl = firstImage.image_url?.url || firstImage.url;
      console.log("Found image in images array");
    }

    if (!imageUrl) {
      console.log("No image found in response. Full response:", JSON.stringify(aiResult, null, 2).substring(0, 2000));
      
      return new Response(JSON.stringify({ 
        error: "Image generation failed. The AI couldn't generate the customized image. Please try again.",
        details: message?.content || "No content returned"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      output: imageUrl,
      status: "succeeded" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in recolor-furniture function:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
