import { describe, expect, it } from "vitest";
import { cpp } from "./cpp";
import { DESCRIPTIONS } from "./descriptions";
import { GLOSSARY } from "./glossary";
import { glossKey } from "./glossKey";
import { java } from "./java";
import { python } from "./python";

describe("syntax sheets", () => {
  for (const sheet of [python, java, cpp]) {
    it(`${sheet.lang}: every snippet has a description`, () => {
      const labels = [
        ...sheet.common,
        ...sheet.categories.flatMap((c) => c.items),
      ].map((i) => i.label);
      const missing = labels.filter((l) => !DESCRIPTIONS[sheet.lang][l]);
      expect(missing).toEqual([]);
    });
    it(`${sheet.lang}: glossary entries are complete`, () => {
      for (const [name, e] of Object.entries(GLOSSARY[sheet.lang])) {
        expect(e.sig.length, name).toBeGreaterThan(0);
        expect(e.desc.length, name).toBeGreaterThan(0);
        // Every entry says what goes in and what comes back (Details panel).
        expect(Array.isArray(e.params), `${name} params`).toBe(true);
        expect(e.returns?.type.length, `${name} returns`).toBeGreaterThan(0);
      }
    });
  }
});

describe("glossKey", () => {
  const g = { lower_bound: 1, ".lower_bound": 2, sort: 3 };
  it("prefers the member entry after a dot", () => {
    expect(glossKey(g, "lower_bound", ".", "(")).toBe(".lower_bound");
    expect(glossKey(g, "lower_bound", " ", "(")).toBe("lower_bound");
  });
  it("falls back to the plain entry and needs a call or member use", () => {
    expect(glossKey(g, "sort", ".", "(")).toBe("sort");
    expect(glossKey(g, "sort", " ", " ")).toBeUndefined();
    expect(glossKey(g, "missing", ".", "(")).toBeUndefined();
  });
});
