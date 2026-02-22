import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Use Lovable AI with vision to analyze the clicked region
    // and identify what part of the furniture was clicked
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
            content: `You are an expert furniture analyst specializing in commercial and hospitality furniture, particularly buffet tables, serving stations, and display units.

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
   - The "Top Surface" includes the ENTIRE top face/surface area of each module — all the flat horizontal surfaces where items are placed

4. METAL TRIM & EDGES RULE (CRITICAL):
   - Carefully identify ALL metal / stainless steel elements on the furniture
   - If the furniture has DIFFERENT TYPES of metal elements (e.g., structural frame vs decorative trim vs edge bands), you MAY split them into separate parts if they serve different functions or have different finishes
   - Examples of distinct metal groups:
     * "Stainless Steel Trim & Edges" — divider strips, front edge lips, border trim, bezels
     * "Metal Frame / Legs" — structural metal legs, base frame, support bars
     * "Decorative Metal Screens" — perforated panels, lattice work, ornamental metal
   - If all metal is the same type/finish, group into ONE "Stainless Steel Trim & Edges" part
   - Metal is ALWAYS separate from wood — never merge metallic elements into wooden parts

5. SHELF / LOWER WOOD GROUPING RULE (CRITICAL):
   - ALL wooden shelves must be grouped into ONE SINGLE PART called "Shelf Wood"
   - This means the ENTIRE shelf surface — top face, front edge, side edges, and bottom face of EVERY shelf
   - The shelf must be FULLY covered when recolored — not just the bottom or just the top, but the COMPLETE shelf panel including all visible faces
   - Even if there are multiple shelves at different levels, they are ONE part — the user will assign ONE color/material to all shelves together
   - Do NOT create separate parts like "Lower Shelf", "Middle Shelf", etc.

6. FRONT PANEL RULE (CRITICAL):
   - If the furniture has front panels, fascia boards, front skirts, or any vertical front-facing decorative/structural panels below the top surface, they MUST be identified as a separate part called "Front Panel"
   - This includes: front apron, front rail, decorative front board, kick plate, or any vertical surface facing the user on the front side
   - Front panels are commonly found between the top surface and the lower shelf on buffet tables, sideboards, and serving stations
   - Do NOT skip or merge front panels into other parts — they are a distinct recolorable surface

7. OTHER PARTS TO IDENTIFY (DO NOT SKIP ANY):
   - **Frame / Legs**: Legs, base frame, support bars — group as one "Frame / Legs" part if same material
   - **Side panels**: If present, group as one "Side Panels" part  
   - **Back panel**: If visible, identify as one "Back Panel" part
   - **Front Panel**: See rule 6 above — MUST be identified if present
   - **Hardware**: Handles, knobs, hinges — group as one "Hardware" part if present
   - **Casters/wheels**: If present, identify as one "Casters / Wheels" part
   - **Doors / Drawers**: If present, identify as separate parts
   - **Decorative elements**: Screens, lattice, ornamental panels — as their own part
   - **Other materials**: Glass, fabric, leather, plastic components — each as its own part

8. COMPLETENESS CHECK: Before returning, verify you have identified:
   - Every horizontal surface (top, shelves)
   - Every vertical surface (front panels, side panels, back panel)
   - Every structural element (frame, legs)
   - Every trim/metal element (edges, dividers, bezels)
   - Every accessory (hardware, wheels, doors, decorative screens)
   - That NO background elements are included
   - That the FULL furniture is covered (not cut in half)
   If any visible furniture part is missing, add it.

9. For each part, describe its approximate location as a percentage of the image (top/bottom/left/right)
10. Identify the current color/material of each part

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
- All top surface modules → ONE "Top Surface" part
- Metal elements → group by function (trim vs frame vs decorative) or ONE part if all same
- All wooden shelves (FULLY — all faces) → ONE "Shelf Wood" part
- Front panels/fascia → "Front Panel" part (DO NOT SKIP)
- Frame/legs → "Frame / Legs" part
- Other distinct elements → separate parts as appropriate

IMPORTANT: Aim for 4-10 well-grouped parts. You MUST identify ALL visible furniture parts — do not skip front panels, side panels, or any other visible surface. Metal is SEPARATE from wood — never merge stainless steel into wooden parts. NEVER include background/room elements as furniture parts.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this furniture image and identify ALL distinct parts of THE FURNITURE ONLY — exclude any background (walls, floors, scenery). Cover the FULL furniture from edge to edge, do NOT cut it in half. Apply these GROUPING RULES: (1) Combine ALL top surface modules into ONE 'Top Surface' part. (2) Identify metal elements — group by function (trim/edges vs structural frame vs decorative screens) or as ONE part if all same type. (3) Combine ALL wooden shelves FULLY (all faces — top, front edge, bottom, sides) into ONE 'Shelf Wood' part. (4) IMPORTANT: Identify FRONT PANELS separately — any vertical front-facing panel/fascia must be listed as 'Front Panel'. (5) Identify ALL other parts: frame/legs, side panels, back panel, hardware, wheels, doors, drawers, decorative elements. Do NOT skip any visible furniture part. Aim for 4-10 well-grouped parts. Return the JSON structure."
              },
              {
                type: "image_url",
                image_url: {
                  url: body.image
                }
              }
            ]
          }
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

    // Parse the JSON from the AI response
    let parts = [];
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parts = parsed.parts || [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a default structure if parsing fails
      parts = [
        { id: "main", name: "Main Body", description: "The main furniture body", material: "wood", currentColor: "brown" }
      ];
    }

    return new Response(JSON.stringify({ parts }), {
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