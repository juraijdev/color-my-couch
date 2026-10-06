export interface SuggestedPalette {
  palette: string;
  rationale: string;
  suggestions: Array<{ partId: string; patternId: string; reason: string }>;
}

export const suggestionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["palette", "rationale", "suggestions"],
  properties: {
    palette: { type: "string" },
    rationale: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["partId", "patternId", "reason"],
        properties: {
          partId: { type: "string" },
          patternId: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
};

export function parseSuggestions(raw: string, partIds: string[], patternIds: string[]): SuggestedPalette {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed.palette !== "string" || typeof parsed.rationale !== "string" || !Array.isArray(parsed.suggestions)) {
    throw new Error("Invalid suggestion format");
  }
  const parts = new Set(partIds);
  const patterns = new Set(patternIds);
  const seen = new Set<string>();
  for (const suggestion of parsed.suggestions) {
    if (!suggestion || !parts.has(suggestion.partId) || !patterns.has(suggestion.patternId) ||
      seen.has(suggestion.partId) || typeof suggestion.reason !== "string") {
      throw new Error("Invalid part or finish in suggestions");
    }
    seen.add(suggestion.partId);
  }
  if (seen.size !== parts.size) throw new Error("Missing furniture part suggestions");
  return parsed;
}