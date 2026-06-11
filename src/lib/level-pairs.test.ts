import { describe, expect, it } from "vitest";

import {
  levelPairCount,
  levelPairs,
  selectUncreatedLevelPair,
  validateLevelPairs
} from "./level-pairs";

describe("levelPairs", () => {
  it("contains exactly 100 valid authored pairs", () => {
    expect(levelPairCount).toBe(100);
    expect(levelPairs).toHaveLength(levelPairCount);
    expect(validateLevelPairs()).toEqual({ ok: true });
  });

  it("keeps the first and last authored pairs", () => {
    expect(levelPairs[0]).toEqual({ nounA: "old", nounB: "young" });
    expect(levelPairs[levelPairs.length - 1]).toEqual({
      nounA: "temporary",
      nounB: "permanent"
    });
  });

  it("rejects duplicate pair identities even when reversed", () => {
    expect(
      validateLevelPairs([
        ...levelPairs.slice(0, -1),
        { nounA: "young", nounB: "old" }
      ])
    ).toEqual({ ok: false, message: "Duplicate level pair: young / old." });
  });

  it("rejects invalid pair words", () => {
    expect(
      validateLevelPairs([
        ...levelPairs.slice(0, -1),
        { nounA: "two words", nounB: "valid" }
      ])
    ).toEqual({ ok: false, message: "Level pairs must contain lowercase single words." });
  });
});

describe("selectUncreatedLevelPair", () => {
  it("selects from pairs that have not been created yet", () => {
    const pair = selectUncreatedLevelPair({
      existingPairs: [{ nounA: "old", nounB: "young" }],
      pairs: [
        { nounA: "old", nounB: "young" },
        { nounA: "female", nounB: "male" },
        { nounA: "poor", nounB: "rich" }
      ],
      random: () => 0
    });

    expect(pair).toEqual({ nounA: "female", nounB: "male" });
  });

  it("treats reversed existing pairs as already created", () => {
    const pair = selectUncreatedLevelPair({
      existingPairs: [{ nounA: "young", nounB: "old" }],
      pairs: [
        { nounA: "old", nounB: "young" },
        { nounA: "female", nounB: "male" }
      ],
      random: () => 0
    });

    expect(pair).toEqual({ nounA: "female", nounB: "male" });
  });

  it("returns null when every authored pair already exists", () => {
    expect(
      selectUncreatedLevelPair({
        existingPairs: levelPairs
      })
    ).toBeNull();
  });
});
