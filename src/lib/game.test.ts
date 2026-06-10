import { describe, expect, it } from "vitest";

import { calculateVoteOutcome } from "./game";

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
