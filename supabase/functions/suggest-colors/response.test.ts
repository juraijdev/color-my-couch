import { describe, test, expect } from "bun:test";
import { parseSuggestions } from "./response.ts";

const valid = { palette: "Warm wood and steel", rationale: "Matches the room.", suggestions: [
  { partId: "top", patternId: "wood", reason: "Warm surface" },
  { partId: "trim", patternId: "steel", reason: "Metal edge" },
] };
const parse = (raw: string) => parseSuggestions(raw, ["top", "trim"], ["wood", "steel"]);
describe("color suggestion validation", () => {
  test("accepts complete JSON and fenced JSON", () => {
    expect(parse(JSON.stringify(valid))).toEqual(valid);
    expect(parse("```json\n" + JSON.stringify(valid) + "\n```")).toEqual(valid);
  });
  test("rejects malformed or truncated JSON", () => {
    expect(() => parse('{"suggestions":[{"partId":"top"} {"partId":"trim"}]}')).toThrow();
    expect(() => parse(JSON.stringify(valid).slice(0, -8))).toThrow();
  });
  test("rejects missing, duplicated, and unknown parts and finishes", () => {
    for (const suggestions of [valid.suggestions.slice(0, 1), [valid.suggestions[0], valid.suggestions[0]],
      [valid.suggestions[0], { partId: "unknown", patternId: "steel", reason: "x" }],
      [valid.suggestions[0], { partId: "trim", patternId: "missing", reason: "x" }]]) {
      expect(() => parse(JSON.stringify({ ...valid, suggestions }))).toThrow();
    }
  });
});