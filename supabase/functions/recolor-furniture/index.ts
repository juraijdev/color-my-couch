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

function formatPartLocation(partName: string, location?: PartLocation) {
  if (!location) return `Approximate location for "${partName}": not provided.`;

  return `Approximate location envelope in photo for "${partName}" — top ${location.top}%, left ${location.left}%, width ${location.width}%, height ${location.height}%. Use this only as guidance and follow the exact visible boundaries of this part, not the whole rectangle.`;
}

function findAssignment(assignments: PatternAssignment[], partName: string) {
  return assignments.find(
    (assignment) => assignment.partName.toLowerCase() === partName.toLowerCase(),
  );
}

function getDataImageDimensions(dataUrl: string) {
  try {
    const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (!match) return null;

    const bin = atob(match[1].slice(0, 131072));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
      const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
      return { width, height, aspectRatio: width / height };
    }

    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let i = 2;
      while (i < bytes.length - 9) {
        if (bytes[i] !== 0xff) { i++; continue; }
        const marker = bytes[i + 1];
        const len = (bytes[i + 2] << 8) | bytes[i + 3];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const height = (bytes[i + 5] << 8) | bytes[i + 6];
          const width = (bytes[i + 7] << 8) | bytes[i + 8];
          return { width, height, aspectRatio: width / height };
        }
        i += 2 + len;
      }
    }
  } catch (error) {
    console.warn("Could not parse source image dimensions", error);
  }
  return null;
}

function buildConsistencyLocks(assignments: PatternAssignment[]) {
  const locks = [
    "Each listed part location is only a guidance envelope. Recolor ONLY the exact visible pixels of that named part, never the whole rectangle.",
    "Preserve crisp original boundaries between touching parts. No bleed, halo, soft blending, or shared tint across part borders.",
    "Never blend, average, or compromise two different assigned finishes into one shared look.",
    "Keep each assigned reference pattern faithful in color, contrast, material feel, and visible texture scale.",
    "Preserve the original furniture shading and geometry, and only change the specified surface finish.",
  ];

  const topSurface = findAssignment(assignments, "Top Surface");
  const trim = findAssignment(assignments, "Stainless Steel Trim & Edges");

  if (topSurface && trim) {
    locks.unshift(
      `Apply "${topSurface.patternName}" ONLY to the broad upper horizontal top wood/stone faces.`,
      `Apply "${trim.patternName}" ONLY to the thin front lip, thin side lip, perimeter edge caps, divider strips between top modules, and every small vertical top side panel / side return / outer end cap.`,
      `Treat "Stainless Steel Trim & Edges" as a sparse distributed trim system made of thin metal pieces, not one solid slab or panel.`,
      `Within the "Stainless Steel Trim & Edges" guidance envelope, recolor ONLY the visible divider strips, perimeter lips, edge caps, and top side-return / outer end-cap metal pieces.`,
      `The top side edge panels and the divider strips are one continuous metal trim system and must all render in the SAME "${trim.patternName}" finish.`,
      `The broad horizontal top wood/stone faces must NOT take on "${trim.patternName}", and the metal trim system must NOT take on "${topSurface.patternName}".`,
      `Do NOT flood-fill or tint the broad top wood area just because it sits inside or touches the trim envelope.`,
      `Where "Top Surface" touches "Stainless Steel Trim & Edges", keep a sharp boundary that follows the original product photo exactly.`,
      `"Top Surface" and "Stainless Steel Trim & Edges" are different parts and must stay visibly separate in the final image.`,
    );

    if (topSurface.patternName !== trim.patternName) {
      locks.unshift(
        `Because "${topSurface.patternName}" and "${trim.patternName}" are different assignments, the final result is WRONG if the top wood and the top trim system end up looking like the same color or material.`,
      );
    }
  }

  return locks.map((lock, index) => `${index + 1}. ${lock}`).join("\n");
}

async function generateRecoloredImage(
  apiKey: string,
  messageContent: any[],
) {
  const models = [
    "google/gemini-3.1-flash-image-preview",
    "google/gemini-3-pro-image-preview",
  ];

  let lastDetails = "No content returned";

  for (const model of models) {
    console.log(`Trying recolor image model: ${model}`);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", model, response.status, errorText);
      if (response.status === 429 || response.status === 402) {
        return { status: response.status, error: errorText };
      }
      lastDetails = errorText;
      continue;
    }

    const aiResult = await response.json();
    const choice = aiResult.choices?.[0];
    const message = choice?.message;
    lastDetails = choice?.error?.message || message?.content || message?.reasoning || lastDetails;

    console.log("AI response structure:", JSON.stringify({
      model,
      hasChoices: !!aiResult.choices,
      choicesLength: aiResult.choices?.length,
      hasChoiceError: !!choice?.error,
      choiceError: choice?.error?.message,
      hasImages: !!message?.images,
      imagesLength: message?.images?.length,
    }));

    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const firstImage = message.images[0];
      const imageUrl = firstImage.image_url?.url || firstImage.url;
      if (imageUrl) {
        console.log("Found recolored image in response", model);
        return { output: imageUrl, model };
      }
    }
  }

  return { error: lastDetails };
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
    const sourceDimensions = typeof body.image === "string" ? getDataImageDimensions(body.image) : null;
    const isLandscapeFurniture = !!sourceDimensions && sourceDimensions.aspectRatio >= 1.35;
    
    const patternChangesList = assignments.map((a: PatternAssignment) => {
      const partDetails = a.partDescription
        ? `Existing part details: ${a.partDescription}`
        : "Existing part details: not provided.";
      const partLocation = formatPartLocation(a.partName, a.partLocation);

      return `- "${a.partName}" (${a.partMaterial}): Apply "${a.patternName}" - ${a.patternDescription}. ${partDetails} ${partLocation}`;
    }).join("\n");

    const consistencyLocks = buildConsistencyLocks(assignments);
    
    const sourceFrameRule = sourceDimensions
      ? `\nSOURCE IMAGE FRAME LOCK — REQUIRED OUTPUT CANVAS:\n- Original input width: ${sourceDimensions.width}px\n- Original input height: ${sourceDimensions.height}px\n- Original aspect ratio: ${sourceDimensions.aspectRatio.toFixed(4)} (${isLandscapeFurniture ? "LANDSCAPE / WIDE BUFFET-SAFE" : "ALL-FURNITURE SAFE"})\n- Return the result with this SAME frame ratio and the FULL furniture visible. Do NOT output a square crop. Do NOT crop left, right, top, bottom, legs, backrests, arms, chair seats, table ends, or any edge. Do NOT rotate or recompose the furniture to fit a different canvas. If the input is portrait, keep portrait. If the input is square, keep square. If the input is landscape, keep landscape.\n`
      : "";

    const prompt = `Edit the provided furniture photo in place. Return an edited IMAGE. Do not answer with text only.

You are a precision image-editing / in-place retouching assistant, NOT a product renderer. Your ONLY job is to change the surface color/material/texture of specific existing furniture parts in the input photo. You must return the EXACT SAME photograph with ONLY the surface finish changed. The input image is the fixed master photo.
${sourceFrameRule}

⚠️ TOP-PRIORITY RULE — CAMERA, VIEW & SHAPE LOCK ⚠️
The output MUST be the SAME PHOTOGRAPH as the input, captured from the EXACT SAME camera viewpoint. Do NOT rotate the furniture. Do NOT change the viewing angle. Do NOT switch from a front view to a side/3-quarter/perspective/isometric/top-down view, or vice-versa. Do NOT re-orient, re-pose, re-stage, or re-render the furniture from a different angle. If the input shows the furniture from the front, the output must show it from the front. If the input shows it head-on / straight-on / orthographic, the output must remain head-on / straight-on / orthographic. The silhouette, outline, perspective lines, vanishing points, foreshortening, and pixel footprint of the furniture in the output must MATCH the input exactly. This applies especially to LARGE / WIDE / LANDSCAPE buffet tables — never re-render them at an angle, never reveal a side view that was not visible, never shorten the table, never crop either end, and never change the visible length-to-height ratio. Treat the input as a fixed photograph being repainted in place; the camera does not move, the furniture does not turn. If a finish cannot be applied while preserving exact geometry, leave that area closer to the original instead of redrawing or regenerating furniture.

⚠️ LONG BUFFET TABLE PRESERVATION LOCK ⚠️
For wide buffet / sideboard tables, preserve the full original landscape footprint exactly: same left end, same right end, same top line, same bottom line, same legs/plinth, same front-facing orientation, same full-width front face, and same canvas aspect ratio. The final image must remain landscape if the input is landscape. Do NOT make a square output, do NOT make a vertical output, do NOT make the table look like a different model, do NOT compress it, do NOT stretch it, do NOT crop it, do NOT add perspective depth, do NOT reveal side faces that were not visible, and do NOT convert it into a side-angle render. This is strictly texture replacement on the existing front-view pixels.

⚠️ ALL FURNITURE SILHOUETTE LOCK ⚠️
This same preservation rule applies to EVERY furniture type, including chairs, stools, sofas, benches, cabinets, tables, and small decorative pieces. For chairs, keep the exact original backrest height and curve, seat shape, armrests, leg count, leg thickness, leg angles, foot positions, gaps/open spaces, and visible edges. Do NOT make a chair taller, shorter, wider, slimmer, more rounded, more modern, angled differently, or partially cropped. Recolor only the already-existing pixels of the selected part; if exact recoloring is uncertain, preserve the original shape and leave difficult pixels closer to the input rather than regenerating any structure.

PARTS TO RECOLOR:
${patternChangesList}

CONSISTENCY LOCKS:
${consistencyLocks}

ABSOLUTE IRON-CLAD RULES — VIOLATION OF ANY RULE IS UNACCEPTABLE:

1. IDENTICAL FURNITURE SHAPE: The output furniture must have the EXACT same silhouette, outline, contours, edges, curves, angles, proportions, dimensions, and 3D form as the input. Not similar — IDENTICAL. Do NOT redraw, regenerate, redesign, or reinterpret the furniture. Think of it as repainting the exact same physical object.

2. ZERO STRUCTURAL CHANGES: Do NOT add, remove, invent, reshape, resize, reposition, rotate, bend, stretch, compress, or modify ANY structural element. Every leg, shelf, handle, panel, joint, corner, curve, divider, trim strip, lip, opening, caster, and edge must remain in the EXACT same position and shape.

3. NO NEW DETAILS: Never add any new divider, border, frame, groove, strip, seam, panel, handle, shelf, cutout, metal band, or decorative detail that is not already visible in the original photo. Use ONLY the existing geometry and existing visible part boundaries.

4. IDENTICAL CAMERA & COMPOSITION: Same exact camera angle, perspective, focal length, distance, framing, crop, canvas aspect ratio, and composition. The furniture must occupy the EXACT same pixels in the frame. Do NOT zoom in or out. Do NOT recenter. Do NOT crop the left or right ends of long buffet tables.

5. IDENTICAL BACKGROUND: The background, floor, shadows, reflections, and surrounding environment must be completely unchanged.

6. IDENTICAL LIGHTING: Same light direction, intensity, highlights, specular reflections, and ambient occlusion. Only the material's response to light changes.

7. COLOR/TEXTURE CHANGE ONLY: Extract the color, grain pattern, and surface texture from each reference pattern image. Apply that finish ONLY to the surface of the specified existing part. The underlying 3D shading, form shadows, and highlight contours must remain — just recolored to match the new material.

8. UNSPECIFIED PARTS UNTOUCHED: Any furniture part NOT listed above must remain 100% identical to the input — same color, same texture, same everything.

9. TOP WOOD VS METAL LOCK: If both "Top Surface" and "Stainless Steel Trim & Edges" are present, they are TWO DIFFERENT recolorable parts. Never merge them, never blur them together, and never let one borrow the other's finish unless the user explicitly assigned the same reference pattern to both.

10. CRITICAL BUFFET TABLE RULE: If a part named "Stainless Steel Trim & Edges" is present, it includes ALL matching top divider strips between top modules, the thin front metal lip under the top, the thin side metal lip under the top, every small vertical top side edge panel / side return / outer end cap at the left and right ends of the top assembly, and the matching perimeter top edge caps. All of those visible existing pieces must render in the SAME metal finish.

11. DO NOT EXPAND METAL AREAS: The stainless trim finish must stay only on the exact existing thin metal pieces already visible in the photo. Do NOT widen them, duplicate them, extend them, or create extra metal pieces.

12. TOP SURFACE SEPARATION RULE: If a part named "Top Surface" is present, recolor ONLY the broad upper horizontal wood/stone faces. Do NOT let the top wood/stone finish bleed into any thin front lip, side lip, vertical top side panel, side return, outer end cap, perimeter edge cap, or module divider strip when those belong to "Stainless Steel Trim & Edges".

13. TOP METAL SYSTEM MATCH RULE: The side edge metal, side-return panels, outer end caps, perimeter edge caps, thin front/side lips, and divider strips of the top assembly are one continuous trim system. They must all show the SAME assigned trim finish, with no mismatched pieces.

14. NEVER AVERAGE DIFFERENT REFERENCES: If two parts have different assigned patterns, do NOT create an in-between or blended appearance. Each part must visibly match its own assigned reference image, even when the parts touch each other.

15. REFERENCE FIDELITY RULE: The final finish must look like the real assigned pattern/material, with believable scale, grain/texture direction, contrast, and color accuracy suitable for customer-facing product visualization.

16. COUNT AND POSITION MUST MATCH: If the original has two divider strips, keep exactly two. If the original has a narrow metal top side panel / side return / outer end cap on the top assembly, keep exactly that visible panel only where it already exists. Never mirror, duplicate, invent, or enlarge any top detail.

17. NO OPENING CHANGES: Do NOT change cutouts, shelf openings, frame thickness, or panel proportions. Never turn open space into a panel or panel into open space.

18. NO ARTISTIC INTERPRETATION: Do NOT "improve" the image, change the style, add effects, change resolution, or make any creative modifications. This is a strict mechanical recoloring task.

19. LOCATION ENVELOPE RULE: Location rectangles are only guidance envelopes. When a part is thin or distributed, such as trim, recolor only the exact existing visible pixels of that part — never the entire box.

20. SHARP PART BOUNDARY RULE: If two assigned parts touch each other, preserve the original edge between them with a crisp transition and zero color bleed.

Return exactly one image. THINK OF IT THIS WAY: You are digitally recoloring existing surfaces on a real product photo. The furniture is a fixed physical object that cannot change shape or gain new details. You can only change what color/material its already-existing surfaces appear to be.`;

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

    const generation = await generateRecoloredImage(LOVABLE_API_KEY, messageContent);

    if (generation.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (generation.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!generation.output) {
      console.log("No image found in any recolor response:", generation.error);
      return new Response(JSON.stringify({ 
        error: "Image generation failed. The AI couldn't generate the customized image. Please try again.",
        details: generation.error || "No content returned"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      output: generation.output,
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
