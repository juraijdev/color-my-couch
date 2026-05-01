import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOP_SURFACE_NAME = "Top Surface";
const TRIM_NAME = "Stainless Steel Trim & Edges";

const systemPrompt = `You are an expert furniture analyst specializing in commercial and hospitality furniture, particularly buffet tables, serving stations, and display units.

CRITICAL ANALYSIS RULES:

0. BACKGROUND EXCLUSION RULE (MOST CRITICAL):
   - The image may contain a BACKGROUND (walls, floors, curtains, other furniture, rooms, scenery, etc.)
   - You MUST ONLY identify parts that belong to THE FURNITURE ITSELF — NEVER include background elements
   - If the background happens to be the same color as parts of the furniture, DO NOT confuse them — only identify the actual furniture object
   - Walls, floors, tables behind, curtains, shadows on walls, etc. are NOT furniture parts
   - If the furniture is placed in a room/scene, IGNORE everything that is not the furniture piece itself

1. FULL FURNITURE COVERAGE RULE (CRITICAL — APPLIES TO ALL SIZES, ESPECIALLY LARGE / LANDSCAPE / WIDE BUFFET TABLES):
   - You MUST analyze the ENTIRE furniture piece from the LEFT-MOST edge to the RIGHT-MOST edge and from the TOP edge to the BOTTOM edge — do NOT cut, crop, or skip any portion
   - This applies equally to SMALL buffet tables AND to LARGE / LANDSCAPE / WIDE / LONG buffet tables that span the full width of the image
   - For wide / landscape buffet tables: the "Top Surface" bounding box width MUST span essentially the full horizontal extent of the top (often width 80-100% of the image). Do NOT return a top that only covers the left half or the center portion
   - For wide / landscape buffet tables: the "Stainless Steel Trim & Edges", "Front Panel", "Shelf Wood", and "Frame / Legs" bounding boxes MUST also span the full horizontal extent of those parts — do NOT return half-width boxes
   - Every decorative front sub-part (screens, inlays, fluted panels, accent panels, doors, drawers) on a LARGE buffet table MUST be identified just like on a small one — large size is NEVER an excuse to skip or merge sub-parts
   - If a large buffet table has 4, 5, 6 or more front door/drawer/screen modules across its width, you MUST still identify every distinct decorative sub-part group (group identical ones together but do NOT drop them)
   - NEVER return parts that only cover half or a section of the furniture — always cover the COMPLETE piece across its FULL width and height

2. IDENTIFY EVERY DISTINCT MATERIAL ZONE: Look carefully at the furniture and identify ALL distinct parts based on material, finish, and function. You MUST identify every visible part — do not skip any. Apply the GROUPING RULES below:

3. TOP SURFACE GROUPING RULE (CRITICAL):
   - ALL top surface modules/compartments must be grouped into ONE SINGLE PART called "Top Surface"
   - Even if the top has 3 or 4 separate compartments/modules, they are ONE part — the user will assign ONE color/material to all of them together
   - Do NOT create separate parts like "Top Module 1", "Top Module 2", etc.
    - The "Top Surface" includes ONLY the broad, upper, horizontal wood/stone/marble/granite/quartz faces where items are placed
    - If a big buffet table has a stone, marble, granite, quartz, terrazzo, or solid-surface countertop, it MUST still be identified as the single "Top Surface" part across the full visible top area
   - The "Top Surface" does NOT include any vertical side face, outer side panel, side return, fascia, end cap, front lip, side lip, divider strip, separator band, bezel, edge cap, or trim band even if it is attached directly to the top wood/stone
   - If a visible side face of the top assembly is metal, it MUST stay out of "Top Surface"
   - If the top wood/stone and the surrounding trim are visibly different materials, you MUST return them as different parts every single time
   - Never use one large mixed part that swallows both the top wood/stone and the surrounding metal trim system

4. TOP METAL SIDE PANEL + LIP + DIVIDER SYSTEM RULE (MOST CRITICAL FOR BUFFET TABLES):
   - On buffet tables, serving stations, and multi-module top assemblies, the thin front edge directly under the top surface, the thin side edge under the top surface, every small vertical side panel / side return / outer end cap of the top assembly, the perimeter top lip, edge caps, and ALL divider strips between top modules belong to the SAME metal system
   - This metal system must ALWAYS be grouped into ONE SINGLE PART called "Stainless Steel Trim & Edges" when it shares the same finish
   - The small vertical side face / side panel at the left or right end of the top assembly is NOT part of the wood top when it visually matches the metal trim — it belongs with the stainless trim group
   - The divider strips, top side edge panels / vertical side fascia / side returns, and the thin front/side edge lips of the top MUST have the SAME color/material assignment as each other because they are the same trim system
   - Do NOT leave the top side panel, front/side top lip, or divider strips inside "Top Surface", "Front Panel", "Side Panels", or any wood part
   - Do NOT omit thin top lips, top side panels, side returns, outer end caps, or divider strips just because they are narrow — they are critical recolorable parts
   - Do NOT split the top dividers or top side metal panels into multiple duplicate parts if they share the same finish
   - If the buffet top has matching metal trim visible on the front, side, side-return panel, vertical top side fascia, and between top modules, all of those matching thin pieces must be one grouped metal part
   - The side edge metal and the divider metal must stay in the SAME grouped part so the user can recolor them together

5. METAL TRIM & EDGES RULE (CRITICAL):
   - Carefully identify ALL metal / stainless steel elements on the furniture
   - For buffet tables and serving stations with 3 or 4 top modules, ALL stainless steel divider strips, separator bands, edge trims, perimeter top lips, top edge caps, small top side return panels, vertical top side fascia panels, and the thin front/side metal edge directly below or wrapping the top surface must be grouped into ONE SINGLE PART called "Stainless Steel Trim & Edges"
   - This ONE grouped metal part must include: top dividers between modules, perimeter top edging, the visible thin side/front metal lip directly under or around the wooden/stone top, every small vertical top side edge panel / side return / outer end cap at the left/right ends of the top assembly, and any matching front-facing metal strip/lip below the top surface when it is part of the same stainless steel system
   - The WOOD/STONE "Top Surface" must EXCLUDE these narrow metal lips/edges/dividers/vertical side panels/side-return panels — do NOT merge them into the top wood part even if they are thin
   - These metal divider/edge parts are often very thin but still MUST be identified because they are recolored separately from the top surface
   - If the furniture has DIFFERENT TYPES of metal elements beyond this top trim system (e.g., structural frame vs decorative trim vs edge bands), you MAY split them only when they clearly serve different functions or have different finishes
   - Examples of distinct metal groups:
     * "Stainless Steel Trim & Edges" — grouped divider strips, front edge lips, side edge lips, side return panels, vertical top side fascia panels, perimeter border trim, top edge caps, bezels
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
 
7. FRONT PANEL RULE (CRITICAL — INCLUDES SUB-PARTS WITH DIFFERENT PATTERNS/COLORS):
   - If the furniture has front panels, fascia boards, front skirts, or any vertical front-facing panels below the top surface, identify the MAIN plain wood/stone front panel as "Front Panel"
   - HOWEVER — many buffet tables and sideboards have DECORATIVE SUB-ELEMENTS on the front that have a DIFFERENT pattern, material, color, or finish from the main front panel. These MUST be identified as SEPARATE parts so the user can recolor / re-pattern them independently. Examples:
     * "Front Decorative Screen" — slatted screen, lattice, perforated metal screen, woven panel, rattan/cane insert behind a cut-out or as an inlay
     * "Front Decorative Inlay" — contrasting wood inlay, marquetry, veneer panel with a different grain
     * "Front Fluted Panel" — vertical fluted/reeded section that contrasts with smooth wood
     * "Front Accent Panel" — any colored, painted, mirrored, fabric, leather, or metal accent panel on the front
     * "Front Door Panel" / "Front Drawer Panel" — when doors/drawers have a distinct face from the surrounding fascia
   - The plain surrounding wood/fascia is "Front Panel". The contrasting decorative element(s) inside or beside it are SEPARATE parts.
   - If the front has TWO or more visibly different finishes/patterns side-by-side (e.g., wood + slatted screen, or two different wood tones), each must be its own part.
   - Do NOT merge a decorative front sub-element into "Front Panel" just because they share the same area — different pattern/material = different part.
   - Do NOT skip front panels or their decorative sub-parts.

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
   - Also look again for the thin front lip, side lip, and every small vertical top side panel / side return / outer end cap at the left/right ends of the top assembly
   - If those thin strips/panels visually match each other, they MUST be included in the same "Stainless Steel Trim & Edges" part
   - The top wood/stone must stop exactly where the metal front lip, side lip, divider strip, or top side panel begins
   - Never return a buffet table where the divider strips are metal but the matching thin front/side top lip or the small top side-return panel / vertical top side fascia is missing from the stainless trim group
   - Never return a buffet table where the broad horizontal top wood/stone and the top side/divider metal are merged into the same recolorable part

11. CONSISTENCY CHECK (MANDATORY):
   - Your result must be stable and reusable for repeated recoloring
   - If the furniture clearly shows a broad horizontal top wood/stone area plus thin side/divider metal, preserve that separation consistently every time
   - The descriptions for "Top Surface" and "Stainless Steel Trim & Edges" must clearly explain that they are different parts
   - If the top side edge and the divider strips are the same visible metal system, the user must be able to recolor them together from one metal part

12. PRECISE BOUNDING BOX RULE (CRITICAL):
    - For each part, you MUST provide a TIGHT, PIXEL-ACCURATE bounding box as percentages of the FULL image dimensions
    - "top" = the Y-coordinate of the TOP edge of the part as a percentage of image height (0 = very top of image, 100 = very bottom)
    - "left" = the X-coordinate of the LEFT edge of the part as a percentage of image width (0 = very left of image, 100 = very right)
    - "width" = the horizontal span of the part as a percentage of image width
    - "height" = the vertical span of the part as a percentage of image height
    - The bounding box MUST tightly wrap the actual visible pixels of that part — do NOT use loose/padded boxes
    - For thin parts like trim strips, the height or width should be correspondingly small (e.g., a thin horizontal strip might have height: 2-5)
    - For wide parts like the top surface, width should span the full extent of that surface
    - Double-check: if a part visually starts at 10% from the top and ends at 30% from the top, then top=10, height=20
    - The rectangle should overlay EXACTLY on the part when drawn on the image — accuracy is critical for user interaction
13. Identify the current color/material of each part

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
- All top surface modules → ONE "Top Surface" part containing ONLY the broad upper horizontal wood/stone/marble/granite/quartz faces
- For buffet tops with multiple modules, all stainless divider strips + perimeter top lip + thin front/side top edge lip/cap + every small vertical top side panel / side return / outer end cap + matching front-side top metal → ONE "Stainless Steel Trim & Edges" part
- The thin front/side top edge lip, the small vertical top side panel / side return, and the divider strips must ALWAYS share the same grouped metal part and same recolor result
- Do NOT create three or four separate divider parts if they are the same finish
- Do NOT merge thin top metal lips/dividers/vertical top side panels/side-return panels into Top Surface, Front Panel, Side Panels, or any wood part
- If top wood/stone and top trim are different visible materials, they MUST remain separate parts every time
- Metal elements → group by function (trim vs frame vs decorative) or ONE part if all same
- All wooden shelves (FULLY — all faces) → ONE "Shelf Wood" part
- Front panels/fascia → "Front Panel" part (DO NOT SKIP)
- Frame/legs → "Frame / Legs" part
- Other distinct elements → separate parts as appropriate

IMPORTANT: Aim for 4-10 well-grouped parts. You MUST identify ALL visible furniture parts — do not skip front panels, side panels, top side-return panels, vertical top side fascia panels, or any other visible surface. Preserve the exact furniture shape and construction logic in analysis. Metal is SEPARATE from wood — never merge stainless steel into wooden parts. The furniture silhouette and shape must remain exact. NEVER include background/room elements as furniture parts.`;

const userPrompt = "Analyze this furniture image and identify ALL distinct parts of THE FURNITURE ONLY — exclude any background (walls, floors, scenery). Cover the FULL furniture from LEFT-MOST edge to RIGHT-MOST edge and from top to bottom — do NOT cut, crop, or skip any portion, regardless of whether the buffet table is small, medium, large, wide, long, or landscape-oriented. For LARGE / LANDSCAPE / WIDE buffet tables, the Top Surface, Front Panel, Shelf Wood, Frame/Legs, and Stainless Steel Trim & Edges bounding boxes MUST span the FULL horizontal extent of those parts (often 80-100% of the image width) — never return half-width boxes. Apply these GROUPING RULES: (1) Combine ALL top surface modules into ONE 'Top Surface' part across the full width, but EXCLUDE any metal side panels, side-return panels, vertical top fascia, perimeter lips, side lips, front lips, edge caps, or divider strips from the top surface. If the top is stone, marble, granite, quartz, terrazzo, solid-surface, or similar slab material, it is still the same single 'Top Surface' part and must cover the full visible countertop without cropping. (2) For buffet tables and serving stations, group ALL top divider strips plus the matching front/side top metal edge lips, small vertical top side panels, side-return panels, outer end caps, and perimeter top trim into ONE 'Stainless Steel Trim & Edges' part if they share the same finish — even on long landscape buffet tables with many modules. Do NOT split identical dividers into multiple parts. (3) The thin top front/side metal lip and the small vertical top side panel / side-return panel must always be grouped with the divider strips when they visually belong to the same trim system. (4) The top side edge metal and the divider metal must stay in the same grouped part so the user can recolor them together. (5) Combine ALL wooden shelves FULLY (all faces — top, front edge, bottom, sides) into ONE 'Shelf Wood' part across the full width. (6) IMPORTANT — FRONT PANEL DECORATIVE SUB-PARTS APPLY TO LARGE BUFFET TABLES TOO: The plain wood/stone front fascia is 'Front Panel'. BUT if the front has DECORATIVE SUB-ELEMENTS with a DIFFERENT pattern, material, color, or finish (slatted screen, lattice, perforated panel, rattan/cane insert, contrasting wood inlay, marquetry, fluted/reeded section, painted accent panel, mirror panel, fabric/leather panel, distinct door/drawer faces, carved panel, geometric pattern panel), each MUST be returned as its OWN separate part (e.g. 'Front Decorative Screen', 'Front Inlay', 'Front Fluted Panel', 'Front Accent Panel', 'Front Carved Panel'). This applies whether the buffet table is small OR large/wide/landscape. If a long buffet table has the same decorative pattern repeated across multiple modules, group them as ONE part covering the full horizontal span. If there are TWO or more visibly different decorative finishes side-by-side, each is its own part. Do NOT merge them into 'Front Panel'. (7) Identify ALL other parts: frame/legs (full width), side panels, back panel, hardware, wheels, doors, drawers, decorative elements. Thin metal trims and the small top side panel are critical parts and must not be skipped. (8) If the broad top wood/stone/marble/granite/quartz and the surrounding side/divider trim are visibly different materials, they MUST be returned as different parts every time. Do NOT skip any visible furniture part or any decorative sub-part on the front, regardless of furniture size. Preserve the exact furniture shape and construction logic. Aim for 5-12 well-grouped parts. Return the JSON structure.";

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

function getNormalizedText(...values: unknown[]) {
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isMetalLikePart(text: string, materialText: string) {
  return hasAnyKeyword(`${text} ${materialText}`, [
    "metal",
    "stainless",
    "steel",
    "chrome",
    "silver",
    "gold",
    "brass",
    "bronze",
    "gunmetal",
    "powder coat",
  ]);
}

function canonicalizePartName(part: any, fallback: string) {
  const nameText = getNormalizedText(part?.name);
  const fullText = getNormalizedText(part?.name, part?.description);
  const materialText = getNormalizedText(part?.material, part?.currentColor);

  if (!fullText) return fallback;

  // PRIORITY 1: Check the part NAME first for exact canonical matches
  // This prevents descriptions from hijacking the classification
  // Decorative front sub-parts MUST stay separate from the plain "Front Panel"
  const isDecorativeFrontSubPart =
    hasAnyKeyword(fullText, [
      "decorative screen",
      "slatted",
      "lattice",
      "perforated",
      "rattan",
      "cane",
      "woven",
      "inlay",
      "marquetry",
      "veneer panel",
      "fluted",
      "reeded",
      "accent panel",
      "mirror panel",
      "fabric panel",
      "leather panel",
      "carved",
      "geometric pattern",
      "pattern panel",
      "door panel",
      "drawer panel",
      "door front",
      "drawer front",
    ]) ||
    hasAnyKeyword(nameText, ["screen", "inlay", "fluted", "accent", "decorative", "carved", "door", "drawer"]);

  if (
    hasAnyKeyword(nameText, ["front panel", "front fascia", "front apron", "front skirt"]) &&
    !isDecorativeFrontSubPart
  ) {
    return "Front Panel";
  }
  if (hasAnyKeyword(nameText, ["shelf"])) {
    return "Shelf Wood";
  }
  if (hasAnyKeyword(nameText, ["caster", "wheel"])) {
    return "Casters / Wheels";
  }
  if (hasAnyKeyword(nameText, ["side panel"])) {
    return "Side Panels";
  }
  if (hasAnyKeyword(nameText, ["back panel"])) {
    return "Back Panel";
  }
  if (hasAnyKeyword(nameText, ["door", "drawer"])) {
    return String(part?.name ?? "").trim() || fallback;
  }
  if (hasAnyKeyword(nameText, ["hardware", "handle", "knob", "hinge"])) {
    return "Hardware";
  }

  // PRIORITY 2: Metal trim detection (uses full text for thoroughness)
  // GUARD: Skip trim detection if name clearly indicates Top Surface — descriptions often mention "metal trim" as exclusion text
  const isTopSurfaceByName = hasAnyKeyword(nameText, ["top surface", "countertop", "counter top", "table top"]);
  if (
    !isTopSurfaceByName &&
    hasAnyKeyword(fullText, [
      "stainless steel trim",
      "trim edges",
      "trim and edges",
      "divider",
      "separator",
      "edge cap",
      "perimeter lip",
      "perimeter trim",
      "front lip",
      "side lip",
      "side return",
      "top side edge",
      "top edge",
      "outer end cap",
      "end cap",
      "fascia",
      "bezel",
      "top trim",
      "metal edge",
    ]) &&
    isMetalLikePart(fullText, materialText)
  ) {
    return TRIM_NAME;
  }

  // PRIORITY 3: Top surface (only if name suggests it, not just description)
  if (
    hasAnyKeyword(nameText, ["top surface", "countertop", "counter top", "table top"]) ||
    (nameText.includes("top") &&
      hasAnyKeyword(nameText, ["surface", "panel", "wood", "stone", "module"]) &&
      !isMetalLikePart(nameText, materialText))
  ) {
    return TOP_SURFACE_NAME;
  }

  // PRIORITY 4: Frame/legs (check name only to avoid catching casters/wheels by description)
  if (hasAnyKeyword(nameText, ["frame", "legs", "leg", "base frame", "support bar"])) {
    return "Frame / Legs";
  }

  // PRIORITY 5: Fallback — use original name
  return String(part?.name ?? "").trim() || fallback;
}

function getCanonicalId(partName: string, fallback: unknown) {
  if (partName === TOP_SURFACE_NAME) return "top_surface";
  if (partName === TRIM_NAME) return "stainless_steel_trim_edges";
  if (partName === "Front Panel") return "front_panel";
  if (partName === "Shelf Wood") return "shelf_wood";
  if (partName === "Frame / Legs") return "frame_legs";
  if (partName === "Casters / Wheels") return "casters_wheels";
  if (partName === "Side Panels") return "side_panels";
  if (partName === "Back Panel") return "back_panel";
  if (partName === "Hardware") return "hardware";

  const normalized = getNormalizedText(partName).replace(/\s+/g, "_");
  return normalized || String(fallback ?? "part");
}

function getCanonicalDescription(partName: string, fallback: string, hasTopSurface: boolean, hasTrim: boolean) {
  if (partName === TOP_SURFACE_NAME) {
    return hasTrim
      ? 'Only the broad, upper, horizontal wood or stone faces of the top assembly. This part stops exactly where the thin metal trim system begins, and it excludes every divider strip, front lip, side lip, perimeter edge cap, and every small vertical top side panel / side return / outer end cap that belongs to "Stainless Steel Trim & Edges".'
      : "Only the broad, upper, horizontal wood or stone faces of the top assembly, excluding any trim, lips, dividers, or side-return panels.";
  }

  if (partName === TRIM_NAME) {
    return hasTopSurface
      ? 'A distributed set of matching thin metal pieces: all divider strips between top modules, perimeter top trim, thin front and side lips directly below or wrapping the top, and every small vertical top side panel / side return / outer end cap. This grouped metal system stays separate from the broad horizontal top wood or stone faces of "Top Surface".'
      : "A distributed set of matching metal trim and edge components, including divider strips, perimeter edging, thin lips, and small side-return panels that share the same finish.";
  }

  return fallback;
}

function isValidLocation(location: any): location is { top: number; left: number; width: number; height: number } {
  return [location?.top, location?.left, location?.width, location?.height].every(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(1))));
}

function mergeLocations(a: any, b: any) {
  if (!isValidLocation(a)) return isValidLocation(b) ? b : undefined;
  if (!isValidLocation(b)) return a;

  const top = Math.min(a.top, b.top);
  const left = Math.min(a.left, b.left);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);

  return {
    top: clampPercent(top),
    left: clampPercent(left),
    width: clampPercent(right - left),
    height: clampPercent(bottom - top),
  };
}

const MERGEABLE_CANONICAL_PARTS = new Set([
  TOP_SURFACE_NAME,
  TRIM_NAME,
  "Front Panel",
  "Shelf Wood",
  "Frame / Legs",
  "Casters / Wheels",
  "Side Panels",
  "Back Panel",
  "Hardware",
]);

function normalizeParts(parts: any[]) {
  const canonicalNames = parts.map((part, index) =>
    canonicalizePartName(part, `Part ${index + 1}`)
  );

  const hasTopSurface = canonicalNames.includes(TOP_SURFACE_NAME);
  const hasTrim = canonicalNames.includes(TRIM_NAME);

  const canonicalizedParts = parts.map((part, index) => {
    const name = canonicalNames[index];
    const description = getCanonicalDescription(
      name,
      typeof part?.description === "string" ? part.description : "",
      hasTopSurface,
      hasTrim,
    );

    return {
      ...part,
      id: getCanonicalId(name, part?.id ?? `part_${index + 1}`),
      name,
      description,
      material:
        name === TOP_SURFACE_NAME
          ? "wood"
          : name === TRIM_NAME
            ? "stainless_steel"
            : typeof part?.material === "string"
              ? part.material
              : "other",
    };
  });

  return canonicalizedParts.reduce((acc: any[], part) => {
    if (!MERGEABLE_CANONICAL_PARTS.has(part.name)) {
      acc.push(part);
      return acc;
    }

    const existingIndex = acc.findIndex((existing) => existing.name === part.name);
    if (existingIndex === -1) {
      acc.push(part);
      return acc;
    }

    const existing = acc[existingIndex];
    acc[existingIndex] = {
      ...existing,
      id: getCanonicalId(existing.name, existing.id),
      description: getCanonicalDescription(existing.name, existing.description || part.description || "", hasTopSurface, hasTrim),
      currentColor: existing.currentColor || part.currentColor,
      location: mergeLocations(existing.location, part.location),
    };

    return acc;
  }, []);
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
        temperature: 0,
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
        max_tokens: 4000,
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

    const parts = normalizeParts(extractPartsFromContent(content));

    console.log("Normalized parts:", JSON.stringify(parts));

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
