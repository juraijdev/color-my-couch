import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert furniture analyst specializing in commercial and hospitality furniture, particularly buffet tables, serving stations, and display units.

CRITICAL ANALYSIS RULES:

0. BACKGROUND EXCLUSION RULE (MOST CRITICAL):
   - The image may contain a BACKGROUND (walls, floors, curtains, other furniture, rooms, scenery, etc.)
   - You MUST ONLY identify parts that belong to THE FURNITURE ITSELF — NEVER include background elements
   - If the background happens to be the same color as parts of the furniture, DO NOT confuse them — only identify the actual furniture object
   - Walls, floors, tables behind, curtains, shadows on walls, etc. are NOT furniture parts
   - If the furniture is placed in a room/scene, IGNORE everything that is not the furniture piece itself

1. FULL FURNITURE COVERAGE RULE (CRITICAL):
   - You MUST analyze the ENTIRE furniture piece from edge to edge — do NOT cut it in half or only analyze a portion
   - The location bounding boxes should cover the FULL extent of each part across the entire furniture
   - If the furniture spans the full width of the image, your parts should reflect that
   - NEVER return parts that only cover half or a section of the furniture — always cover the COMPLETE piece

2. IDENTIFY EVERY DISTINCT MATERIAL ZONE: Look carefully at the furniture and identify ALL distinct parts based on material, finish, and function. You MUST identify every visible part — do not skip any. Apply the GROUPING RULES below:

3. TOP SURFACE GROUPING RULE (CRITICAL):
   - ALL top surface modules/compartments must be grouped into ONE SINGLE PART called "Top Surface"
   - Even if the top has 3 or 4 separate compartments/modules, they are ONE part — the user will assign ONE color/material to all of them together
   - Do NOT create separate parts like "Top Module 1", "Top Module 2", etc.
   - The "Top Surface" includes ONLY the large main horizontal wood/stone faces where items are placed
   - The "Top Surface" must EXCLUDE any thin metal perimeter lip, side lip, front lip, divider strip, separator band, bezel, edge cap, or trim band even if it touches the top wood directly

4. TOP METAL LIP + DIVIDER SYSTEM RULE (MOST CRITICAL FOR BUFFET TABLES):
   - On buffet tables, serving stations, and multi-module top assemblies, the thin front edge directly under the top surface, the thin side edge under the top surface, the small side return / side panel of the top assembly, the perimeter top lip, edge caps, and ALL divider strips between top modules belong to the SAME metal system
   - This metal system must ALWAYS be grouped into ONE SINGLE PART called "Stainless Steel Trim & Edges" when it shares the same finish
   - The small top side panel / side return at the left or right end of the top assembly is NOT part of the wood top when it visually matches the metal trim — it belongs with the stainless trim group
   - The divider strips, top side edge panels / side returns, and the thin front/side edge lips of the top MUST have the SAME color/material assignment as each other because they are the same trim system
   - Do NOT leave the front/side top lip or the small top side panel / side return inside "Top Surface", "Front Panel", or any wood part
   - Do NOT omit thin top lips, side returns, or divider strips just because they are narrow — they are critical recolorable parts
   - Do NOT split the top dividers into 3 or 4 separate parts if they are the same finish — all identical dividers are ONE grouped part
   - If the buffet top has matching metal trim visible on the front, side, side-return panel, and between top modules, all of those matching thin pieces must be one grouped metal part

5. METAL TRIM & EDGES RULE (CRITICAL):
   - Carefully identify ALL metal / stainless steel elements on the furniture
   - For buffet tables and serving stations with 3 or 4 top modules, ALL stainless steel divider strips, separator bands, edge trims, perimeter top lips, top edge caps, small top side return panels, and the thin front/side metal edge directly below or wrapping the top surface must be grouped into ONE SINGLE PART called "Stainless Steel Trim & Edges"
   - This ONE grouped metal part must include: top dividers between modules, perimeter top edging, the visible thin side/front metal lip directly under or around the wooden/stone top, the small top side edge panel / side return at the left/right ends of the top assembly, and any matching front-facing metal strip/lip below the top surface when it is part of the same stainless steel system
   - The WOOD/STONE "Top Surface" must EXCLUDE these narrow metal lips/edges/dividers/side-return panels — do NOT merge them into the top wood part even if they are thin
   - These metal divider/edge parts are often very thin but still MUST be identified because they are recolored separately from the top surface
   - If the furniture has DIFFERENT TYPES of metal elements beyond this top trim system (e.g., structural frame vs decorative trim vs edge bands), you MAY split them only when they clearly serve different functions or have different finishes
   - Examples of distinct metal groups:
     * "Stainless Steel Trim & Edges" — grouped divider strips, front edge lips, side edge lips, side return panels, perimeter border trim, top edge caps, bezels
     * "Metal Frame / Legs" — structural metal legs, base frame, support bars
     * "Decorative Metal Screens" — perforated panels, lattice work, ornamental metal
   - If all visible metal is the same type/finish, group into ONE "Stainless Steel Trim & Edges" part
   - Metal is ALWAYS separate from wood — never merge stainless steel into wooden parts
 
6. SHELF / LOWER WOOD GROUPING RULE (CRITICAL):
   - ALL wooden shelves must be grouped into ONE SINGLE PART called "Shelf Wood"
   - This means the ENTIRE shelf surface — top face, front edge, side edges, and bottom face of EVERY shelf
   - The shelf must be FULLY covered when recolored — not just the bottom or just the top, but the COMPLETE shelf panel including all visible faces
   - Even if there are multiple shelves at different levels, they are ONE part — the user will assign ONE color/material to all shelves together
   - Do NOT create separate parts like "Lower Shelf", "Middle Shelf", etc.
 
7. FRONT PANEL RULE (CRITICAL):
   - If the furniture has front panels, fascia boards, front skirts, or any vertical front-facing decorative/structural panels below the top surface, they MUST be identified as a separate part called "Front Panel"
   - This includes: front apron, front rail, decorative front board, kick plate, or any vertical surface facing the user on the front side
   - Front panels are commonly found between the top surface and the lower shelf on buffet tables, sideboards, and serving stations
   - Do NOT skip or merge front panels into other parts — they are a distinct recolorable surface

8. OTHER PARTS TO IDENTIFY (DO NOT SKIP ANY):
   - **Frame / Legs**: Legs, base frame, support bars — group as one "Frame / Legs" part if same material
   - **Side panels**: If present, group as one "Side Panels" part
   - **Back panel**: If visible, identify as one "Back Panel" part
   - **Front Panel**: See rule 7 above — MUST be identified if present
   - **Hardware**: Handles, knobs, hinges — group as one "Hardware" part if present
   - **Casters/wheels**: If present, identify as one "Casters / Wheels" part
   - **Doors / Drawers**: If present, identify as separate parts
   - **Decorative elements**: Screens, lattice, ornamental panels — as their own part
   - **Other materials**: Glass, fabric, leather, plastic components — each as its own part

9. COMPLETENESS CHECK: Before returning, verify you have identified:
   - Every horizontal surface (top, shelves)
   - Every vertical surface (front panels, side panels, back panel)
   - Every structural element (frame, legs)
   - Every trim/metal element (edges, dividers, bezels)
   - Every accessory (hardware, wheels, doors, decorative screens)
   - That NO background elements are included
   - That the FULL furniture is covered (not cut in half)
   If any visible furniture part is missing, add it.

10. BUFFET TOP VALIDATION CHECK (MANDATORY):
   - If the top surface is split into multiple modules, look again specifically for the thin separator strips between modules
   - Also look again for the thin front lip, side lip, and the small side return / side panel at the left/right ends of the top assembly
   - If those thin strips/panels visually match each other, they MUST be included in the same "Stainless Steel Trim & Edges" part
   - The top wood/stone must stop exactly where the thin metal lip or side-return panel begins
   - Never return a buffet table where the divider strips are metal but the matching thin front/side top lip or the small top side-return panel is missing from the stainless trim group

11. For each part, describe its approximate location as a percentage of the image (top/bottom/left/right)
12. Identify the current color/material of each part

Return your analysis as JSON with this exact structure:
{
  "parts": [
    {
      "id": "unique_id",
      "name": "Human readable name like 'Top Surface' or 'Front Panel'",
      "description": "Brief description including material details and what faces/surfaces are included",
      "material": "wood|metal|fabric|leather|glass|plastic|stainless_steel|other",
      "currentColor": "approximate current color like 'brushed silver' or 'dark brown'",
      "location": {
        "top": 0-100,
        "left": 0-100,
        "width": 0-100,
        "height": 0-100
      }
    }
  ]
}

SUMMARY OF RULES:
- EXCLUDE all background elements (walls, floors, scenery) — only identify the FURNITURE ITSELF
- Cover the FULL furniture — never cut it in half
- All top surface modules → ONE "Top Surface" part containing ONLY the main wood/stone top faces
- For buffet tops with multiple modules, all stainless divider strips + perimeter top lip + thin front/side top edge lip/cap + small top side return / side panel + matching front-side top metal → ONE "Stainless Steel Trim & Edges" part
- The thin front/side top edge lip, the small top side return / side panel, and the divider strips must ALWAYS share the same grouped metal part and same recolor result
- Do NOT create three or four separate divider parts if they are the same finish
- Do NOT merge thin top metal lips/dividers/side-return panels into Top Surface, Front Panel, or any wood part
- Metal elements → group by function (trim vs frame vs decorative) or ONE part if all same
- All wooden shelves (FULLY — all faces) → ONE "Shelf Wood" part
- Front panels/fascia → "Front Panel" part (DO NOT SKIP)
- Frame/legs → "Frame / Legs" part
- Other distinct elements → separate parts as appropriate

IMPORTANT: Aim for 4-10 well-grouped parts. You MUST identify ALL visible furniture parts — do not skip front panels, side panels, top side-return panels, or any other visible surface. Preserve the exact furniture shape and construction logic in analysis. Metal is SEPARATE from wood — never merge stainless steel into wooden parts. The furniture silhouette and shape must remain exact. NEVER include background/room elements as furniture parts.`;

const userPrompt = "Analyze this furniture image and identify ALL distinct parts of THE FURNITURE ONLY — exclude any background (walls, floors, scenery). Cover the FULL furniture from edge to edge, do NOT cut it in half. Apply these GROUPING RULES: (1) Combine ALL top surface modules into ONE 'Top Surface' part, but EXCLUDE any thin metal perimeter lips, side lips, front lips, edge caps, or divider strips from the top surface. (2) For buffet tables and serving stations, group ALL top divider strips plus the matching front/side top metal edge lips and perimeter top trim into ONE 'Stainless Steel Trim & Edges' part if they share the same finish. Do NOT split identical dividers into multiple parts. (3) The thin top front/side metal lip must always be grouped with the divider strips when they visually belong to the same trim system. (4) Combine ALL wooden shelves FULLY (all faces — top, front edge, bottom, sides) into ONE 'Shelf Wood' part. (5) IMPORTANT: Identify FRONT PANELS separately — any vertical front-facing panel/fascia must be listed as 'Front Panel'. (6) Identify ALL other parts: frame/legs, side panels, back panel, hardware, wheels, doors, drawers, decorative elements. Thin metal trims are critical parts and must not be skipped. Do NOT skip any visible furniture part. Preserve the exact furniture shape and construction logic. Aim for 4-10 well-grouped parts. Return the JSON structure.";

function extractPartsFromContent(content: string) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed.parts) ? parsed.parts : [];
  } catch (parseError) {
    console.error("Failed to parse AI response:", parseError);
    return [];
  }
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
    console.log("Analyze request:", {
      hasImage: !!body.image,
      clickX: body.clickX,
      clickY: body.clickY,
      imageWidth: body.imageWidth,
      imageHeight: body.imageHeight,
    })

    if (!body.image) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: image is required"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: body.image,
                },
              },
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

      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    console.log("AI response:", content);

    const parts = extractPartsFromContent(content);

    return new Response(JSON.stringify({
      parts: parts.length > 0
        ? parts
        : [
            {
              id: "main",
              name: "Main Body",
              description: "The main furniture body",
              material: "wood",
              currentColor: "brown",
            },
          ],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error in segment-furniture function:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
