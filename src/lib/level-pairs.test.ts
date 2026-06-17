import { describe, expect, it } from "vitest";

import {
  getMissingLevelPairs,
  levelPairCount,
  levelPairs,
  selectBalancedLevel,
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

describe("getMissingLevelPairs", () => {
  it("returns every authored pair that does not already exist", () => {
    expect(
      getMissingLevelPairs(
        [{ nounA: "old", nounB: "young" }],
        [
          { nounA: "old", nounB: "young" },
          { nounA: "female", nounB: "male" },
          { nounA: "poor", nounB: "rich" }
        ]
      )
    ).toEqual([
      { nounA: "female", nounB: "male" },
      { nounA: "poor", nounB: "rich" }
    ]);
  });
});

describe("selectBalancedLevel", () => {
  const levels = [
    { id: "level-1", nounA: "old", nounB: "young", votesA: 12, votesB: 8 },
    { id: "level-2", nounA: "female", nounB: "male", votesA: 1, votesB: 1 },
    { id: "level-3", nounA: "poor", nounB: "rich", votesA: 0, votesB: 0 },
    { id: "level-4", nounA: "weak", nounB: "strong", votesA: 0, votesB: 0 },
    { id: "ignored", nounA: "branch", nounB: "comb", votesA: 0, votesB: 0 }
  ];

  it("returns a zero-vote authored level before higher-vote levels", () => {
    expect(selectBalancedLevel({ levels, random: () => 0 })?.id).toBe("level-3");
  });

  it("randomizes only among levels tied for the lowest vote count", () => {
    expect(selectBalancedLevel({ levels, random: () => 0.99 })?.id).toBe("level-4");
  });

  it("excludes seen levels even when they are under-voted", () => {
    expect(
      selectBalancedLevel({
        levels,
        seenLevelIds: ["level-3", "level-4"],
        random: () => 0
      })?.id
    ).toBe("level-2");
  });

  it("returns null after every authored level has been seen", () => {
    expect(
      selectBalancedLevel({
        levels,
        seenLevelIds: ["level-1", "level-2", "level-3", "level-4"]
      })
    ).toBeNull();
  });
});
