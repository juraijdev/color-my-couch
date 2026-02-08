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

1. IDENTIFY EVERY DISTINCT MATERIAL ZONE: Look carefully at the furniture and identify ALL distinct parts based on material, finish, and function. You MUST identify every visible part — do not skip any. Apply the GROUPING RULES below:

2. TOP SURFACE GROUPING RULE (CRITICAL):
   - ALL top surface modules/compartments must be grouped into ONE SINGLE PART called "Top Surface"
   - Even if the top has 3 or 4 separate compartments/modules, they are ONE part — the user will assign ONE color/material to all of them together
   - Do NOT create separate parts like "Top Module 1", "Top Module 2", etc.
   - The "Top Surface" includes the ENTIRE top face/surface area of each module — all the flat horizontal surfaces where items are placed

3. STAINLESS STEEL TRIM GROUPING RULE (CRITICAL):
   - ALL stainless steel / metal elements must be grouped into ONE SINGLE PART called "Stainless Steel Trim & Edges"
   - This includes: divider strips between top modules, front edge/lip of the top surface, side edges of the top surface, border trim, and any other metallic strips or bezels
   - Do NOT split dividers into "Divider 1", "Divider 2", etc. — they are ONE part
   - The user will assign ONE color/finish to all these metal elements together

4. SHELF / LOWER WOOD GROUPING RULE (CRITICAL):
   - ALL wooden shelves must be grouped into ONE SINGLE PART called "Shelf Wood"
   - This means the ENTIRE shelf surface — top face, front edge, side edges, and bottom face of EVERY shelf
   - The shelf must be FULLY covered when recolored — not just the bottom or just the top, but the COMPLETE shelf panel including all visible faces
   - Even if there are multiple shelves at different levels, they are ONE part — the user will assign ONE color/material to all shelves together
   - Do NOT create separate parts like "Lower Shelf", "Middle Shelf", etc.

5. FRONT PANEL RULE (CRITICAL):
   - If the furniture has front panels, fascia boards, front skirts, or any vertical front-facing decorative/structural panels below the top surface, they MUST be identified as a separate part called "Front Panel"
   - This includes: front apron, front rail, decorative front board, kick plate, or any vertical surface facing the user on the front side
   - Front panels are commonly found between the top surface and the lower shelf on buffet tables, sideboards, and serving stations
   - Do NOT skip or merge front panels into other parts — they are a distinct recolorable surface

6. OTHER PARTS TO IDENTIFY (DO NOT SKIP ANY):
   - **Frame / Legs**: Legs, base frame, support bars — group as one "Frame / Legs" part if same material
   - **Side panels**: If present, group as one "Side Panels" part  
   - **Back panel**: If visible, identify as one "Back Panel" part
   - **Front Panel**: See rule 5 above — MUST be identified if present
   - **Hardware**: Handles, knobs, hinges — group as one "Hardware" part if present
   - **Casters/wheels**: If present, identify as one "Casters / Wheels" part
   - **Doors / Drawers**: If present, identify as separate parts
   - **Other materials**: Glass, fabric, leather, plastic components — each as its own part

7. COMPLETENESS CHECK: Before returning, verify you have identified:
   - Every horizontal surface (top, shelves)
   - Every vertical surface (front panels, side panels, back panel)
   - Every structural element (frame, legs)
   - Every trim/metal element
   - Every accessory (hardware, wheels, doors)
   If any visible part is missing, add it.

8. For each part, describe its approximate location as a percentage of the image (top/bottom/left/right)
9. Identify the current color/material of each part

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

SUMMARY OF GROUPING:
- All top surface modules → ONE "Top Surface" part
- All metal trim, dividers, front/side edges → ONE "Stainless Steel Trim & Edges" part  
- All wooden shelves (FULLY — all faces) → ONE "Shelf Wood" part
- Front panels/fascia → "Front Panel" part (DO NOT SKIP)
- Frame/legs → "Frame / Legs" part
- Other distinct elements → separate parts as appropriate

IMPORTANT: Aim for 4-10 well-grouped parts. You MUST identify ALL visible parts — do not skip front panels, side panels, or any other visible surface. Metal is SEPARATE from wood — never merge stainless steel into wooden parts.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this furniture image and identify ALL distinct parts that can be recolored. Apply these GROUPING RULES: (1) Combine ALL top surface modules/compartments into ONE single 'Top Surface' part. (2) Group ALL stainless steel / metal elements (divider strips, front edge, side edges, border trim) into ONE single 'Stainless Steel Trim & Edges' part. (3) Combine ALL wooden shelves FULLY (all faces — top, front edge, bottom, sides) into ONE single 'Shelf Wood' part. (4) IMPORTANT: Identify FRONT PANELS separately — any vertical front-facing panel/fascia/apron below the top surface MUST be listed as 'Front Panel'. (5) Identify ALL other parts: frame/legs, side panels, back panel, hardware, wheels, doors, drawers. Do NOT skip any visible part. Aim for 4-10 well-grouped parts. Return the JSON structure."
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