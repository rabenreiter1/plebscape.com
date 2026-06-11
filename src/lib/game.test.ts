import { describe, expect, it } from "vitest";

import { calculateRunScore, calculateVoteOutcome, getChosenPercentage } from "./game";

describe("calculateVoteOutcome", () => {
  it("fails a new level because the chosen noun becomes 100%", () => {
    const result = calculateVoteOutcome({
      nounA: "ladder",
      nounB: "fog",
      votesA: 0,
      votesB: 0,
      chosenSide: "a"
    });

    expect(result.passed).toBe(false);
    expect(result.percentA).toBe(100);
    expect(result.percentB).toBe(0);
  });

  it("fails a tie because the chosen noun becomes the majority", () => {
    const result = calculateVoteOutcome({
      nounA: "tree",
      nounB: "noise",
      votesA: 1,
      votesB: 1,
      chosenSide: "b"
    });

    expect(result.passed).toBe(false);
    expect(result.votesB).toBe(2);
  });

  it("fails a one-vote difference because choosing the minority creates 50/50", () => {
    const result = calculateVoteOutcome({
      nounA: "tree",
      nounB: "noise",
      votesA: 2,
      votesB: 1,
      chosenSide: "b"
    });

    expect(result.passed).toBe(false);
    expect(result.percentA).toBe(50);
    expect(result.percentB).toBe(50);
  });

  it("passes when the chosen noun remains a strict minority after the vote", () => {
    const result = calculateVoteOutcome({
      nounA: "tree",
      nounB: "noise",
      votesA: 3,
      votesB: 1,
      chosenSide: "b"
    });

    expect(result.passed).toBe(true);
    expect(result.votesA).toBe(3);
    expect(result.votesB).toBe(2);
  });

  it("fails when choosing the mass", () => {
    const result = calculateVoteOutcome({
      nounA: "tree",
      nounB: "noise",
      votesA: 10,
      votesB: 8,
      chosenSide: "a"
    });

    expect(result.passed).toBe(false);
    expect(result.votesA).toBe(11);
  });
});

describe("getChosenPercentage", () => {
  it("returns the exact final percentage for the chosen side", () => {
    expect(
      getChosenPercentage({
        chosenNoun: "ladder",
        chosenSide: "a",
        levelId: "level-a",
        nounA: "ladder",
        nounB: "fog",
        passed: false,
        percentA: 65.25,
        percentB: 34.75,
        votesA: 15,
        votesB: 8
      })
    ).toBe(65.25);

    expect(
      getChosenPercentage({
        chosenNoun: "fog",
        chosenSide: "b",
        levelId: "level-b",
        nounA: "ladder",
        nounB: "fog",
        passed: true,
        percentA: 78.4,
        percentB: 21.6,
        votesA: 40,
        votesB: 11
      })
    ).toBe(21.6);
  });
});

describe("calculateRunScore", () => {
  it("calculates the documented example with exact internals and rounded display values", () => {
    const score = calculateRunScore({
      failedLevel: 3,
      chosenPercentages: [21, 32, 65]
    });

    expect(score.averageChosenPercentage).toBeCloseTo(39.3333333333);
    expect(score.scoreExact).toBeCloseTo(260.6666666667);
    expect(score.scoreDisplay).toBe(261);
    expect(score.averageChoiceDisplay).toBe("39%");
  });

  it("scores a level one failure", () => {
    const score = calculateRunScore({
      failedLevel: 1,
      chosenPercentages: [100]
    });

    expect(score.averageChosenPercentage).toBe(100);
    expect(score.scoreExact).toBe(0);
    expect(score.scoreDisplay).toBe(0);
    expect(score.averageChoiceDisplay).toBe("100%");
  });

  it("preserves level priority over any realistic minority bonus", () => {
    const lowerLevelBestRealisticRun = calculateRunScore({
      failedLevel: 3,
      chosenPercentages: [0.0001, 0.0001, 0.0001]
    });
    const higherLevelWorstRun = calculateRunScore({
      failedLevel: 4,
      chosenPercentages: [100, 100, 100, 100]
    });

    expect(higherLevelWorstRun.scoreExact).toBeGreaterThan(lowerLevelBestRealisticRun.scoreExact);
  });

  it("rejects empty runs", () => {
    expect(() => calculateRunScore({ failedLevel: 1, chosenPercentages: [] })).toThrow(
      "Cannot calculate a run score without answered levels."
    );
  });
});
