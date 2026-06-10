export type Side = "a" | "b";

export type LevelPublic = {
  id: string;
  nounA: string;
  nounB: string;
};

export type RevealedResult = {
  levelId: string;
  nounA: string;
  nounB: string;
  votesA: number;
  votesB: number;
  percentA: number;
  percentB: number;
  chosenSide: Side;
  chosenNoun: string;
  passed: boolean;
};

export function calculateVoteOutcome(input: {
  votesA: number;
  votesB: number;
  chosenSide: Side;
  nounA: string;
  nounB: string;
  levelId?: string;
}): RevealedResult {
  const votesA = input.chosenSide === "a" ? input.votesA + 1 : input.votesA;
  const votesB = input.chosenSide === "b" ? input.votesB + 1 : input.votesB;
  const total = votesA + votesB;
  const chosenVotes = input.chosenSide === "a" ? votesA : votesB;
  const otherVotes = input.chosenSide === "a" ? votesB : votesA;

  return {
    levelId: input.levelId ?? "",
    nounA: input.nounA,
    nounB: input.nounB,
    votesA,
    votesB,
    percentA: total === 0 ? 0 : (votesA / total) * 100,
    percentB: total === 0 ? 0 : (votesB / total) * 100,
    chosenSide: input.chosenSide,
    chosenNoun: input.chosenSide === "a" ? input.nounA : input.nounB,
    passed: chosenVotes < otherVotes
  };
}

export function roundPercent(value: number): number {
  return Math.round(value);
}

export function displayPercent(value: number): string {
  return `${roundPercent(value)}%`;
}

export function isSide(value: unknown): value is Side {
  return value === "a" || value === "b";
}
