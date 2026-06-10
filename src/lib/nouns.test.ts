import { describe, expect, it } from "vitest";

import { validateNounPair } from "./nouns";

describe("validateNounPair", () => {
  it("accepts clean arbitrary nouns", () => {
    expect(validateNounPair({ nounA: "window", nounB: "copper" })).toEqual({
      nounA: "window",
      nounB: "copper"
    });
  });

  it("normalizes whitespace and case", () => {
    expect(validateNounPair({ nounA: " Moon ", nounB: "Paper" })).toEqual({
      nounA: "moon",
      nounB: "paper"
    });
  });

  it("rejects duplicate nouns", () => {
    expect(() => validateNounPair({ nounA: "tree", nounB: "tree" })).toThrow(/duplicates/);
  });

  it("rejects multi-word or punctuated output", () => {
    expect(() => validateNounPair({ nounA: "glass door", nounB: "tunnel" })).toThrow(
      /single words/
    );
    expect(() => validateNounPair({ nounA: "glass!", nounB: "tunnel" })).toThrow(/single words/);
  });

  it("rejects loaded words", () => {
    expect(() => validateNounPair({ nounA: "freedom", nounB: "noise" })).toThrow(/loaded/);
  });
});
