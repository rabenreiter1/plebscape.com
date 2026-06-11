import { describe, expect, it } from "vitest";

import { nounBank, nounBankSize } from "./noun-bank";
import { selectUnusedNounPair, validateNounBank, validateNounPair } from "./nouns";

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

describe("nounBank", () => {
  it("contains exactly 2,000 valid unique nouns", () => {
    expect(nounBankSize).toBe(2000);
    expect(nounBank).toHaveLength(nounBankSize);
    expect(new Set(nounBank).size).toBe(nounBankSize);
    expect(validateNounBank()).toEqual({ ok: true });
  });

  it("does not include banned loaded words", () => {
    expect(nounBank).not.toContain("freedom");
    expect(nounBank).not.toContain("truth");
    expect(nounBank).not.toContain("war");
  });

  it("does not include synthetic or unsafe noun-bank leftovers", () => {
    expect(nounBank).not.toContain("branchcomb");
    expect(nounBank).not.toContain("flowercap");
    expect(nounBank).not.toContain("grainbench");
    expect(nounBank).not.toContain("clouddrum");
    expect(nounBank).not.toContain("blackjack");
    expect(nounBank).not.toContain("cassock");
    expect(nounBank).not.toContain("flintstone");
    expect(nounBank).not.toContain("machete");
    expect(nounBank).not.toContain("cudgel");
    expect(nounBank).not.toContain("flintlock");
  });
});

describe("selectUnusedNounPair", () => {
  it("selects two different unused nouns", () => {
    const pair = selectUnusedNounPair({
      bank: ["tree", "noise", "window"],
      usedNouns: ["tree"],
      random: () => 0
    });

    expect(pair).toEqual({ nounA: "noise", nounB: "window" });
  });

  it("returns null when fewer than two nouns remain", () => {
    expect(
      selectUnusedNounPair({
        bank: ["tree", "noise"],
        usedNouns: ["tree"],
        random: () => 0
      })
    ).toBeNull();
  });

  it("does not return a noun that was already used", () => {
    const usedNouns = nounBank.slice(0, nounBank.length - 2);
    const pair = selectUnusedNounPair({ usedNouns, random: () => 0 });

    expect(pair).toEqual({
      nounA: nounBank[nounBank.length - 2],
      nounB: nounBank[nounBank.length - 1]
    });
  });
});
